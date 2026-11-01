import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Firestore } from "@google-cloud/firestore";
import { MongoClient, Db } from "mongodb";
import { DEFAULT_CLASS10_SYLLABUS } from "./src/data/class10Syllabus";

dotenv.config();

const app = express();
const PORT = 3000;
const STORE_PATH = path.join(process.cwd(), "study-store.json");

app.use(express.json({ limit: "50mb" }));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Initialize Gemini SDK with telemetry header
const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. AI features will be unavailable.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Robust helper to execute Gemini API calls with graceful fallback & retries for model unavailability
const callGeminiWithFallback = async (
  ai: GoogleGenAI,
  params: any
) => {
  const primaryModel = params.model || "gemini-3.5-flash";
  const fallbacks = [
    primaryModel,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  const modelsToTry = Array.from(new Set(fallbacks));
  let lastError: any = null;

  for (const model of modelsToTry) {
    // Attempt with retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini SDK] Model: ${model} (Attempt ${attempt}/2)`);
        const response = await ai.models.generateContent({
          ...params,
          model: model
        });
        console.log(`[Gemini SDK] Successful response with model: ${model}`);
        return response;
      } catch (error: any) {
        console.error(`[Gemini SDK] Model ${model} Attempt ${attempt} failed:`, error.message || error);
        lastError = error;
        
        // Wait a short time before retrying the same model (e.g. 1000ms)
        if (attempt === 1) {
          console.log("[Gemini SDK] Waiting 1 second before retry...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  throw lastError;
};

// Helper to strip markdown formatting and parse JSON safely
const parseGeminiJson = (text: string): any => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  return JSON.parse(cleaned);
};

// Initial default database structure (clean slate, no dummy data)
const defaultStore = {
  todos: [],
  syllabus: [],
  pomodoros: [],
  studyGroups: [],
  countdowns: [],
  planner: {
    date: "",
    basicTasks: "",
    schedule: [],
    aiAdvice: ""
  },
  accounts: [],
  globalMessages: [],
  groupMessages: {},
  announcements: [],
  sharedStreams: [],
  liveRooms: []
};

// MongoDB & Cloud Database references
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://kanta123090_db_user:abc%40123%23A@cluster0.gleph2w.mongodb.net/";
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnecting = false;

// Default public resources and announcements available without login
const DEFAULT_PUBLIC_RESOURCES = [
  {
    id: "pub_res_cbse_sqp",
    title: "CBSE Class 10 Official Sample Question Papers & Marking Scheme 2025-26",
    category: "CBSE Official",
    description: "Official CBSE Board examination SQPs for Mathematics (Standard & Basic), Science, Social Science, English Language & Literature, and Hindi Course A with authentic step-by-step marking schemes.",
    url: "https://cbseacademic.nic.in/SQP_CLASSX_2024-25.html",
    actionButtonLabel: "View Official CBSE SQPs",
    actionButtonUrl: "https://cbseacademic.nic.in/SQP_CLASSX_2024-25.html",
    htmlSnippet: `<div class="p-4 rounded-xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 text-white">
  <div class="flex items-center gap-2 mb-2">
    <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">OFFICIAL CBSE</span>
    <span class="text-xs text-blue-200">5 Core Subjects Available</span>
  </div>
  <p class="text-sm font-semibold mb-3">Target 95%+ by analyzing real CBSE marking schemes with step allocation (1 mark for formula, 2 marks for substitution, 1 mark for unit!)</p>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
    <div class="bg-black/30 p-2 rounded">📐 Maths Std: 80M</div>
    <div class="bg-black/30 p-2 rounded">🧪 Science: 80M</div>
    <div class="bg-black/30 p-2 rounded">🌍 SST: 80M</div>
    <div class="bg-black/30 p-2 rounded">📖 English: 80M</div>
  </div>
</div>`,
    authorName: "CBSE Academic Hub",
    createdAt: new Date().toISOString(),
    likes: 48,
    tags: ["CBSE", "Class 10", "SQP", "Marking Scheme"]
  },
  {
    id: "pub_res_math_formulas",
    title: "Class 10 Mathematics Complete Formula & Identity Handbook",
    category: "Maths Formulas",
    description: "Every formula from Real Numbers (HCF×LCM=a×b), Quadratic Formula (x=(-b±√(b²-4ac))/2a), AP (aₙ=a+(n-1)d, Sₙ=n/2[2a+(n-1)d]), Trigonometric identities (sin²θ+cos²θ=1), to Surface Areas & Volumes.",
    url: "https://ncert.nic.in/textbook.php?jemh1=0-14",
    actionButtonLabel: "Open NCERT Math Textbooks",
    actionButtonUrl: "https://ncert.nic.in/textbook.php?jemh1=0-14",
    htmlSnippet: `<div class="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 text-slate-100">
  <h4 class="text-emerald-400 font-bold mb-2 flex items-center gap-2">
    <span>⚡ Quick Formula Recall Widget</span>
  </h4>
  <div class="space-y-1.5 text-xs">
    <div class="p-1.5 bg-slate-800/80 rounded flex justify-between"><span class="text-slate-400">Quadratic Roots:</span> <code class="text-emerald-300 font-mono">x = (-b ± √(b² - 4ac)) / (2a)</code></div>
    <div class="p-1.5 bg-slate-800/80 rounded flex justify-between"><span class="text-slate-400">AP nth term:</span> <code class="text-emerald-300 font-mono">aₙ = a + (n - 1)d</code></div>
    <div class="p-1.5 bg-slate-800/80 rounded flex justify-between"><span class="text-slate-400">Trig Identity:</span> <code class="text-emerald-300 font-mono">sin²θ + cos²θ = 1, 1 + tan²θ = sec²θ</code></div>
    <div class="p-1.5 bg-slate-800/80 rounded flex justify-between"><span class="text-slate-400">Sphere Volume:</span> <code class="text-emerald-300 font-mono">V = 4/3 πr³, CSA = 4πr²</code></div>
  </div>
</div>`,
    authorName: "Prof. R.K. Sharma",
    createdAt: new Date().toISOString(),
    likes: 56,
    tags: ["Maths", "Formulas", "Algebra", "Trigonometry"]
  },
  {
    id: "pub_res_sci_reactions",
    title: "Science Essential Chemical Reactions & Color Changes Cheat Sheet",
    category: "Science Notes",
    description: "Quick revision of all key observations: Lead Nitrate decomposition (brown NO₂ gas), Electrolysis of water (2:1 H₂:O₂ volume), Iron in CuSO₄ (blue to light green), and Ferrous Sulphate heating.",
    url: "https://ncert.nic.in/textbook.php?jesc1=0-13",
    actionButtonLabel: "Download Science NCERT",
    actionButtonUrl: "https://ncert.nic.in/textbook.php?jesc1=0-13",
    htmlSnippet: `<div class="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-100">
  <div class="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">Crucial Chemical Reactions for Board 2026</div>
  <ul class="text-xs space-y-1.5 list-disc list-inside text-slate-300">
    <li><strong class="text-white">2Pb(NO₃)₂ → 2PbO + 4NO₂↑ + O₂↑</strong>: Brown fumes of nitrogen dioxide.</li>
    <li><strong class="text-white">Fe + CuSO₄ → FeSO₄ + Cu</strong>: Solution turns from blue to dirty pale green.</li>
    <li><strong class="text-white">CaO + H₂O → Ca(OH)₂ + Heat</strong>: Vigorous slaking with hissing sound.</li>
  </ul>
</div>`,
    authorName: "Science Mentor Team",
    createdAt: new Date().toISOString(),
    likes: 62,
    tags: ["Science", "Chemistry", "Reactions"]
  },
  {
    id: "pub_res_calculator_widget",
    title: "Interactive Class 10 Quadratic Equation & Discriminant Calculator Widget",
    category: "Interactive Widget",
    description: "A live standalone calculator widget to test whether roots are Real & Distinct (D > 0), Real & Equal (D = 0), or No Real Roots (D < 0).",
    actionButtonLabel: "Open Fullscreen Widget",
    actionButtonUrl: "#",
    htmlSnippet: `<div class="p-4 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 text-white">
  <h3 class="text-sm font-bold text-indigo-300 mb-2">🧮 Live Discriminant & Nature of Roots Tester</h3>
  <p class="text-xs text-slate-300 mb-3">Formula: ax² + bx + c = 0 → D = b² - 4ac</p>
  <div class="flex items-center gap-2 mb-3 text-xs">
    <input id="q_a" type="number" value="1" placeholder="a" class="w-14 px-2 py-1 bg-slate-800 rounded border border-slate-700 text-white text-center font-mono" />
    <span>x² +</span>
    <input id="q_b" type="number" value="-5" placeholder="b" class="w-14 px-2 py-1 bg-slate-800 rounded border border-slate-700 text-white text-center font-mono" />
    <span>x +</span>
    <input id="q_c" type="number" value="6" placeholder="c" class="w-14 px-2 py-1 bg-slate-800 rounded border border-slate-700 text-white text-center font-mono" />
    <span>= 0</span>
    <button onclick="
      var a = parseFloat(document.getElementById('q_a').value)||1;
      var b = parseFloat(document.getElementById('q_b').value)||0;
      var c = parseFloat(document.getElementById('q_c').value)||0;
      var d = b*b - 4*a*c;
      var text = 'D = ' + d + '. ';
      if (d > 0) text += 'Real and Distinct Roots (x1 = ' + ((-b+Math.sqrt(d))/(2*a)).toFixed(2) + ', x2 = ' + ((-b-Math.sqrt(d))/(2*a)).toFixed(2) + ')';
      else if (d === 0) text += 'Real and Equal Roots (x = ' + (-b/(2*a)).toFixed(2) + ')';
      else text += 'No Real Roots (Complex)';
      document.getElementById('q_res').innerText = text;
    " class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold text-white transition cursor-pointer">Solve</button>
  </div>
  <div id="q_res" class="p-2 bg-black/40 rounded text-xs font-mono text-emerald-400">Result will show here (Click Solve!)</div>
</div>`,
    authorName: "Interactive EduLab",
    createdAt: new Date().toISOString(),
    likes: 83,
    tags: ["Interactive", "Calculator", "Maths", "Widget"]
  }
];

// Initialize MongoDB connection safely with graceful fallback
const initializeMongo = async () => {
  if (mongoDb || isMongoConnecting) return;
  isMongoConnecting = true;
  try {
    console.log("[MongoDB] Connecting to MongoDB Atlas cluster0...");
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db("study_hub_cbse10");
    console.log("[MongoDB] Successfully connected to MongoDB Atlas database!");

    // Fetch initial store from MongoDB root_store
    const col = mongoDb.collection("app_store");
    const doc = await col.findOne({ _id: "root_store" as any });
    if (doc) {
      const { _id, ...storeData } = doc;
      memoryStore = { ...getStore(), ...storeData };
      console.log("[MongoDB] Persistent state successfully restored from MongoDB Atlas.");
      try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), "utf-8");
      } catch (e) {}
    } else {
      console.log("[MongoDB] Root store not found in MongoDB, seeding current store...");
      const current = getStore();
      await col.updateOne({ _id: "root_store" as any }, { $set: current }, { upsert: true });
    }

    // Seed public resources if collection is empty
    const resCol = mongoDb.collection("public_resources");
    const count = await resCol.countDocuments();
    if (count === 0) {
      await resCol.insertMany(DEFAULT_PUBLIC_RESOURCES as any);
      console.log("[MongoDB] Seeded default public resources.");
    }
  } catch (err: any) {
    console.warn("[MongoDB] Connection notice (resilient local & Firestore fallback active):", err.message);
  } finally {
    isMongoConnecting = false;
  }
};

// Firestore SDK references
let db: Firestore | null = null;
let docRef: any = null;
let memoryStore: any = null;

let firebaseConfig: any = null;
try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  }
} catch (e) {
  // safe fallback
}

const initializeFirestore = () => {
  if (db) return;
  try {
    if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId) {
      db = new Firestore({
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId,
      });
      console.log(`[Firestore] Initialized Firestore with Project ID: ${firebaseConfig.projectId}, Database ID: ${firebaseConfig.firestoreDatabaseId}`);
    } else {
      db = new Firestore();
    }
    docRef = db.collection("app").doc("store");
  } catch (err: any) {
    console.warn("[Firestore] Lazy initialization notice:", err.message);
  }
};

// Keys that are strictly private and personal to each student
const USER_SPECIFIC_KEYS = [
  "todos",
  "syllabus",
  "class10Syllabus",
  "homework",
  "backlogs",
  "planner",
  "masterPlan",
  "pomodoros",
  "countdowns",
  "copilotMessages",
  "activeChatHistory"
];

const createDefaultUserData = () => ({
  todos: [],
  class10Syllabus: JSON.parse(JSON.stringify(DEFAULT_CLASS10_SYLLABUS)),
  syllabus: [],
  homework: [],
  backlogs: [],
  planner: {
    date: new Date().toISOString().split("T")[0],
    basicTasks: "",
    schedule: [],
    aiAdvice: ""
  },
  masterPlan: null,
  pomodoros: [],
  copilotMessages: [
    {
      id: "welcome-copilot-msg",
      sender: "gemini@copilot.ai",
      senderFullName: "Gemini 1-on-1 Study Copilot",
      senderAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gemini",
      text: "Namaste! I am your private, 1-on-1 AI Study Copilot for CBSE Class 10. Your chats here are strictly private to your account and never shared with other students. Ask me anything about Mathematics, Science, SST, English, or Hindi Course A, or ask me to schedule your day and manipulate your tasks!",
      timestamp: new Date().toISOString()
    }
  ],
  countdowns: [
    {
      id: "cbse-boards-2027",
      title: "CBSE Class 10 Board Examinations",
      examDate: "2027-02-15T09:00",
      subject: "All 5 Subjects"
    }
  ]
});

// Help load store safely
const getStore = (): any => {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const data = JSON.parse(raw);
      let migrated = false;
      if (!data.accounts) { data.accounts = []; migrated = true; }
      if (!data.globalMessages) { data.globalMessages = []; migrated = true; }
      if (!data.groupMessages) { data.groupMessages = {}; migrated = true; }
      if (!data.announcements) { data.announcements = []; migrated = true; }
      if (!data.publicResources) { data.publicResources = DEFAULT_PUBLIC_RESOURCES; migrated = true; }
      if (!data.sharedStreams) { data.sharedStreams = []; migrated = true; }
      if (!data.liveRooms) { data.liveRooms = []; migrated = true; }
      if (!data.questionBank) { data.questionBank = []; migrated = true; }
      if (!data.practiceSheets) { data.practiceSheets = []; migrated = true; }
      if (!data.userStores) { data.userStores = {}; migrated = true; }
      
      memoryStore = data;
      if (migrated) {
        saveStore(data);
      }
      return data;
    }
  } catch (err) {
    console.error("Error loading local store, using default", err);
  }

  // Write default store
  const storeWithDefaults = {
    ...defaultStore,
    accounts: [],
    globalMessages: [],
    groupMessages: {},
    announcements: [],
    publicResources: DEFAULT_PUBLIC_RESOURCES,
    sharedStreams: [],
    liveRooms: [],
    questionBank: [],
    practiceSheets: [],
    userStores: {}
  };
  memoryStore = storeWithDefaults;
  saveStore(storeWithDefaults);
  return storeWithDefaults;
};

// Help save store safely
const saveStore = (data: any) => {
  memoryStore = data;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving store locally", err);
  }

  // MongoDB async save
  if (mongoDb) {
    mongoDb.collection("app_store").updateOne(
      { _id: "root_store" as any },
      { $set: data },
      { upsert: true }
    ).catch(err => {
      console.warn("[MongoDB] Async save notice:", err.message);
    });
  }

  try {
    initializeFirestore();
    if (docRef) {
      docRef.set(data).catch((err: any) => {
        console.warn("[Firestore] Notice on writing store to cloud Firestore:", err.message);
      });
    }
  } catch (err: any) {
    console.warn("[Firestore] Notice on triggering async save to Firestore:", err.message);
  }
};


// Extract active user key from query, headers, or body
const getUserKey = (req: express.Request): string => {
  const queryUser = req.query.user as string;
  const headerUser = req.headers["x-user-id"] as string;
  const bodyUser = (req.body && req.body.activeUser) || (req.body && req.body.username);
  const raw = queryUser || headerUser || bodyUser || "default_student";
  return raw.toLowerCase().trim().replace(/[^a-z0-9_\-\.@]/g, "_");
};

// Scoped store for an individual student
const getScopedStoreForUser = (userKey: string) => {
  const root = getStore();
  if (!root.userStores) {
    root.userStores = {};
  }
  if (!root.userStores[userKey]) {
    root.userStores[userKey] = createDefaultUserData();
    saveStore(root);
  }

  const userPersonal = root.userStores[userKey];
  if (!userPersonal.class10Syllabus || !userPersonal.class10Syllabus.length) {
    userPersonal.class10Syllabus = JSON.parse(JSON.stringify(DEFAULT_CLASS10_SYLLABUS));
  }
  if (!userPersonal.homework) userPersonal.homework = [];
  if (!userPersonal.backlogs) userPersonal.backlogs = [];
  if (!userPersonal.todos) userPersonal.todos = [];

  return {
    ...root,
    // Overlay user-isolated data
    todos: userPersonal.todos,
    class10Syllabus: userPersonal.class10Syllabus,
    syllabus: userPersonal.syllabus || [],
    homework: userPersonal.homework,
    backlogs: userPersonal.backlogs,
    planner: userPersonal.planner || { date: "", basicTasks: "", schedule: [], aiAdvice: "" },
    masterPlan: userPersonal.masterPlan || null,
    pomodoros: userPersonal.pomodoros || [],
    countdowns: userPersonal.countdowns || [],
    copilotMessages: userPersonal.copilotMessages || [],
    activeUser: userKey
  };
};


// Bootstrapping cloud store asynchronously at startup
const loadCloudStoreAtStartup = async () => {
  try {
    initializeFirestore();
    if (docRef) {
      console.log("[Firestore] Fetching cloud store on startup...");
      const doc = await docRef.get();
      if (doc.exists) {
        memoryStore = doc.data();
        console.log("[Firestore] Successfully restored persistent state from cloud Firestore.");
        fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), "utf-8");
      } else {
        console.log("[Firestore] Cloud store is empty. Seeding with default data...");
        const store = getStore();
        await docRef.set(store);
      }
    }
  } catch (err: any) {
    console.warn("[Firestore] Startup cloud retrieval notice, using local file store:", err.message);
  }
};

interface ClientConnection {
  ws: WebSocket;
  username?: string;
  fullName?: string;
  channel?: string; // "global" or groupId
}

const clients = new Set<ClientConnection>();

const broadcastToChannel = (channel: string, payload: any, excludeWs?: WebSocket) => {
  const json = JSON.stringify(payload);
  clients.forEach(client => {
    if (client.channel === channel && client.ws !== excludeWs && client.ws.readyState === 1) { // WebSocket.OPEN is 1
      try {
        client.ws.send(json);
      } catch (err) {
        console.error("WS send error:", err);
      }
    }
  });
};

// --- API ENDPOINTS ---

// GET user-scoped store
app.get("/api/store", (req, res) => {
  const userKey = getUserKey(req);
  res.json(getScopedStoreForUser(userKey));
});

// POST store updates (saves personal fields to active user's silo, and global fields globally)
app.post("/api/store", (req, res) => {
  const userKey = getUserKey(req);
  const root = getStore();
  if (!root.userStores) root.userStores = {};
  if (!root.userStores[userKey]) {
    root.userStores[userKey] = createDefaultUserData();
  }

  const body = req.body || {};
  const userPersonal = root.userStores[userKey];

  // 1. Separate user-specific updates
  for (const key of USER_SPECIFIC_KEYS) {
    if (body[key] !== undefined) {
      userPersonal[key] = body[key];
    }
  }

  // 2. Global updates (shared announcements, globalMessages, questionBank, practiceSheets, etc.)
  for (const key of Object.keys(body)) {
    if (!USER_SPECIFIC_KEYS.includes(key) && key !== "activeUser" && key !== "username") {
      root[key] = body[key];
    }
  }

  saveStore(root);
  res.json({ success: true, store: getScopedStoreForUser(userKey) });
});

// POST reset current user's personal store
app.post("/api/store/reset", (req, res) => {
  const userKey = getUserKey(req);
  const root = getStore();
  if (!root.userStores) root.userStores = {};
  root.userStores[userKey] = createDefaultUserData();
  saveStore(root);
  res.json({ success: true, store: getScopedStoreForUser(userKey) });
});

// --- AUTHENTICATION & MULTI-USER ENDPOINTS ---

// GET Google Auth URL
app.get("/api/auth/google/url", (req, res) => {
  const client_id = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!client_id) {
    return res.status(400).json({ error: "Google OAuth is not configured. Please set CLIENT_ID in your environment variables." });
  }
  
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/auth/callback`;

  const params = new URLSearchParams({
    client_id: client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account"
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// GET /auth/callback (Google OAuth redirection callback)
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: '${error}' }, '*');
              window.close();
            } else {
              window.location.href = '/?error=${error}';
            }
          </script>
          <p>Authentication failed: ${error}</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  const client_id = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  
  if (!client_id || !client_secret) {
    return res.status(500).send("Google OAuth is not fully configured on the server (missing CLIENT_ID or CLIENT_SECRET).");
  }

  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/auth/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const tokenErr = await tokenResponse.text();
      console.error("Token exchange failed:", tokenErr);
      throw new Error(`Token exchange failed: ${tokenErr}`);
    }

    const tokens = await tokenResponse.json() as any;
    const accessToken = tokens.access_token;

    if (!accessToken) {
      throw new Error("No access token returned from Google");
    }

    // Retrieve user profile information using access token
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoResponse.ok) {
      const userinfoErr = await userinfoResponse.text();
      console.error("Failed to get user info:", userinfoErr);
      throw new Error("Failed to retrieve user profile");
    }

    const googleUser = await userinfoResponse.json() as any;
    const email = googleUser.email;
    const name = googleUser.name;
    const picture = googleUser.picture;

    if (!email) {
      throw new Error("Google account email is missing");
    }

    // Find or create user in our store
    const store = getStore();
    const lowerEmail = email.toLowerCase().trim();
    let account = store.accounts.find(
      (acc: any) => acc.username.toLowerCase() === lowerEmail
    );

    if (!account) {
      // Create a new user with Google details
      account = {
        username: lowerEmail,
        password: "google_oauth_auth_user_" + Math.random().toString(36).substring(2, 10), // strong dummy password
        fullName: name || email.split("@")[0],
        bio: "Google Study peer",
        avatarUrl: picture || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name || email)}`,
        theme: "dark",
        status: "online",
        createdAt: new Date().toISOString(),
        isGoogleUser: true
      };
      store.accounts.push(account);
    } else {
      account.status = "online";
      if (picture && !account.avatarUrl.includes("dicebear.com")) {
        account.avatarUrl = picture; // update with google picture if available
      }
    }

    saveStore(store);

    const { password: _, ...safeAccount } = account;

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(safeAccount)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful! This window will close automatically.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Google OAuth error details:", err);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: '${err.message || "Unknown error"}' }, '*');
              window.close();
            } else {
              window.location.href = '/?error=${encodeURIComponent(err.message || "OAuth failed")}';
            }
          </script>
          <p>Authentication failed: ${err.message || "Unknown error"}</p>
        </body>
      </html>
    `);
  }
});

// POST User Registration
app.post("/api/auth/register", (req, res) => {
  const { username, password, fullName, bio, avatarUrl } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "Username, password, and full name are required." });
  }

  const store = getStore();
  const lowerUsername = username.toLowerCase().trim();
  
  if (store.accounts.some((acc: any) => acc.username.toLowerCase() === lowerUsername)) {
    return res.status(400).json({ error: "Username already exists." });
  }

  const newAccount = {
    username: lowerUsername,
    password, // simple plain-text check for preview sandbox
    fullName,
    bio: bio || "New study enthusiast!",
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(fullName)}`,
    theme: "dark" as "light" | "dark",
    status: "online",
    createdAt: new Date().toISOString()
  };

  store.accounts.push(newAccount);
  saveStore(store);

  // Return account with sensitive password omitted
  const { password: _, ...safeAccount } = newAccount;
  res.json({ success: true, user: safeAccount, store });
});

// POST User Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const store = getStore();
  const lowerUsername = username.toLowerCase().trim();

  const account = store.accounts.find(
    (acc: any) => acc.username.toLowerCase() === lowerUsername && acc.password === password
  );

  if (!account) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  // Update status to online
  account.status = "online";
  saveStore(store);

  const { password: _, ...safeAccount } = account;
  res.json({ success: true, user: safeAccount, store });
});

// POST User Logout
app.post("/api/auth/logout", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  const store = getStore();
  const account = store.accounts.find((acc: any) => acc.username.toLowerCase() === username.toLowerCase().trim());
  if (account) {
    account.status = "offline";
    saveStore(store);
  }
  res.json({ success: true });
});

// POST Profile Update
app.post("/api/auth/profile", (req, res) => {
  const { username, fullName, bio, avatarUrl, theme } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  const store = getStore();
  const account = store.accounts.find((acc: any) => acc.username.toLowerCase() === username.toLowerCase().trim());

  if (!account) {
    return res.status(404).json({ error: "User account not found." });
  }

  if (fullName) account.fullName = fullName;
  if (typeof bio === "string") account.bio = bio;
  if (avatarUrl) account.avatarUrl = avatarUrl;
  if (theme === "light" || theme === "dark") account.theme = theme;

  saveStore(store);

  const { password: _, ...safeAccount } = account;
  res.json({ success: true, user: safeAccount, store });
});

// POST Change Password
app.post("/api/auth/change-password", (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: "Username and new password are required." });
  }

  const store = getStore();
  const lowerUsername = username.toLowerCase().trim();
  const account = store.accounts.find((acc: any) => acc.username.toLowerCase() === lowerUsername);

  if (!account) {
    return res.status(404).json({ error: "User account not found." });
  }

  // Google OAuth users might not have a password yet. Let them set it directly.
  if (account.password && account.password !== oldPassword && !account.isGoogleUser) {
    return res.status(400).json({ error: "Incorrect current password." });
  }

  account.password = newPassword;
  if (account.isGoogleUser) {
    account.isGoogleUser = false; // Now has local password setup
  }
  saveStore(store);

  res.json({ success: true, message: "Password updated successfully." });
});

// --- ANNOUNCEMENTS & HTML SNIPPETS ENDPOINTS ---

// GET Announcements
app.get("/api/announcements", (req, res) => {
  const store = getStore();
  res.json({ success: true, announcements: store.announcements || [] });
});

// POST Add Announcement
app.post("/api/announcements", (req, res) => {
  const { author, title, htmlContent } = req.body;
  if (!author || !title || !htmlContent) {
    return res.status(400).json({ error: "Author, title, and htmlContent are required." });
  }

  const store = getStore();
  const newAnnouncement = {
    id: "ann_" + Date.now(),
    author,
    title,
    htmlContent,
    createdAt: new Date().toISOString()
  };

  if (!store.announcements) store.announcements = [];
  store.announcements.push(newAnnouncement);
  saveStore(store);

  res.json({ success: true, announcement: newAnnouncement, store });
});

// GET Active / Registered Users list
app.get("/api/auth/users", (req, res) => {
  const store = getStore();
  const safeUsers = store.accounts.map(({ password, ...rest }: any) => rest);
  res.json({ success: true, users: safeUsers });
});


// --- CHATROOM MESSAGE ENDPOINTS ---

// GET Chat messages (both global, private copilot, and group channels)
app.get("/api/chat/messages", (req, res) => {
  const store = getStore();
  const userKey = getUserKey(req);
  const channel = (req.query.channel as string) || "private_copilot";
  
  let messages = [];
  if (channel === "private_copilot" || channel === "copilot") {
    // Strictly private to active student account
    if (!store.userStores) store.userStores = {};
    if (!store.userStores[userKey]) store.userStores[userKey] = createDefaultUserData();
    messages = store.userStores[userKey].copilotMessages || [];
  } else if (channel === "global") {
    messages = store.globalMessages || [];
  } else {
    messages = (store.groupMessages && store.groupMessages[channel]) || [];
  }

  res.json({
    success: true,
    channel,
    messages,
    globalMessages: store.globalMessages || [],
    groupMessages: store.groupMessages || {}
  });
});

// POST Clear/New Chat for private copilot
app.post("/api/chat/clear", (req, res) => {
  const userKey = getUserKey(req);
  const store = getStore();
  if (!store.userStores) store.userStores = {};
  if (!store.userStores[userKey]) store.userStores[userKey] = createDefaultUserData();
  
  store.userStores[userKey].copilotMessages = [
    {
      id: "new-session-" + Date.now(),
      sender: "gemini@copilot.ai",
      senderFullName: "Gemini 1-on-1 Study Copilot",
      senderAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gemini",
      text: "New study chat started! What Class 10th concept, math problem, or homework shall we tackle today?",
      timestamp: new Date().toISOString()
    }
  ];
  saveStore(store);
  res.json({ success: true, messages: store.userStores[userKey].copilotMessages });
});

// POST Send a new message & programmatically trigger Gemini command agent
app.post("/api/chat/message", async (req, res) => {
  const { sender, senderFullName, senderAvatar, text, fileUrl, fileName, fileType, isPhoto, groupId: rawGroupId, channel, triggerAi } = req.body;
  if (!sender || !text) {
    return res.status(400).json({ error: "Sender and text are required" });
  }

  const userKey = getUserKey(req);
  const store = getStore();
  if (!store.userStores) store.userStores = {};
  if (!store.userStores[userKey]) store.userStores[userKey] = createDefaultUserData();
  const userPersonal = store.userStores[userKey];

  const resolvedGroupId = rawGroupId || channel;
  const groupId = (resolvedGroupId && resolvedGroupId !== "global" && resolvedGroupId !== "private_copilot" && resolvedGroupId !== "copilot") ? resolvedGroupId : undefined;
  const isPrivate = !groupId && (channel === "private_copilot" || channel === "copilot" || resolvedGroupId !== "global");

  const msgId = "msg_" + Date.now();
  const newMessage = {
    id: msgId,
    sender,
    senderFullName: senderFullName || sender,
    senderAvatar: senderAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(sender)}`,
    text,
    timestamp: new Date().toISOString(),
    fileUrl,
    fileName,
    fileType,
    isPhoto
  };

  if (isPrivate) {
    if (!userPersonal.copilotMessages) userPersonal.copilotMessages = [];
    userPersonal.copilotMessages.push(newMessage);
  } else if (groupId) {
    if (!store.groupMessages) store.groupMessages = {};
    if (!store.groupMessages[groupId]) store.groupMessages[groupId] = [];
    store.groupMessages[groupId].push(newMessage);
  } else {
    if (!store.globalMessages) store.globalMessages = [];
    store.globalMessages.push(newMessage);
  }

  saveStore(store);
  if (!isPrivate) {
    broadcastToChannel(groupId || "global", {
      type: "new_message",
      message: newMessage
    });
  }


  // Auto AI trigger flags
  const lowerText = text.toLowerCase();
  const shouldTriggerAi = triggerAi || !groupId || lowerText.includes("gemini") || lowerText.startsWith("/") || lowerText.startsWith("@gemini");

  if (shouldTriggerAi) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const historyContext = groupId 
          ? (store.groupMessages[groupId] || []).slice(-15)
          : (store.globalMessages || []).slice(-15);

        const formattedHistory = historyContext
          .map((m: any) => `${m.senderFullName} (${m.sender}): ${m.text}`)
          .join("\n");

        let contentsParts: any[] = [];

        // Attach user-provided file/photo if present
        if (fileUrl) {
          try {
            const filename = path.basename(fileUrl);
            const filepath = path.join(process.cwd(), "uploads", filename);
            if (fs.existsSync(filepath)) {
              const fileData = fs.readFileSync(filepath);
              const base64 = fileData.toString("base64");
              const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain"];
              const finalMime = supportedTypes.includes(fileType || "") ? fileType : "text/plain";
              contentsParts.push({
                inlineData: {
                  data: base64,
                  mimeType: finalMime
                }
              });
            }
          } catch (fileErr) {
            console.error("Error fetching uploaded file to send to Gemini API:", fileErr);
          }
        }

        // Custom, high-powered command prompts
        contentsParts.push({
          text: `You are 'Gemini Study Copilot', an AI student success coach. You are in a chatroom where multiple people can talk and give you commands.
The current date is: 2026-07-11.

Current study workspace state:
- Todos count: ${store.todos.length}
- Syllabus courses: ${store.syllabus.map((c: any) => c.courseName).join(", ")}
- Planner has ${store.planner?.schedule?.length || 0} items
- Study groups: ${store.studyGroups.map((g: any) => g.name).join(", ")}
- HTML Announcements count: ${store.announcements?.length || 0}

Chat History so far:
${formattedHistory}

The user's latest message is: "${text}"

You have the absolute authority to mutate the workspace state in response to commands like:
1. "add class 10th syllabus" -> Generate multiple (e.g., 4-6) clean course plates (Mathematics, Science, History, English, computer etc.) with logical chapters/topics, and estimated future exam dates in YYYY-MM-DD.
2. "add task/todo", "prioritize checklists", "write a daily planner", "add countdowns", etc.
3. "add HTML snippet", "create study calculator widget", "embed interactive timeline" -> Generate a highly styled, complete, functional standalone HTML snippet / widget with Tailwind css inside, and emit "addAnnouncement" to render it on the announcement board!
4. "add questions to my question bank" -> Emit "addQuestionsToBank" mutation with questions containing questionText, options (array of strings or null for subjective/short answers), correctAnswer, subject, and difficulty ("Easy", "Medium", "Hard").
5. "create a practice sheet / make a test on [Subject]" -> Emit "addPracticeSheet" mutation containing title, subject, and questions list.
6. "Allow AI to fetch questions from photos" -> If the user uploaded a photo/image attachment (which is automatically passed as inline image data), examine the image, extract any question(s) written/shown in the photo, and add them to the question bank ("addQuestionsToBank") or build a practice sheet ("addPracticeSheet") as requested by the user, or simply explain/solve the questions in your text reply!

Respond STRICTLY in this JSON format:
{
  "reply": "Conversational reply text to show in the chat. Break down what you did in a friendly, encouraging way.",
  "mutations": {
    "addSyllabus": [
      {
        "id": "string",
        "courseName": "string",
        "topics": [{ "name": "string", "status": "Not Started" }],
        "examDate": "YYYY-MM-DD"
      }
    ],
    "addTodos": [
      {
        "id": "string",
        "title": "string",
        "deadline": "YYYY-MM-DD",
        "priority": "High" | "Medium" | "Low",
        "completed": false,
        "course": "string",
        "estimatedMinutes": 45,
        "actualMinutes": 0
      }
    ],
    "addCountdowns": [
      {
        "id": "string",
        "title": "string",
        "examDate": "ISO String",
        "subject": "string"
      }
    ],
    "updatePlanner": {
      "date": "YYYY-MM-DD",
      "basicTasks": "string",
      "schedule": [{ "timeSlot": "string", "taskName": "string", "isAIGenerated": true, "completed": false }],
      "aiAdvice": "string"
    },
    "addAnnouncement": {
      "title": "string (Title of HTML tool/widget)",
      "htmlContent": "string (Highly polished standalone HTML page, with modern Tailwind style embedded, clean interactions or visual representations)"
    },
    "addQuestionsToBank": [
      {
        "questionText": "string",
        "options": ["string", "string", "string", "string"] (or null if open-ended),
        "correctAnswer": "string (matching correct option exactly or answer key)",
        "subject": "string (subject/course)",
        "difficulty": "Easy" | "Medium" | "Hard"
      }
    ],
    "addPracticeSheet": {
      "title": "string",
      "subject": "string",
      "questions": [
        {
          "questionText": "string",
          "options": ["string", "string", "string", "string"] (or null if open-ended),
          "correctAnswer": "string",
          "subject": "string",
          "difficulty": "Easy" | "Medium" | "Hard"
        }
      ]
    }
  }
}

If no mutations are requested, leave 'mutations' as an empty object {}.`
        });

        const response = await callGeminiWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: { parts: contentsParts },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                mutations: {
                  type: Type.OBJECT,
                  properties: {
                    addSyllabus: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          courseName: { type: Type.STRING },
                          topics: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                name: { type: Type.STRING },
                                status: { type: Type.STRING, enum: ["Not Started", "In Progress", "Completed"] }
                              },
                              required: ["name", "status"]
                            }
                          },
                          examDate: { type: Type.STRING }
                        },
                        required: ["id", "courseName", "topics"]
                      }
                    },
                    addTodos: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          deadline: { type: Type.STRING },
                          priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                          completed: { type: Type.BOOLEAN },
                          course: { type: Type.STRING },
                          estimatedMinutes: { type: Type.INTEGER },
                          actualMinutes: { type: Type.INTEGER }
                        },
                        required: ["id", "title", "priority", "completed"]
                      }
                    },
                    addCountdowns: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          examDate: { type: Type.STRING },
                          subject: { type: Type.STRING }
                        },
                        required: ["id", "title", "examDate", "subject"]
                      }
                    },
                    updatePlanner: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING },
                        basicTasks: { type: Type.STRING },
                        schedule: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              timeSlot: { type: Type.STRING },
                              taskName: { type: Type.STRING },
                              isAIGenerated: { type: Type.BOOLEAN },
                              completed: { type: Type.BOOLEAN }
                            },
                            required: ["timeSlot", "taskName", "isAIGenerated", "completed"]
                          }
                        },
                        aiAdvice: { type: Type.STRING }
                      },
                      required: ["date", "basicTasks", "schedule", "aiAdvice"]
                    },
                    addAnnouncement: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        htmlContent: { type: Type.STRING }
                      },
                      required: ["title", "htmlContent"]
                    },
                    addQuestionsToBank: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          questionText: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          },
                          correctAnswer: { type: Type.STRING },
                          subject: { type: Type.STRING },
                          difficulty: { type: Type.STRING }
                        },
                        required: ["questionText", "correctAnswer"]
                      }
                    },
                    addPracticeSheet: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        subject: { type: Type.STRING },
                        questions: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              questionText: { type: Type.STRING },
                              options: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                              },
                              correctAnswer: { type: Type.STRING },
                              subject: { type: Type.STRING },
                              difficulty: { type: Type.STRING }
                            },
                            required: ["questionText", "correctAnswer"]
                          }
                        }
                      },
                      required: ["title", "subject", "questions"]
                    }
                  }
                }
              },
              required: ["reply", "mutations"]
            }
          }
        });

        const replyText = response.text;
        if (replyText) {
          const parsed = parseGeminiJson(replyText);

          // Apply state updates on the server side
          if (parsed.mutations) {
            const m = parsed.mutations;
            if (m.addSyllabus && Array.isArray(m.addSyllabus)) {
              m.addSyllabus.forEach((course: any) => {
                if (!store.syllabus.some((c: any) => c.courseName.toLowerCase() === course.courseName.toLowerCase())) {
                  store.syllabus.push(course);
                }
              });
            }
            if (m.addTodos && Array.isArray(m.addTodos)) {
              m.addTodos.forEach((todo: any) => {
                if (!store.todos.some((t: any) => t.title.toLowerCase() === todo.title.toLowerCase())) {
                  store.todos.push(todo);
                }
              });
            }
            if (m.addCountdowns && Array.isArray(m.addCountdowns)) {
              m.addCountdowns.forEach((cd: any) => {
                if (!store.countdowns.some((c: any) => c.title.toLowerCase() === cd.title.toLowerCase())) {
                  store.countdowns.push(cd);
                }
              });
            }
            if (m.updatePlanner) {
              store.planner = m.updatePlanner;
            }
             if (m.addAnnouncement) {
              if (!store.announcements) store.announcements = [];
              store.announcements.push({
                id: "ann_ai_" + Date.now(),
                author: "Gemini AI Copilot",
                title: m.addAnnouncement.title || "AI Generated Widget",
                htmlContent: m.addAnnouncement.htmlContent,
                createdAt: new Date().toISOString()
              });
            }
            if (m.addQuestionsToBank && Array.isArray(m.addQuestionsToBank)) {
              if (!store.questionBank) store.questionBank = [];
              m.addQuestionsToBank.forEach((q: any, index: number) => {
                store.questionBank.push({
                  id: "q_ai_" + Date.now() + "_" + index + "_" + Math.floor(Math.random() * 1000),
                  questionText: q.questionText,
                  options: Array.isArray(q.options) && q.options.length > 0 ? q.options : undefined,
                  correctAnswer: q.correctAnswer,
                  subject: q.subject || "General",
                  difficulty: q.difficulty || "Medium",
                  createdAt: new Date().toISOString()
                });
              });
            }
            if (m.addPracticeSheet && typeof m.addPracticeSheet === "object") {
              if (!store.practiceSheets) store.practiceSheets = [];
              const questions = Array.isArray(m.addPracticeSheet.questions)
                ? m.addPracticeSheet.questions.map((q: any, idx: number) => ({
                    id: "q_ai_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 1000),
                    questionText: q.questionText,
                    options: Array.isArray(q.options) && q.options.length > 0 ? q.options : undefined,
                    correctAnswer: q.correctAnswer,
                    subject: q.subject || m.addPracticeSheet.subject || "General",
                    difficulty: q.difficulty || "Medium",
                    createdAt: new Date().toISOString()
                  }))
                : [];
              
              const newSheet = {
                id: "sheet_" + Date.now(),
                title: m.addPracticeSheet.title || "AI Practice Sheet",
                subject: m.addPracticeSheet.subject || "General",
                questions,
                createdAt: new Date().toISOString(),
                createdBy: "Gemini AI Copilot"
              };
              store.practiceSheets.push(newSheet);

              // Also add these generated questions to the question bank properly!
              if (!store.questionBank) store.questionBank = [];
              questions.forEach((q: any) => {
                if (!store.questionBank.some((bq: any) => bq.questionText.toLowerCase().trim() === q.questionText.toLowerCase().trim())) {
                  store.questionBank.push(q);
                }
              });
            }
          }

          // Push Gemini AI reply bubble
          const aiMessage = {
            id: "msg_ai_" + Date.now(),
            sender: "gemini@copilot.ai",
            senderFullName: "Gemini Study Copilot",
            senderAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gemini",
            text: parsed.reply || "Workspace state rewritten successfully!",
            timestamp: new Date().toISOString(),
            mutationsApplied: parsed.mutations ? Object.keys(parsed.mutations).filter(k => parsed.mutations[k] && Object.keys(parsed.mutations[k]).length > 0) : []
          };

          if (isPrivate) {
            if (!userPersonal.copilotMessages) userPersonal.copilotMessages = [];
            userPersonal.copilotMessages.push(aiMessage);
          } else if (groupId) {
            store.groupMessages[groupId].push(aiMessage);
          } else {
            store.globalMessages.push(aiMessage);
          }

          saveStore(store);
          if (!isPrivate) {
            broadcastToChannel(groupId || "global", {
              type: "new_message",
              message: aiMessage
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to execute inline Gemini action:", err);
        // Fallback friendly reply from AI
        const aiMessage = {
          id: "msg_ai_" + Date.now(),
          sender: "gemini@copilot.ai",
          senderFullName: "Gemini Study Copilot",
          senderAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gemini",
          text: `I heard you! (Note: Gemini API is currently under heavy load, but I've kept your message safe in the chat history. Let me know if you want me to re-try adding that!).`,
          timestamp: new Date().toISOString()
        };
        if (isPrivate) {
          if (!userPersonal.copilotMessages) userPersonal.copilotMessages = [];
          userPersonal.copilotMessages.push(aiMessage);
        } else if (groupId) {
          store.groupMessages[groupId].push(aiMessage);
        } else {
          store.globalMessages.push(aiMessage);
        }
        saveStore(store);
        if (!isPrivate) {
          broadcastToChannel(groupId || "global", {
            type: "new_message",
            message: aiMessage
          });
        }
      }
    }
  }

  res.json({ success: true, message: newMessage, store: getScopedStoreForUser(userKey) });
});

// --- PUBLIC RESOURCES & ANNOUNCEMENT BLOG CHANNEL (OPEN WITHOUT LOGIN) ---

// GET Public Resources & Announcements (Publicly viewable directly without login)
app.get("/api/public-resources", async (req, res) => {
  try {
    if (mongoDb) {
      const items = await mongoDb.collection("public_resources").find({}).sort({ createdAt: -1 }).toArray();
      if (items && items.length > 0) {
        return res.json({ success: true, resources: items });
      }
    }
  } catch (err: any) {
    console.warn("[MongoDB] public_resources retrieval fallback:", err.message);
  }

  const store = getStore();
  const resources = store.publicResources || DEFAULT_PUBLIC_RESOURCES;
  res.json({ success: true, resources });
});

// POST Add Public Resource / Announcement / HTML Snippet (Anyone can contribute freely without login)
app.post("/api/public-resources", async (req, res) => {
  const { title, category, description, url, actionButtonLabel, actionButtonUrl, htmlSnippet, authorName, tags } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }

  const newResource: any = {
    id: "res_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title: String(title).trim(),
    category: category || "Announcement",
    description: String(description).trim(),
    url: url ? String(url).trim() : undefined,
    actionButtonLabel: actionButtonLabel ? String(actionButtonLabel).trim() : undefined,
    actionButtonUrl: actionButtonUrl ? String(actionButtonUrl).trim() : undefined,
    htmlSnippet: htmlSnippet ? String(htmlSnippet).trim() : undefined,
    authorName: authorName ? String(authorName).trim() : "Class 10 Scholar",
    createdAt: new Date().toISOString(),
    likes: 1,
    tags: Array.isArray(tags) ? tags : ["CBSE", "Class 10"]
  };

  // 1. Save to MongoDB collection
  if (mongoDb) {
    try {
      await mongoDb.collection("public_resources").insertOne({ ...newResource });
    } catch (err: any) {
      console.warn("[MongoDB] Insert public resource error:", err.message);
    }
  }

  // 2. Save in app store
  const store = getStore();
  if (!store.publicResources) store.publicResources = [];
  store.publicResources.unshift(newResource);
  saveStore(store);

  res.json({ success: true, resource: newResource, resources: store.publicResources });
});

// --- AI HIGH-THINKING TASK & SCHEDULE MANIPULATION COMMAND CENTER ---
app.post("/api/ai/manipulate-tasks", async (req, res) => {
  const userKey = getUserKey(req);
  const { instruction } = req.body;
  if (!instruction || !instruction.trim()) {
    return res.status(400).json({ error: "Instruction is required." });
  }

  const store = getStore();
  if (!store.userStores) store.userStores = {};
  if (!store.userStores[userKey]) store.userStores[userKey] = createDefaultUserData();
  const userPersonal = store.userStores[userKey];

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini AI client is unavailable." });
  }

  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are the Class 10 High-Thinking Study Task & Schedule AI Engine.
The current date is: ${todayStr}.
You have full authority to manipulate the student's study tasks, homework deadlines, backlogs, and day-wise schedule based on their natural language instructions.

The student's current state:
- Todos: ${JSON.stringify((userPersonal.todos || []).map((t: any) => ({ id: t.id, title: t.title, deadline: t.deadline, completed: t.completed, priority: t.priority })))}
- Homework: ${JSON.stringify((userPersonal.homework || []).map((h: any) => ({ id: h.id, title: h.title, dueDate: h.dueDate, subject: h.subject, completed: h.completed })))}
- Backlogs: ${JSON.stringify((userPersonal.backlogs || []).map((b: any) => ({ id: b.id, topic: b.topic, subject: b.subject, completed: b.completed, targetDate: b.targetDate })))}
- Master Plan Day Schedules: ${(userPersonal.masterPlan?.days || []).length} days generated

The student's command: "${instruction}"

Analyze the instruction with high reasoning:
1. Identify if the user completed any task, homework, or backlog (e.g., "I finished Real Numbers", "done with ch 4 math", "completed homework").
2. Identify if the user wants to change, shift, postpone, or advance deadlines (e.g., "push science homework to Friday", "move all due tasks to tomorrow", "change deadline of English to 2026-07-20").
3. Identify if the user wants to add new tasks (e.g., "add 45m science revision for Life Processes today", "add homework for SST page 45 due tomorrow").
4. Formulate an encouraging, structured response.

Respond STRICTLY in JSON format matching this schema:
{
  "reply": "Conversational friendly summary of what was changed and strategic study advice for Class 10.",
  "markDoneTaskIds": ["id1", "id2"],
  "markDoneHomeworkIds": ["id1"],
  "markDoneBacklogIds": ["id1"],
  "shiftDeadlines": [
    { "targetType": "todo", "id": "string", "newDate": "YYYY-MM-DD", "reason": "string" }
  ],
  "newTodos": [
    {
      "id": "string",
      "title": "string",
      "deadline": "YYYY-MM-DD",
      "priority": "High",
      "completed": false,
      "course": "Mathematics",
      "estimatedMinutes": 45,
      "actualMinutes": 0
    }
  ],
  "newHomework": [
    {
      "id": "string",
      "title": "string",
      "subject": "string",
      "dueDate": "YYYY-MM-DD",
      "priority": "Urgent",
      "estimatedMinutes": 40,
      "completed": false
    }
  ]
}`;

    let parsed: any = null;
    try {
      const response = await callGeminiWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: { parts: [{ text: systemPrompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });
      parsed = parseGeminiJson(response.text || "{}");
    } catch (aiErr: any) {
      console.warn("Gemini call fallback in manipulate-tasks:", aiErr.message);
      const lower = instruction.toLowerCase();
      parsed = {
        reply: `Action processed: "${instruction}". Tasks and schedule successfully updated!`,
        markDoneTaskIds: [],
        markDoneHomeworkIds: [],
        markDoneBacklogIds: [],
        shiftDeadlines: [],
        newTodos: [],
        newHomework: []
      };
      if (lower.includes("add") || lower.includes("practice") || lower.includes("study") || lower.includes("revision")) {
        parsed.newTodos.push({
          id: "todo_ai_" + Date.now(),
          title: instruction.replace(/^(please\s+)?add\s+/i, ""),
          deadline: todayStr,
          priority: "High",
          course: lower.includes("math") ? "Mathematics" : lower.includes("science") ? "Science" : "General",
          estimatedMinutes: 45
        });
      }
    }

    if (!parsed) parsed = {};
    let markedDoneCount = 0;
    let shiftedCount = 0;
    let addedCount = 0;


    // Apply mark done
    if (Array.isArray(parsed.markDoneTaskIds) && parsed.markDoneTaskIds.length > 0) {
      userPersonal.todos = (userPersonal.todos || []).map((t: any) => {
        if (parsed.markDoneTaskIds.includes(t.id)) {
          markedDoneCount++;
          return { ...t, completed: true };
        }
        return t;
      });
    }
    if (Array.isArray(parsed.markDoneHomeworkIds) && parsed.markDoneHomeworkIds.length > 0) {
      userPersonal.homework = (userPersonal.homework || []).map((h: any) => {
        if (parsed.markDoneHomeworkIds.includes(h.id)) {
          markedDoneCount++;
          return { ...h, completed: true };
        }
        return h;
      });
    }
    if (Array.isArray(parsed.markDoneBacklogIds) && parsed.markDoneBacklogIds.length > 0) {
      userPersonal.backlogs = (userPersonal.backlogs || []).map((b: any) => {
        if (parsed.markDoneBacklogIds.includes(b.id)) {
          markedDoneCount++;
          return { ...b, completed: true };
        }
        return b;
      });
    }

    // Apply shifted deadlines
    if (Array.isArray(parsed.shiftDeadlines) && parsed.shiftDeadlines.length > 0) {
      parsed.shiftDeadlines.forEach((s: any) => {
        if (s.targetType === "homework") {
          userPersonal.homework = (userPersonal.homework || []).map((h: any) => {
            if (h.id === s.id && s.newDate) {
              shiftedCount++;
              return { ...h, dueDate: s.newDate };
            }
            return h;
          });
        } else if (s.targetType === "backlog") {
          userPersonal.backlogs = (userPersonal.backlogs || []).map((b: any) => {
            if (b.id === s.id && s.newDate) {
              shiftedCount++;
              return { ...b, targetDate: s.newDate };
            }
            return b;
          });
        } else {
          userPersonal.todos = (userPersonal.todos || []).map((t: any) => {
            if (t.id === s.id && s.newDate) {
              shiftedCount++;
              return { ...t, deadline: s.newDate };
            }
            return t;
          });
        }
      });
    }

    // Apply new todos
    if (Array.isArray(parsed.newTodos) && parsed.newTodos.length > 0) {
      parsed.newTodos.forEach((nt: any) => {
        const item = {
          id: nt.id || "todo_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          title: nt.title,
          deadline: nt.deadline || todayStr,
          priority: nt.priority || "Medium",
          completed: false,
          course: nt.course || "Mathematics",
          estimatedMinutes: nt.estimatedMinutes || 45,
          actualMinutes: 0
        };
        if (!userPersonal.todos) userPersonal.todos = [];
        userPersonal.todos.unshift(item);
        addedCount++;
      });
    }

    // Apply new homework
    if (Array.isArray(parsed.newHomework) && parsed.newHomework.length > 0) {
      parsed.newHomework.forEach((nh: any) => {
        const item = {
          id: nh.id || "hw_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          title: nh.title,
          subject: nh.subject || "Mathematics",
          dueDate: nh.dueDate || todayStr,
          priority: nh.priority || "Normal",
          estimatedMinutes: nh.estimatedMinutes || 40,
          completed: false,
          createdAt: new Date().toISOString()
        };
        if (!userPersonal.homework) userPersonal.homework = [];
        userPersonal.homework.unshift(item);
        addedCount++;
      });
    }

    saveStore(store);

    res.json({
      success: true,
      reply: parsed.reply || "Tasks and schedule updated successfully!",
      markedDoneCount,
      shiftedDeadlinesCount: shiftedCount,
      addedTasksCount: addedCount,
      store: getScopedStoreForUser(userKey)
    });
  } catch (err: any) {
    console.error("Task manipulation AI error:", err);
    res.status(500).json({ error: "Failed to process task manipulation: " + err.message });
  }
});



// --- FILE UPLOADER PORT ---

app.post("/api/upload", (req, res) => {
  const name = req.body.name || req.body.fileName;
  const type = req.body.type || req.body.fileType;
  const data = req.body.data || req.body.base64Data || req.body.base64;
  if (!name || !data) {
    return res.status(400).json({ error: "File name and base64 data are required." });
  }

  try {
    const cleanBase64 = data.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    
    const uniqueName = Date.now() + "_" + name.replace(/\s+/g, "_");
    const filepath = path.join(process.cwd(), "uploads", uniqueName);
    
    fs.writeFileSync(filepath, buffer);
    const url = `/uploads/${uniqueName}`;

    res.json({
      success: true,
      url,
      fileUrl: url,
      fileName: name,
      fileType: type
    });
  } catch (err: any) {
    console.error("Upload failure:", err);
    res.status(500).json({ error: "Failed to write file to storage directory: " + err.message });
  }
});

// AI Endpoint 1: Add syllabus via Gemini prompt
app.post("/api/gemini/generate-syllabus", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Syllabus prompt is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `Create a structured study syllabus outline based on this user prompt: "${prompt}". 
Select or estimate an appropriate name for this course, outline 4 to 8 crucial core topics, and estimate an exam date in YYYY-MM-DD format (starting from July 2026 onwards). Respond in strict JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            courseName: {
              type: Type.STRING,
              description: "The official clean name of the course or subject"
            },
            examDate: {
              type: Type.STRING,
              description: "Estimated or logical exam date for this syllabus in YYYY-MM-DD format, starting after July 2026"
            },
            topics: {
              type: Type.ARRAY,
              description: "Chronological core topics to study for this course",
              items: {
                type: Type.STRING
              }
            }
          },
          required: ["courseName", "examDate", "topics"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const result = parseGeminiJson(text);
    res.json({ success: true, syllabus: result });
  } catch (error: any) {
    console.error("Error generating syllabus:", error);
    res.status(500).json({ error: error.message || "Failed to generate syllabus" });
  }
});

// AI Endpoint 2: Prioritize to-do list automatically based on deadlines
app.post("/api/gemini/prioritize-todos", async (req, res) => {
  const { todos, currentDate } = req.body;
  if (!todos || !Array.isArray(todos)) {
    return res.status(400).json({ error: "An array of todos is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `You are an expert student success coach. Analyze the following todo items and prioritize them based on their deadlines. 
Current date is: ${currentDate || "2026-07-11"}.
Identify which tasks should be 'High', 'Medium', or 'Low' priority. Urgent tasks with closer deadlines should be ranked higher.
Return a JSON array of prioritized todos with their updated priority ('High' | 'Medium' | 'Low') and a short 1-sentence reasoning explaining why it was assigned that priority. Do not add or remove any items. Maintain the exact same item 'id'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              priority: { 
                type: Type.STRING, 
                enum: ["High", "Medium", "Low"],
                description: "Re-calculated priority"
              },
              reasoning: { 
                type: Type.STRING,
                description: "Short, encouraging 1-sentence explanation of why it was prioritized this way"
              }
            },
            required: ["id", "priority", "reasoning"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const prioritizedUpdates = parseGeminiJson(text);
    res.json({ success: true, updates: prioritizedUpdates });
  } catch (error: any) {
    console.error("Error prioritizing todos:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize todos" });
  }
});

// AI Endpoint: Parse question from uploaded photo
app.post("/api/gemini/parse-photo-question", async (req, res) => {
  const { base64Data, mimeType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: "photo data (base64) is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const finalMime = mimeType || "image/jpeg";
    const imagePart = {
      inlineData: {
        data: base64Data.replace(/^data:.*?;base64,/, ""),
        mimeType: finalMime
      }
    };

    const textPart = {
      text: `Analyze this image/photo of an academic question. Extract the main question text, multiple choice options (if present), correct answer or solution guidelines, and infer the subject and difficulty level.
Return a structured JSON object containing a single question:
{
  "questionText": "string (the complete extracted question)",
  "options": ["option A", "option B", "option C", "option D"] (or null if it is open-ended/subjective),
  "correctAnswer": "string (the correct option or concise answer text)",
  "subject": "string (e.g., Mathematics, Physics, Chemistry, Science, History, Biology)",
  "difficulty": "Easy" | "Medium" | "Hard"
}`
    };

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              nullable: true
            },
            correctAnswer: { type: Type.STRING },
            subject: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ["questionText", "correctAnswer", "subject", "difficulty"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const result = parseGeminiJson(text);
    res.json({ success: true, question: result });
  } catch (error: any) {
    console.error("Error parsing question from photo:", error);
    res.status(500).json({ error: error.message || "Failed to parse question from photo using Gemini" });
  }
});

// AI Endpoint 3: Plan user's day based on basic tasks and syllabus
app.post("/api/gemini/plan-day", async (req, res) => {
  const { basicTasks, syllabus, currentDate } = req.body;
  if (!basicTasks) {
    return res.status(400).json({ error: "Basic tasks description is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const coursesContext = syllabus && Array.isArray(syllabus)
      ? syllabus.map((c: any) => `${c.courseName} (topics: ${c.topics.map((t: any) => `${t.name} [${t.status}]`).join(", ")})`).join("; ")
      : "No courses currently configured";

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `You are a study productivity expert and daily agenda builder. The user wants you to plan their day on ${currentDate || "2026-07-12"}.
Basic goals entered by the user: "${basicTasks}"
Current Syllabus & Courses Context: "${coursesContext}"

Design a time-blocked hourly student schedule. Break up work into focus sessions (e.g., matching Pomodoro styles) and include active recovery breaks. Integrate their basic goals with relevant syllabus topics when logical. 
Also, write a short, motivational coaching feedback paragraph ('aiAdvice') helping them focus and optimize their study stamina. Respond in strict JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              description: "Chronological time blocks covering the day, e.g. morning, afternoon, evening slots",
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSlot: { type: Type.STRING, description: "e.g., 09:00 AM - 10:30 AM" },
                  taskName: { type: Type.STRING, description: "Productive study task, review session, or recovery break" },
                  isAIGenerated: { type: Type.BOOLEAN }
                },
                required: ["timeSlot", "taskName", "isAIGenerated"]
              }
            },
            aiAdvice: {
              type: Type.STRING,
              description: "Motivational coaching tip and execution plan from the study mentor AI"
            }
          },
          required: ["schedule", "aiAdvice"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const dailyPlanner = parseGeminiJson(text);
    res.json({ success: true, planner: dailyPlanner });
  } catch (error: any) {
    console.error("Error planning day:", error);
    res.status(500).json({ error: error.message || "Failed to plan day" });
  }
});

// AI Endpoint 3.5: Generate comprehensive Day-Wise Class 10 Master Study Plan up to Deadline
app.post("/api/gemini/generate-class10-plan", async (req, res) => {
  const {
    syllabusAudit,
    homeworkList = [],
    backlogsList = [],
    deadlineDate,
    dailyStudyHoursWeekday = 4,
    dailyStudyHoursWeekend = 7,
    targetExamName = "CBSE Class 10 Board / Pre-Board Exam",
    studentNotes = ""
  } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const targetDate = deadlineDate ? new Date(deadlineDate) : new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const diffDays = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const planDaysCount = Math.min(14, diffDays);

    const auditSummary = Array.isArray(syllabusAudit)
      ? syllabusAudit.map((s: any) => `
Subject: ${s.name}
- Remaining Chapters: ${s.remainingChapters?.join(", ") || "None"}
- Partially Done Chapters: ${s.partialChapters?.join(", ") || "None"}
- Completed Chapters: ${s.completedChapters?.join(", ") || "None"}
- Needing Competency Questions Practice: ${s.competencyPending?.join(", ") || "None"}
- Needing NCERT Questions Practice: ${s.questionsPending?.join(", ") || "None"}`).join("\n")
      : "No syllabus audit provided";

    const homeworkSummary = Array.isArray(homeworkList) && homeworkList.length > 0
      ? homeworkList.map((h: any) => `- [Due: ${h.dueDate || "Soon"}] ${h.subject}: ${h.title} (~${h.estimatedMinutes || 30} mins)`).join("\n")
      : "No pending school homework.";

    const backlogsSummary = Array.isArray(backlogsList) && backlogsList.length > 0
      ? backlogsList.map((b: any) => `- ${b.subject}: ${b.topic} (${b.backlogType}, Severity: ${b.severity}, ~${b.estimatedHours || 1} hrs)`).join("\n")
      : "No backlogs reported.";

    const prompt = `You are the Chief Academic Strategist for CBSE Class 10 students aiming for 95%+ in their Board Examinations.
Target Milestone: ${targetExamName}
Deadline Date: ${targetDateStr} (${diffDays} days from today).
Today's Date: ${todayStr}.
Available Study Hours: ${dailyStudyHoursWeekday} hrs/day on weekdays, ${dailyStudyHoursWeekend} hrs/day on weekends.
Additional Student Notes: "${studentNotes || "Balance all 5 subjects, focus heavily on NCERT & Competency questions"}"

SYLLABUS AUDIT (Class 10th Hindi Course A, English Language & Literature, Maths, Science, Social Science):
${auditSummary}

PENDING SCHOOL HOMEWORK (Must be scheduled in early evening slots so student never defaults at school):
${homeworkSummary}

PREVIOUS ACCUMULATED BACKLOGS (Must have dedicated daily backlog clearance slots):
${backlogsSummary}

INSTRUCTIONS:
Generate a rigorous, realistic, day-wise schedule for the next ${planDaysCount} days starting from today (${todayStr}).
For each day:
1. Provide a focused theme / dailyGoal (e.g. "Maths Quadratic Equations Mastery & Science Life Processes Respiration").
2. Assign realistic time slots (e.g. "06:30 AM - 08:00 AM", "04:30 PM - 05:30 PM", "06:00 PM - 07:30 PM", "08:30 PM - 09:30 PM").
3. Schedule pending School Homework directly into early evening slots so it's completed on time.
4. Schedule a dedicated Backlog Clearance slot to chip away at the student's backlogs.
5. In chapter sessions, specify:
   - NCERT theory reading / line-by-line review
   - Standard Question Practice
   - CBSE Competency Questions (Assertion-Reason, Case-based questions, Exemplar HOTS)
6. Include quick active recall / flash-revision before sleep.
7. Write a strategic coaching summary ('strategySummary') analyzing the student's workload and giving high-yield board tips.

Respond strictly with valid JSON.`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategySummary: {
              type: Type.STRING,
              description: "Strategic mentor advice outlining how this plan finishes syllabus, clears backlogs, and ensures 95%+ in Class 10"
            },
            days: {
              type: Type.ARRAY,
              description: "Day-by-day structured schedules",
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER, description: "1, 2, 3..." },
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  dayName: { type: Type.STRING, description: "e.g. Monday, Tuesday" },
                  focusSubject: { type: Type.STRING, description: "Primary subject or subjects for the day" },
                  dailyGoal: { type: Type.STRING, description: "Key outcome for this day" },
                  studyHoursTarget: { type: Type.NUMBER, description: "Total target hours" },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        timeSlot: { type: Type.STRING, description: "e.g. 05:00 PM - 06:15 PM" },
                        subject: { type: Type.STRING },
                        category: {
                          type: Type.STRING,
                          enum: ["Deep Study", "Competency Questions", "NCERT Practice", "School Homework", "Backlog Clearance", "Quick Revision", "Break"]
                        },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        completed: { type: Type.BOOLEAN }
                      },
                      required: ["id", "timeSlot", "subject", "category", "title", "description", "completed"]
                    }
                  }
                },
                required: ["dayNumber", "date", "dayName", "focusSubject", "dailyGoal", "studyHoursTarget", "tasks"]
              }
            }
          },
          required: ["strategySummary", "days"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const planData = parseGeminiJson(text);
    const masterPlan = {
      id: "master_plan_" + Date.now(),
      generatedAt: new Date().toISOString(),
      deadlineDate: targetDateStr,
      dailyStudyHoursWeekday,
      dailyStudyHoursWeekend,
      targetExamName,
      strategySummary: planData.strategySummary || "Stay consistent and conquer one milestone at a time!",
      days: planData.days.map((d: any, dIdx: number) => ({
        ...d,
        tasks: d.tasks.map((t: any, tIdx: number) => ({
          ...t,
          id: t.id || `task_${dIdx}_${tIdx}_${Date.now()}`
        }))
      }))
    };

    res.json({ success: true, masterPlan });
  } catch (error: any) {
    console.error("Error generating Class 10 plan:", error);
    res.status(500).json({ error: error.message || "Failed to generate Class 10 study plan" });
  }
});

// AI Endpoint 4: Interactive Gemini command-driven assistant chat
app.post("/api/gemini/chat", async (req, res) => {
  const { message, chatHistory, store, currentDate } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const formattedHistory = Array.isArray(chatHistory)
      ? chatHistory.map((item: any) => `${item.sender === "user" ? "User" : "AI Assistant"}: ${item.text}`).join("\n")
      : "";

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `You are 'Gemini Study Copilot', an AI-powered command-driven student success coach that has absolute power to execute any educational or study organization command requested by the user.
The current date is: ${currentDate || "2026-07-11"}.

The user's current study workspace state (AppStore):
${JSON.stringify(store, null, 2)}

Chat history:
${formattedHistory}

New User Command/Message:
"${message}"

Based on the message and current study workspace state:
1. Determine if the user is asking you to make modifications, add data, or perform actions.
2. You CAN make the following state mutations in response to commands (e.g. "add chemistry", "add class 10th syllabus", "add task", "schedule session", "prioritize", "plan my day"):
   - Add new syllabus courses (including MULTIPLE courses at once if they ask for a full syllabus like "class 10th", "AP syllabus", etc. Create 4 to 8 distinct subjects with chapters/topics and exams).
   - Add countdown timers for upcoming exams.
   - Add to-do tasks.
   - Plan their daily hourly agenda.
   - Add collaborative study group sessions or notes.
3. Formulate a rich, encouraging, and clear conversational reply to the user explaining what you did, summarizing concepts, or replying to their text.
4. Prepare the exact state mutations required. All IDs generated for new elements must be unique (e.g., 'todo_xxxxxxxx' or 'course_xxxxxxxx').

Respond with a single JSON object matching this schema:
{
  "reply": "Conversational reply text to show the user. Include a breakdown or friendly summary.",
  "mutations": {
    "addSyllabus": [
      {
        "id": "string (unique id)",
        "courseName": "string (clean subject name, e.g. Mathematics)",
        "topics": [
          { "name": "string (chapter/topic name)", "status": "Not Started" }
        ],
        "examDate": "string (YYYY-MM-DD format, after July 2026)"
      }
    ],
    "addTodos": [
      {
        "id": "string (unique id)",
        "title": "string (task title)",
        "deadline": "string (YYYY-MM-DD format)",
        "priority": "High" | "Medium" | "Low",
        "completed": false,
        "course": "string (matching courseName if relevant)",
        "estimatedMinutes": 45,
        "actualMinutes": 0,
        "reasoning": "string"
      }
    ],
    "addCountdowns": [
      {
        "id": "string (unique id)",
        "title": "string (event/exam title, e.g. Physics Final Exam)",
        "examDate": "string (ISO Date-Time string, e.g. 2026-07-20T09:00:00.000Z)",
        "subject": "string (course/subject name)"
      }
    ],
    "updatePlanner": {
      "date": "string (YYYY-MM-DD)",
      "basicTasks": "string (the intentions/goals)",
      "schedule": [
        { "timeSlot": "string (e.g., 10:00 AM - 11:30 AM)", "taskName": "string", "isAIGenerated": true, "completed": false }
      ],
      "aiAdvice": "string"
    },
    "prioritizeTodos": true or false,
    "addGroupSession": {
      "groupId": "string (matching studyGroup id or name)",
      "session": {
        "id": "string (unique id)",
        "title": "string",
        "time": "string (e.g., Tuesday 4:00 PM)",
        "durationMinutes": 60,
        "agenda": "string"
      }
    },
    "addGroupNote": {
      "groupId": "string (matching studyGroup id or name)",
      "note": {
        "id": "string (unique id)",
        "title": "string",
        "content": "string",
        "author": "string",
        "timestamp": "string (ISO Date string)"
      }
    }
  }
}

Include ONLY the keys in 'mutations' that you actually intend to modify/add. If no mutations are needed, set 'mutations' to an empty object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            mutations: {
              type: Type.OBJECT,
              properties: {
                addSyllabus: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      courseName: { type: Type.STRING },
                      topics: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["Not Started", "In Progress", "Completed"] }
                          },
                          required: ["name", "status"]
                        }
                      },
                      examDate: { type: Type.STRING }
                    },
                    required: ["id", "courseName", "topics"]
                  }
                },
                addTodos: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      deadline: { type: Type.STRING },
                      priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                      completed: { type: Type.BOOLEAN },
                      course: { type: Type.STRING },
                      estimatedMinutes: { type: Type.INTEGER },
                      actualMinutes: { type: Type.INTEGER },
                      reasoning: { type: Type.STRING }
                    },
                    required: ["id", "title", "priority", "completed"]
                  }
                },
                addCountdowns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      examDate: { type: Type.STRING },
                      subject: { type: Type.STRING }
                    },
                    required: ["id", "title", "examDate", "subject"]
                  }
                },
                updatePlanner: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    basicTasks: { type: Type.STRING },
                    schedule: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          timeSlot: { type: Type.STRING },
                          taskName: { type: Type.STRING },
                          isAIGenerated: { type: Type.BOOLEAN },
                          completed: { type: Type.BOOLEAN }
                        },
                        required: ["timeSlot", "taskName", "isAIGenerated", "completed"]
                      }
                    },
                    aiAdvice: { type: Type.STRING }
                  },
                  required: ["date", "basicTasks", "schedule", "aiAdvice"]
                },
                prioritizeTodos: { type: Type.BOOLEAN },
                addGroupSession: {
                  type: Type.OBJECT,
                  properties: {
                    groupId: { type: Type.STRING },
                    session: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        time: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        agenda: { type: Type.STRING }
                      },
                      required: ["id", "title", "time", "durationMinutes", "agenda"]
                    }
                  },
                  required: ["groupId", "session"]
                },
                addGroupNote: {
                  type: Type.OBJECT,
                  properties: {
                    groupId: { type: Type.STRING },
                    note: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        author: { type: Type.STRING },
                        timestamp: { type: Type.STRING }
                      },
                      required: ["id", "title", "content", "author", "timestamp"]
                    }
                  },
                  required: ["groupId", "note"]
                }
              }
            }
          },
          required: ["reply", "mutations"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const chatResponse = parseGeminiJson(text);
    res.json({ success: true, ...chatResponse });
  } catch (error: any) {
    console.error("Error in Gemini chat assistant:", error);
    res.status(500).json({ error: error.message || "Failed to process chat with Gemini" });
  }
});

// AI Endpoint 5: Generate custom HTML snippets for parallel co-watching arena
app.post("/api/ai/generate-snippet", async (req, res) => {
  const { prompt, username, fullName } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "A prompt describing the study tool/widget is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client is not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const systemInstruction = `You are 'Gemini Snippet Maker', an elite educational frontend developer and tool designer.
Your job is to generate a highly interactive, fully styled, standalone HTML study tool, widget, calculator, simulation, or flashcard deck based on the user's request.
Requirements:
1. Return a JSON object with:
   - "title": A concise, clean, human-friendly name for the widget (e.g., "Quadratic Equation Visualizer")
   - "category": A clean, general category for the tool (e.g., "Mathematics", "Science", "History", "Vocabulary")
   - "htmlContent": A single, complete standalone HTML page string.
2. Inside "htmlContent":
   - Include Tailwind CSS via CDN inside the <head>: <script src="https://cdn.tailwindcss.com"></script>
   - Include a clean, modern dark/light themed interface with high contrast text, rounded borders, animations, and beautiful transitions.
   - Include any interactive controls (inputs, buttons, sliders, canvas drawing boards, quizzes, flashcards, step-by-step formula breakdown displays).
   - Use embedded <script> tags for all local JS state and DOM manipulation. Ensure all code is bug-free and self-contained.
   - Ensure it fits cleanly in standard aspect-ratio iframe layouts, is fully responsive, has clear fonts (Inter / Space Grotesk via Google Fonts is great) and icons (Lucide or custom vector designs).
   - NEVER refer to external APIs, files, or server endpoints inside the code. Everything must operate in the offline/local browser context.`;

    const userPrompt = `Create a standalone interactive educational tool for: "${prompt}"`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            htmlContent: { type: Type.STRING }
          },
          required: ["title", "category", "htmlContent"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = parseGeminiJson(text);

    const store = getStore();
    const newStream = {
      id: "stream_ai_" + Date.now(),
      title: parsed.title || `Gemini: ${prompt}`,
      type: "html_snippet",
      contentValue: parsed.htmlContent,
      addedBy: username || "gemini_copilot",
      addedByFullName: fullName || "Gemini Co-Scholar",
      createdAt: new Date().toISOString(),
      category: parsed.category || "AI Study Tools",
      activeWatchers: []
    };

    if (!store.sharedStreams) {
      store.sharedStreams = [];
    }
    store.sharedStreams.push(newStream);
    saveStore(store);

    // Broadcast update to all active users
    broadcastToChannel("global", {
      type: "new_stream",
      stream: newStream
    });

    res.json({ success: true, stream: newStream, store });
  } catch (error: any) {
    console.error("Error generating educational snippet with Gemini:", error);
    res.status(500).json({ error: error.message || "Failed to generate educational study tool snippet with Gemini" });
  }
});

// AI Endpoint: Generate HTML Announcement Snippet
app.post("/api/ai/generate-announcement-snippet", async (req, res) => {
  const { prompt, username, fullName } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "A prompt describing the announcement is required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client is not configured. Add GEMINI_API_KEY in Secrets." });
  }

  try {
    const systemInstruction = `You are 'Gemini Board Maker', an elite educational designer.
Your job is to generate a highly interactive, fully styled, standalone HTML board card announcement based on the user's request.
Requirements:
1. Return a JSON object with:
   - "title": A concise, clean, catchy announcement title (e.g., "Weekly Challenge: Math Whiz", "Important: Chemistry Lab Checklist")
   - "htmlContent": A single, complete standalone HTML page string.
2. Inside "htmlContent":
   - Include Tailwind CSS via CDN inside the <head>: <script src="https://cdn.tailwindcss.com"></script>
   - Include a clean, modern dark/light themed interface with high contrast text, rounded borders, animations, and beautiful transitions.
   - You can include any beautiful layout, lists, charts, custom countdown displays, motivational text, quiz elements, or step-by-step guidelines.
   - Use embedded <script> tags for any local JS interactive behaviors (e.g. click to toggle checklists, simple quiz, countdown update, etc.). Ensure all code is bug-free and self-contained.
   - Ensure it is fully responsive, has clear fonts (Inter / Space Grotesk via Google Fonts is great) and icons (Lucide or custom vector designs).
   - NEVER refer to external APIs, files, or server endpoints inside the code. Everything must operate in the offline/local browser context.`;

    const userPrompt = `Create a standalone interactive announcement board card for: "${prompt}"`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            htmlContent: { type: Type.STRING }
          },
          required: ["title", "htmlContent"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = parseGeminiJson(text);

    const store = getStore();
    const newAnnouncement = {
      id: "ann_ai_" + Date.now(),
      author: fullName || username || "Gemini Co-Scholar",
      title: parsed.title || `Gemini: ${prompt}`,
      htmlContent: parsed.htmlContent,
      createdAt: new Date().toISOString()
    };

    if (!store.announcements) {
      store.announcements = [];
    }
    store.announcements.push(newAnnouncement);
    saveStore(store);

    res.json({ success: true, announcement: newAnnouncement, store });
  } catch (error: any) {
    console.error("Error generating announcement snippet with Gemini:", error);
    res.status(500).json({ error: error.message || "Failed to generate educational announcement with Gemini" });
  }
});

// GET Question Bank
app.get("/api/question-bank", (req, res) => {
  const store = getStore();
  res.json({ success: true, questionBank: store.questionBank || [] });
});

// POST Manual Question to Bank
app.post("/api/question-bank/manual", (req, res) => {
  const { questionText, options, correctAnswer, subject, difficulty } = req.body;
  if (!questionText || !correctAnswer || !subject) {
    return res.status(400).json({ error: "questionText, correctAnswer, and subject are required." });
  }

  const store = getStore();
  const newQuestion = {
    id: "q_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    questionText,
    options: Array.isArray(options) ? options : undefined,
    correctAnswer,
    subject: subject.trim(),
    difficulty: difficulty || "Medium",
    createdAt: new Date().toISOString()
  };

  if (!store.questionBank) store.questionBank = [];
  store.questionBank.push(newQuestion);
  saveStore(store);

  res.json({ success: true, question: newQuestion, store });
});

// POST Generate Questions to Bank with Gemini
app.post("/api/question-bank/generate", async (req, res) => {
  const { subject, difficulty, count, prompt } = req.body;
  if (!subject) {
    return res.status(400).json({ error: "subject is required." });
  }

  const reqCount = parseInt(count) || 3;
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini API Client is not configured." });
  }

  try {
    const systemInstruction = `You are 'Gemini Question Architect', an elite academic assessment designer.
Your job is to generate highly educational, accurate, and interesting test questions based on the subject and optional details.
Requirements:
1. Return a JSON object containing a "questions" array.
2. Each question in the array must have:
   - "questionText": The text of the question. Be clear and engaging.
   - "options": An array of 4 distinct multiple-choice option strings. Set to null or empty array if it's a short answer/subjective question.
   - "correctAnswer": The correct option string (matching exactly one item in options) or a clear, concise written answer/solution for open-ended questions.
   - "subject": Must match the subject specified ("${subject}").
   - "difficulty": Must be one of "Easy", "Medium", "Hard" (default to "${difficulty || "Medium"}").
3. Generate exactly ${reqCount} questions.`;

    const userPrompt = `Generate questions for Subject: "${subject}". Difficulty: "${difficulty || "Medium"}".
Additional context/topic requests: "${prompt || "General curriculum questions"}"`;

    const response = await callGeminiWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ["questionText", "correctAnswer", "subject", "difficulty"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    const parsed = parseGeminiJson(text);
    const questionsList = parsed.questions || [];

    const store = getStore();
    if (!store.questionBank) store.questionBank = [];

    const processedQuestions = questionsList.map((q: any, index: number) => ({
      id: "q_ai_" + Date.now() + "_" + index + "_" + Math.floor(Math.random() * 1000),
      questionText: q.questionText,
      options: q.options && q.options.length > 0 ? q.options : undefined,
      correctAnswer: q.correctAnswer,
      subject: q.subject || subject,
      difficulty: q.difficulty || difficulty || "Medium",
      createdAt: new Date().toISOString()
    }));

    store.questionBank.push(...processedQuestions);
    saveStore(store);

    res.json({ success: true, questions: processedQuestions, store });
  } catch (error: any) {
    console.error("Error generating questions with Gemini:", error);
    res.status(500).json({ error: error.message || "Failed to generate questions with Gemini" });
  }
});

// GET Practice Sheets
app.get("/api/practice-sheets", (req, res) => {
  const store = getStore();
  res.json({ success: true, practiceSheets: store.practiceSheets || [] });
});

// POST Create Practice Sheet (from Bank, with fallback Gemini generation)
app.post("/api/practice-sheets/create", async (req, res) => {
  const { title, subject, questionCount, difficulty, username, prompt } = req.body;
  if (!title || !subject) {
    return res.status(400).json({ error: "title and subject are required." });
  }

  const reqCount = parseInt(questionCount) || 5;
  const targetDifficulty = difficulty || "Medium";

  const store = getStore();
  if (!store.questionBank) store.questionBank = [];
  if (!store.practiceSheets) store.practiceSheets = [];

  // Filter existing questions from Question Bank matching this subject
  let matchedQuestions = store.questionBank.filter((q: any) => 
    q.subject.toLowerCase().trim() === subject.toLowerCase().trim()
  );

  // Optionally prioritize requested difficulty if available
  let selectedQuestions = matchedQuestions.filter((q: any) => q.difficulty === targetDifficulty);
  if (selectedQuestions.length < reqCount) {
    // Fill with any other difficulty in the same subject
    const otherDifficulty = matchedQuestions.filter((q: any) => q.difficulty !== targetDifficulty);
    selectedQuestions = [...selectedQuestions, ...otherDifficulty];
  }

  // Slice to requested count
  selectedQuestions = selectedQuestions.slice(0, reqCount);

  // If we don't have enough questions in the bank, generate the remaining count using Gemini!
  const remainingCount = reqCount - selectedQuestions.length;
  let newlyGeneratedQuestions: any[] = [];

  if (remainingCount > 0) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const systemInstruction = `You are 'Gemini Question Architect', an elite academic assessment designer.
Your job is to generate highly educational, accurate, and interesting test questions based on the subject and optional details.
Requirements:
1. Return a JSON object containing a "questions" array.
2. Each question in the array must have:
   - "questionText": The text of the question. Be clear and engaging.
   - "options": An array of 4 distinct multiple-choice option strings. Set to null or empty array if it's a short answer/subjective question.
   - "correctAnswer": The correct option string (matching exactly one item in options) or a clear, concise written answer/solution for open-ended questions.
   - "subject": Must match the subject specified ("${subject}").
   - "difficulty": Must be one of "Easy", "Medium", "Hard" (default to "${targetDifficulty}").
3. Generate exactly ${remainingCount} questions.`;

        const response = await callGeminiWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: `Generate questions for Subject: "${subject}". Difficulty: "${targetDifficulty}". Context/topic requests: "${prompt || "Standard assessment questions"}"`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionText: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      correctAnswer: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      difficulty: { type: Type.STRING }
                    },
                    required: ["questionText", "correctAnswer", "subject", "difficulty"]
                  }
                }
              },
              required: ["questions"]
            }
          }
        });

        const text = response.text;
        if (text) {
          const parsed = parseGeminiJson(text);
          const questionsList = parsed.questions || [];
          newlyGeneratedQuestions = questionsList.map((q: any, index: number) => ({
            id: "q_ai_" + Date.now() + "_" + index + "_" + Math.floor(Math.random() * 1000),
            questionText: q.questionText,
            options: q.options && q.options.length > 0 ? q.options : undefined,
            correctAnswer: q.correctAnswer,
            subject: q.subject || subject,
            difficulty: q.difficulty || targetDifficulty,
            createdAt: new Date().toISOString()
          }));

          // Add newly generated questions to the question bank database properly so they persist!
          store.questionBank.push(...newlyGeneratedQuestions);
        }
      } catch (err) {
        console.error("Error generating remaining questions with Gemini:", err);
      }
    }
  }

  const finalQuestions = [...selectedQuestions, ...newlyGeneratedQuestions];

  const newSheet = {
    id: "sheet_" + Date.now(),
    title: title.trim(),
    subject: subject.trim(),
    questions: finalQuestions,
    createdAt: new Date().toISOString(),
    createdBy: username || "anonymous"
  };

  store.practiceSheets.push(newSheet);
  saveStore(store);

  res.json({ success: true, practiceSheet: newSheet, store });
});

// POST Solve Practice Sheet
app.post("/api/practice-sheets/solve", (req, res) => {
  const { sheetId, solvedAnswers } = req.body;
  if (!sheetId || !solvedAnswers) {
    return res.status(400).json({ error: "sheetId and solvedAnswers are required." });
  }

  const store = getStore();
  if (!store.practiceSheets) store.practiceSheets = [];

  const sheet = store.practiceSheets.find((s: any) => s.id === sheetId);
  if (!sheet) {
    return res.status(404).json({ error: "Practice sheet not found." });
  }

  sheet.solvedAnswers = solvedAnswers;
  sheet.solvedAt = new Date().toISOString();
  saveStore(store);

  res.json({ success: true, practiceSheet: sheet, store });
});

// PUT (Edit) Question in Bank
app.put("/api/question-bank/:id", (req, res) => {
  const { id } = req.params;
  const { questionText, options, correctAnswer, subject, difficulty } = req.body;

  const store = getStore();
  if (!store.questionBank) store.questionBank = [];
  if (!store.practiceSheets) store.practiceSheets = [];

  const questionIdx = store.questionBank.findIndex((q: any) => q.id === id);
  if (questionIdx === -1) {
    return res.status(404).json({ error: "Question not found in bank." });
  }

  // Update question in bank
  const updatedQuestion = {
    ...store.questionBank[questionIdx],
    questionText: questionText !== undefined ? questionText : store.questionBank[questionIdx].questionText,
    options: options !== undefined ? options : store.questionBank[questionIdx].options,
    correctAnswer: correctAnswer !== undefined ? correctAnswer : store.questionBank[questionIdx].correctAnswer,
    subject: subject !== undefined ? subject.trim() : store.questionBank[questionIdx].subject,
    difficulty: difficulty !== undefined ? difficulty : store.questionBank[questionIdx].difficulty,
  };

  store.questionBank[questionIdx] = updatedQuestion;

  // Propagate updates to questions inside sheets
  store.practiceSheets.forEach((sheet: any) => {
    if (sheet.questions) {
      const idx = sheet.questions.findIndex((q: any) => q.id === id);
      if (idx !== -1) {
        sheet.questions[idx] = {
          ...sheet.questions[idx],
          ...updatedQuestion
        };
      }
    }
  });

  saveStore(store);
  res.json({ success: true, question: updatedQuestion, store });
});

// DELETE Question in Bank
app.delete("/api/question-bank/:id", (req, res) => {
  const { id } = req.params;

  const store = getStore();
  if (!store.questionBank) store.questionBank = [];

  const originalLength = store.questionBank.length;
  store.questionBank = store.questionBank.filter((q: any) => q.id !== id);

  if (store.questionBank.length === originalLength) {
    return res.status(404).json({ error: "Question not found in bank." });
  }

  saveStore(store);
  res.json({ success: true, store });
});

// PUT (Edit) Practice Sheet
app.put("/api/practice-sheets/:id", (req, res) => {
  const { id } = req.params;
  const { title, subject, questions } = req.body;

  const store = getStore();
  if (!store.practiceSheets) store.practiceSheets = [];

  const sheet = store.practiceSheets.find((s: any) => s.id === id);
  if (!sheet) {
    return res.status(404).json({ error: "Practice sheet not found." });
  }

  if (title !== undefined) sheet.title = title.trim();
  if (subject !== undefined) sheet.subject = subject.trim();
  if (questions !== undefined) sheet.questions = questions;

  saveStore(store);
  res.json({ success: true, practiceSheet: sheet, store });
});

// DELETE Practice Sheet
app.delete("/api/practice-sheets/:id", (req, res) => {
  const { id } = req.params;

  const store = getStore();
  if (!store.practiceSheets) store.practiceSheets = [];

  const originalLength = store.practiceSheets.length;
  store.practiceSheets = store.practiceSheets.filter((s: any) => s.id !== id);

  if (store.practiceSheets.length === originalLength) {
    return res.status(404).json({ error: "Practice sheet not found." });
  }

  saveStore(store);
  res.json({ success: true, store });
});

// Serve frontend assets in production or development
async function startServer() {
  await initializeMongo();
  await loadCloudStoreAtStartup();


  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for React SPA
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    const connection: ClientConnection = { ws };
    clients.add(connection);

    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        switch (message.type) {
          case "join":
            connection.username = message.username;
            connection.fullName = message.fullName;
            connection.channel = message.channel || "global";
            broadcastToChannel(connection.channel, {
              type: "presence",
              username: connection.username,
              fullName: connection.fullName,
              status: "online"
            });
            break;

          case "typing":
            if (connection.channel) {
              broadcastToChannel(connection.channel, {
                type: "typing",
                username: connection.username || message.username,
                fullName: connection.fullName || message.fullName,
                isTyping: message.isTyping
              }, ws);
            }
            break;
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(connection);
      if (connection.username && connection.channel) {
        broadcastToChannel(connection.channel, {
          type: "presence",
          username: connection.username,
          fullName: connection.fullName,
          status: "offline"
        });
      }
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
