import React, { useState, useRef, useEffect } from "react";
import { AppStore, ChatMessage, UserAccount } from "../types";
import { 
  Sparkles, 
  Send, 
  Terminal, 
  User, 
  Cpu, 
  BookOpen, 
  CheckSquare, 
  Calendar, 
  PlusCircle, 
  HelpCircle, 
  ArrowRight,
  Flame,
  CheckCircle,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
  Paperclip,
  Image,
  Video,
  Phone,
  PhoneOff,
  Users,
  Lock,
  Settings,
  RefreshCw,
  FileText,
  X,
  PhoneCall,
  UserCheck,
  Shield,
  Activity,
  Download,
  ChevronLeft,
  Menu
} from "lucide-react";

interface GeminiChatWorkspaceProps {
  store: AppStore;
  onApplyMutations: (mutations: any) => Promise<void>;
  onUpdateStore?: (store: AppStore) => void;
  currentUser: UserAccount | null;
  onLogin: (user: UserAccount) => void;
  onUpdateProfile: (user: UserAccount) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenPublicResources?: () => void;
}

export default function GeminiChatWorkspace({ 
  store, 
  onApplyMutations, 
  onUpdateStore,
  currentUser, 
  onLogin, 
  onUpdateProfile,
  theme,
  onToggleTheme,
  onOpenPublicResources
}: GeminiChatWorkspaceProps) {

  
  // --- AUTH SELECTION STATES ---
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- CHAT SYSTEM STATES ---
  const [chatChannel, setChatChannel] = useState<string>("private_copilot"); // "private_copilot" (isolated per user) or "global" or groupId
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  
  const [typingUsers, setTypingUsers] = useState<{[username: string]: string}>({});
  const [isTypingState, setIsTypingState] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<any>(null);

  // --- VOICE & SPEECH STATES ---
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // --- FILE/PHOTO ATTACHMENT STATES ---
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    base64: string;
    isPhoto: boolean;
  } | null>(null);

  // --- WebRTC SIMULATION STATES ---
  const [activeCall, setActiveCall] = useState<{
    peer: UserAccount;
    status: "ringing" | "connected";
    isMuted: boolean;
    isVideoOff: boolean;
    duration: number;
  } | null>(null);
  const callCanvasRef = useRef<HTMLCanvasElement>(null);
  const ringtoneStopRef = useRef<boolean>(true);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested prompt list
  const suggestions = [
    "Add Class 10th syllabus",
    "Plan my day with Calculus study & gym",
    "Prioritize my task checklist",
    "Add high priority todo: Chemistry lab prep",
    "Schedule Physics study session for Tuesday"
  ];

  // Listen for Google OAuth callback message events from popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const loggedInUser = event.data.user;
        if (loggedInUser) {
          onLogin(loggedInUser);
        }
        setAuthLoading(false);
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        setAuthError(event.data.error || "Google sign-in failed.");
        setAuthLoading(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLogin]);

  // Load chat messages, user listings, and connect to Real-time WebSockets
  useEffect(() => {
    if (!currentUser) return;

    fetchMessages();
    fetchAllUsers();

    // 1. Setup real-time WebSocket subscription
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS Connected]");
      // Send register presence message
      ws.send(JSON.stringify({
        type: "join",
        username: currentUser.username,
        fullName: currentUser.fullName,
        channel: chatChannel
      }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === "new_message") {
          // Instantly append new message
          setMessages(prev => {
            if (prev.some(m => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });
        } else if (payload.type === "typing") {
          // Update typing users map
          setTypingUsers(prev => {
            const next = { ...prev };
            if (payload.isTyping) {
              next[payload.username] = payload.fullName;
            } else {
              delete next[payload.username];
            }
            return next;
          });
        } else if (payload.type === "presence") {
          // Update user lists when presence shifts
          fetchAllUsers();
        }
      } catch (err) {
        console.error("WS client msg error:", err);
      }
    };

    ws.onclose = () => {
      console.log("[WS Closed]");
    };

    // 2. Poll for messages as a fallback synchronization heartbeat
    const interval = setInterval(() => {
      fetchMessages();
    }, 4000);

    return () => {
      ws.close();
      wsRef.current = null;
      clearInterval(interval);
    };
  }, [currentUser, chatChannel]);

  // Handle active mock WebRTC animations
  useEffect(() => {
    let animationId: number;
    let secondsTimer: any;

    if (activeCall && activeCall.status === "connected") {
      // Connect Call Timer
      secondsTimer = setInterval(() => {
        setActiveCall(prev => {
          if (!prev) return null;
          return { ...prev, duration: prev.duration + 1 };
        });
      }, 1000);

      // Start Synthesized Video Streams on Canvas
      const canvas = callCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        let waveOffset = 0;
        let particles: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
        
        // Populate peer particles
        for (let i = 0; i < 40; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: Math.random() * 3 + 1,
            color: `rgba(${Math.floor(Math.random() * 100) + 100}, ${Math.floor(Math.random() * 100) + 120}, 255, 0.5)`
          });
        }

        const renderMockCall = () => {
          if (!ctx || !canvas) return;
          ctx.fillStyle = "#0f172a"; // Deep Slate Dark
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // DRAW GRID LINES
          ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
          ctx.lineWidth = 1;
          const gridSize = 40;
          for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // DRAW PEER MOCK DATA (PARTICLES & SILHOUETTE)
          if (!activeCall.isVideoOff) {
            particles.forEach(p => {
              p.x += p.vx;
              p.y += p.vy;
              if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
              if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.fill();
            });

            // Draw clean peer facial outline / connection network
            ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 50, 0, Math.PI * 2); // Head
            ctx.moveTo(canvas.width / 2 - 80, canvas.height / 2 + 100);
            ctx.bezierCurveTo(canvas.width / 2 - 60, canvas.height / 2 + 50, canvas.width / 2 + 60, canvas.height / 2 + 50, canvas.width / 2 + 80, canvas.height / 2 + 100);
            ctx.stroke();

            ctx.fillStyle = "#6366f1";
            ctx.font = "bold 13px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${activeCall.peer.fullName} (Secure WebRTC Channel)`, canvas.width / 2, canvas.height / 2 + 140);
          } else {
            ctx.fillStyle = "#ef4444";
            ctx.font = "12px monospace";
            ctx.textAlign = "center";
            ctx.fillText("PEER_VIDEO_STREAM_MUTED", canvas.width / 2, canvas.height / 2);
          }

          // DRAW VOICE AMPLITUDE SINE WAVE (Audio indicator)
          ctx.beginPath();
          ctx.strokeStyle = "#10b981"; // Emerald Green
          ctx.lineWidth = 3;
          waveOffset += 0.15;
          for (let i = 0; i < canvas.width; i++) {
            const amplitude = activeCall.isMuted ? 0 : 25 * Math.sin(i * 0.02 + waveOffset) * (Math.random() * 0.3 + 0.8);
            const y = (canvas.height - 40) + amplitude;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();

          // FLOATING PIP (OWN VIDEO CAMERA FEED)
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 2;
          ctx.fillRect(canvas.width - 130, 20, 110, 80);
          ctx.strokeRect(canvas.width - 130, 20, 110, 80);
          
          ctx.fillStyle = "#94a3b8";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Your Camera", canvas.width - 75, 55);

          // Moving waveform in Pip
          ctx.beginPath();
          ctx.strokeStyle = "#4f46e5";
          ctx.lineWidth = 1;
          ctx.moveTo(canvas.width - 120, 85);
          for (let k = 0; k < 90; k++) {
            ctx.lineTo(canvas.width - 120 + k, 85 + 6 * Math.sin(k * 0.1 + waveOffset * 1.5));
          }
          ctx.stroke();

          animationId = requestAnimationFrame(renderMockCall);
        };
        renderMockCall();
      }
    }

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(secondsTimer);
    };
  }, [activeCall]);

  const fetchMessages = async () => {
    try {
      const userParam = currentUser?.username ? `&user=${encodeURIComponent(currentUser.username)}` : "";
      const response = await fetch(`/api/chat/messages?channel=${chatChannel}${userParam}`, {
        headers: currentUser?.username ? { "x-user-id": currentUser.username } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Failed to load chat logs:", e);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm("Start a new study chat? This will clear your private copilot conversation history.")) return;
    try {
      const userParam = currentUser?.username ? `?user=${encodeURIComponent(currentUser.username)}` : "";
      const response = await fetch(`/api/chat/clear${userParam}`, {
        method: "POST",
        headers: currentUser?.username ? { "x-user-id": currentUser.username } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Failed to clear chat:", e);
    }
  };


  const fetchAllUsers = async () => {
    try {
      const response = await fetch("/api/auth/users");
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // --- ACCOUNT AUTH HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const apiRoute = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = authMode === "login" 
      ? { username: usernameInput, password: passwordInput }
      : { username: usernameInput, fullName: fullNameInput, password: passwordInput, bio: bioInput };

    try {
      const response = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onLogin(data.user);
      } else {
        setAuthError(data.error || "Authentication failed. Please verify credentials.");
      }
    } catch (err) {
      setAuthError("Could not connect to the authentication backend.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/google/url");
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to get Google sign-in URL");
      }
      const { url } = await res.json();

      // Open Google Login in popup window
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        "google_oauth_popup",
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        setAuthError("Popup was blocked! Please allow popups for this site to sign in with Google.");
        setAuthLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to start Google sign-in.");
      setAuthLoading(false);
    }
  };

  // --- EDIT PROFILE MODAL ---
  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          fullName: fullNameInput || currentUser.fullName,
          bio: bioInput || currentUser.bio,
          theme: theme
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onUpdateProfile(data.user);
        setProfileModalOpen(false);
        fetchAllUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);

    if (!currentUser) return;

    if (!isTypingState && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setIsTypingState(true);
      wsRef.current.send(JSON.stringify({
        type: "typing",
        username: currentUser.username,
        fullName: currentUser.fullName,
        isTyping: true
      }));
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setIsTypingState(false);
        wsRef.current.send(JSON.stringify({
          type: "typing",
          username: currentUser.username,
          fullName: currentUser.fullName,
          isTyping: false
        }));
      }
    }, 1500);
  };

  // --- DISPATCH MESSAGE TO SERVER (Triggering AI if targeted) ---
  const handleSendMessage = async (textToSend: string) => {
    if ((!textToSend.trim() && !attachedFile) || isSending || !currentUser) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setIsTypingState(false);
      wsRef.current.send(JSON.stringify({
        type: "typing",
        username: currentUser.username,
        fullName: currentUser.fullName,
        isTyping: false
      }));
    }

    setIsSending(true);
    setErrorMsg("");

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;
    let isPhoto = false;

    // Handle files uploads
    if (attachedFile) {
      try {
        const upRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: attachedFile.name,
            fileType: attachedFile.type,
            base64Data: attachedFile.base64
          })
        });
        const upData = await upRes.json();
        if (upRes.ok && upData.success) {
          fileUrl = upData.fileUrl;
          fileName = attachedFile.name;
          fileType = attachedFile.type;
          isPhoto = attachedFile.isPhoto;
        } else {
          throw new Error(upData.error || "File transfer rejected by node server");
        }
      } catch (err: any) {
        setErrorMsg(`Attachment error: ${err.message}`);
        setIsSending(false);
        return;
      }
    }

    try {
      const isMentionAi = chatChannel === "private_copilot" ||
                          textToSend.toLowerCase().includes("gemini") || 
                          textToSend.startsWith("/") || 
                          textToSend.toLowerCase().includes("@gemini");


      const userParam = currentUser?.username ? `?user=${encodeURIComponent(currentUser.username)}` : "";
      const response = await fetch(`/api/chat/message${userParam}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(currentUser?.username ? { "x-user-id": currentUser.username } : {})
        },
        body: JSON.stringify({
          sender: currentUser.username,
          senderFullName: currentUser.fullName,
          senderAvatar: currentUser.avatarUrl,
          text: textToSend.trim(),
          channel: chatChannel,
          activeUser: currentUser.username,
          triggerAi: isMentionAi,
          fileUrl,
          fileName,
          fileType,
          isPhoto,
          // Context parameters for Gemini
          storeContext: store
        })
      });


      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to post message");
      }

      const data = await response.json();
      if (data.success) {
        setInputValue("");
        setAttachedFile(null);
        await fetchMessages();

        if (data.store && onUpdateStore) {
          onUpdateStore(data.store);
        }

        // If Gemini returned state mutations, apply them to App.tsx
        if (data.aiMutations && Object.keys(data.aiMutations).length > 0) {
          await onApplyMutations(data.aiMutations);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong sending the message.");
    } finally {
      setIsSending(false);
    }
  };

  // --- AUDIO SYNTHESIS: WEBSPEECH TEXT TO SPEECH (TTS) ---
  const speakTextAloud = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_\-]/g, ""); // Strip markdown noise
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose appropriate voice if present
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // --- AUDIO RECOGNITION: WEBSPEECH SPEECH TO TEXT ---
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support the Web Speech Recognition API. Please try Google Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputValue(prev => {
          const space = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
          return prev + space + transcript;
        });
      };

      recognition.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // --- FILE SELECT HANDLER ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Demo file limit is 15MB. Please choose a smaller document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      const isPhoto = file.type.startsWith("image/");
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: base64String,
        isPhoto
      });
    };
    reader.readAsDataURL(file);
  };

  // --- WebRTC MOCK AUDIO GENERATOR (AUDIO CONTEXT SINE WAVE RINGING) ---
  const triggerAudioRingtone = (start: boolean) => {
    if (!start) {
      ringtoneStopRef.current = true;
      return;
    }

    ringtoneStopRef.current = false;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playPulse = () => {
        if (ringtoneStopRef.current) {
          ctx.close();
          return;
        }
        
        // Ringing frequencies combined (UK / standard dial pulse)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(400, ctx.currentTime);
        osc2.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();

        // Pulse decay
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);

        setTimeout(() => {
          playPulse();
        }, 3000);
      };
      playPulse();
    } catch (err) {
      console.error(err);
    }
  };

  // --- WebRTC CALL TRIGGERS ---
  const startPeerCall = (peer: UserAccount) => {
    if (!currentUser) return;
    triggerAudioRingtone(true); // Play Dial Tone
    setActiveCall({
      peer,
      status: "ringing",
      isMuted: false,
      isVideoOff: false,
      duration: 0
    });

    // Auto connect call in 3 seconds to simulate answers
    setTimeout(() => {
      setActiveCall(prev => {
        if (!prev || prev.peer.username !== peer.username) return prev;
        triggerAudioRingtone(false); // Stop Dial Tone
        // Play success chirp
        try {
          const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = actx.createOscillator();
          const gn = actx.createGain();
          osc.frequency.setValueAtTime(800, actx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.15);
          gn.gain.setValueAtTime(0.1, actx.currentTime);
          gn.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
          osc.connect(gn);
          gn.connect(actx.destination);
          osc.start();
          osc.stop(actx.currentTime + 0.2);
        } catch (e){}
        return { ...prev, status: "connected" };
      });
    }, 3200);
  };

  const endActiveCall = () => {
    triggerAudioRingtone(false);
    // Play hangup beep
    try {
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = actx.createOscillator();
      const gn = actx.createGain();
      osc.frequency.setValueAtTime(300, actx.currentTime);
      gn.gain.setValueAtTime(0.1, actx.currentTime);
      osc.connect(gn);
      gn.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.25);
    } catch (e){}
    setActiveCall(null);
  };

  // --- AUTH SCREEN RENDERING (When currentUser is null) ---
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 relative ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`} id="auth_portal">
        {/* HAMBURGER MENU ON LOGIN PAGE (Opens Public Resources & Announcement Blog) */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <button
            type="button"
            onClick={onOpenPublicResources}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-xs shadow-lg transition-all cursor-pointer ${
              theme === "dark"
                ? "bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border-indigo-500/30 hover:border-indigo-400"
                : "bg-white hover:bg-slate-50 text-indigo-700 border-slate-200"
            }`}
            title="Open Public Resources & Community Blog (No Login Required)"
          >
            <Menu className="w-4 h-4 text-indigo-500" />
            <span>📢 Public Resources &amp; Blog (Direct Access)</span>
          </button>
        </div>

        <div className={`w-full max-w-lg rounded-3xl border shadow-xl p-8 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          
          {/* HEADER BRAND */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 mb-4 animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Study Tracker Secure Port</h2>

            <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Pristine Multi-User Study Workspace</p>
          </div>

          {/* AUTH ERRORS */}
          {authError && (
            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-xs text-rose-400 mb-6 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* FORM PORT */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username / Email</label>
              <input
                type="text"
                placeholder="e.g. kanta123090@gmail.com"
                required
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"}`}
              />
            </div>

            {authMode === "signup" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kanta Patel"
                    required
                    value={fullNameInput}
                    onChange={e => setFullNameInput(e.target.value)}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Short Bio / Ambition</label>
                  <input
                    type="text"
                    placeholder="e.g. Preparing for medical entrance exams"
                    value={bioInput}
                    onChange={e => setBioInput(e.target.value)}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Account Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-800"}`}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-3 rounded-xl font-bold text-xs transition-all tracking-wider uppercase shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : authMode === "login" ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Secure Sign In
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" /> Initialize Account
                </>
              )}
            </button>
          </form>

          {/* TOGGLE AUTH MODE */}
          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setAuthMode(prev => prev === "login" ? "signup" : "login");
                setAuthError("");
              }}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer transition-colors"
            >
              {authMode === "login" ? "New here? Create your study identity" : "Already registered? Login to your account"}
            </button>
          </div>

          <div className="border-t border-slate-800/10 dark:border-slate-800 my-6" />

          <div className="space-y-3">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800/10 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Or continue with</span>
              <div className="flex-grow border-t border-slate-800/10 dark:border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className={`w-full flex items-center justify-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer ${theme === "dark" ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"}`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.64l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* THEME TOGGLE FROM AUTH SCREEN */}
          <div className="mt-6 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Need to adjust light comfort?</span>
            <button
              onClick={onToggleTheme}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${theme === "dark" ? "bg-slate-800 border-slate-700 text-yellow-400" : "bg-slate-100 border-slate-200 text-slate-700"}`}
            >
              {theme === "dark" ? "☀️ Light UI" : "🌙 Dark UI"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- LOGGED IN COMPLETE SOCIAL WORKSPACE ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="social_chat_hub">
      
      {/* =======================================================
          COLUMN 1: SOCIAL SIDEBAR (CHANNELS & ACTIVE STUDENTS) 
          ======================================================= */}
      <div className={`lg:col-span-3 flex flex-col rounded-3xl border overflow-hidden shadow-xs h-[55vh] sm:h-[650px] max-h-[80vh] lg:h-[75vh] min-h-[350px] sm:min-h-[500px] transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"} ${mobileView === "sidebar" ? "flex" : "hidden lg:flex"}`} id="social_sidebar">
        
        {/* CURRENT PROFILE BANNER */}
        <div className={`p-4 flex items-center justify-between border-b ${theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
          <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
            <img 
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
              alt="my avatar" 
              className="w-9 h-9 rounded-full border border-indigo-500/40 object-cover shrink-0"
            />
            <div className="truncate">
              <h4 className="font-bold text-xs truncate max-w-[100px] sm:max-w-[120px]">{currentUser.fullName}</h4>
              <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Active
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* MOBILE ONLY RETURN TO CHAT BUTTON */}
            <button
              onClick={() => setMobileView("chat")}
              className={`lg:hidden p-1.5 rounded-lg border hover:scale-105 transition-all cursor-pointer ${theme === "dark" ? "bg-slate-800 border-slate-700 text-indigo-400 hover:text-indigo-300" : "bg-white border-slate-200 text-indigo-600 hover:bg-slate-50"}`}
              title="Return to active group chat"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setFullNameInput(currentUser.fullName);
                setBioInput(currentUser.bio || "");
                setProfileModalOpen(true);
              }}
              className={`p-1.5 rounded-lg border hover:scale-105 transition-all cursor-pointer ${theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}
              title="Update Profile"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STUDY CHANNELS LIST */}
        <div className="p-4 border-b border-slate-800/10 dark:border-slate-800">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" /> Private &amp; Public Chats
          </span>
          <div className="space-y-1">
            {/* 1. Strictly Private 1-on-1 AI Copilot */}
            <button
              onClick={() => {
                setChatChannel("private_copilot");
                setMobileView("chat");
              }}
              className={`w-full text-left text-xs px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-between ${chatChannel === "private_copilot" ? "bg-indigo-600 text-white" : theme === "dark" ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
            >
              <span className="truncate">🔒 1-on-1 AI Copilot</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400">
                Private
              </span>
            </button>

            {/* 2. Global Public Discussion */}
            <button
              onClick={() => {
                setChatChannel("global");
                setMobileView("chat");
              }}
              className={`w-full text-left text-xs px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-between ${chatChannel === "global" ? "bg-indigo-600 text-white" : theme === "dark" ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
            >
              <span>🌎 Public Study Lounge</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400">Public</span>
            </button>


            {store.studyGroups.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  setChatChannel(group.id);
                  setMobileView("chat");
                }}
                className={`w-full text-left text-xs px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-between ${chatChannel === group.id ? "bg-indigo-600 text-white" : theme === "dark" ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
              >
                <span className="truncate max-w-[130px]">👥 {group.name}</span>
                <span className="text-[9px] opacity-70">room</span>
              </button>
            ))}
          </div>
        </div>

        {/* MEMBERS / P2P WebRTC CALL SECTION */}
        <div className="flex-1 overflow-y-auto p-4">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-500" /> WebRTC Calling Deck
          </span>
          <div className="space-y-2">
            {allUsers
              .filter(u => u.username !== currentUser.username)
              .map(user => (
                <div 
                   key={user.username} 
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${theme === "dark" ? "bg-slate-950/20 border-slate-800" : "bg-slate-50 border-slate-100"}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <img 
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.fullName)}`} 
                      alt="user" 
                      className="w-7 h-7 rounded-full border object-cover"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{user.fullName}</p>
                      <p className="text-[8px] text-slate-400 truncate">{user.username.split("@")[0]}</p>
                    </div>
                  </div>
                  
                  {/* WebRTC Video Call Trigger Button */}
                  <button
                    onClick={() => {
                      startPeerCall(user);
                      setMobileView("chat");
                    }}
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-all cursor-pointer hover:scale-105 shrink-0"
                    title={`Call ${user.fullName} via WebRTC`}
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>
                </div>
            ))}
            
            {allUsers.length <= 1 && (
              <p className="text-[10px] text-slate-500 text-center italic mt-2">Log in with other demo accounts in different tabs to start video chat rooms!</p>
            )}
          </div>
        </div>

      </div>

      {/* =======================================================
          COLUMN 2: CENTRAL INTERACTIVE CHAT & WORKSPACE 
          ======================================================= */}
      <div className={`lg:col-span-9 flex flex-col h-[55vh] sm:h-[650px] max-h-[80vh] lg:h-[75vh] min-h-[350px] sm:min-h-[500px] relative ${mobileView === "chat" ? "flex" : "hidden lg:flex"}`}>
        
        {/* WEBRTC OVERLAY PANEL (Renders on call) */}
        {activeCall && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 rounded-3xl p-6 flex flex-col justify-between border border-indigo-500/30 animate-scaleUp">
            
            {/* CALL METADATA */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 animate-pulse">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Secure Peer-to-Peer Calling</h3>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    {activeCall.status === "ringing" ? "Dialing Peer Host..." : `Connected • 00:${activeCall.duration.toString().padStart(2, "0")}`}
                  </p>
                </div>
              </div>

              {/* STATS DECK */}
              <div className="hidden sm:flex items-center gap-4 text-[9px] font-mono text-slate-400">
                <div className="text-right">
                  <p>LATENCY: <span className="text-emerald-400">12ms</span></p>
                  <p>PACKETS: <span className="text-emerald-400">100% loss-free</span></p>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-1 text-slate-300">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>AES_256_P2P</span>
                </div>
              </div>
            </div>

            {/* CALL VIDEO VIEWER */}
            <div className="flex-1 my-4 flex items-center justify-center relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              {activeCall.status === "ringing" ? (
                <div className="text-center space-y-4">
                  <img 
                    src={activeCall.peer.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(activeCall.peer.fullName)}`} 
                    alt="peer" 
                    className="w-20 h-20 rounded-full mx-auto border-2 border-indigo-500/50 object-cover animate-pulse"
                  />
                  <div>
                    <h4 className="font-bold text-md text-white">{activeCall.peer.fullName}</h4>
                    <p className="text-xs text-slate-400 italic">Waiting for connection confirmation...</p>
                  </div>
                </div>
              ) : (
                <canvas 
                  ref={callCanvasRef} 
                  className="w-full h-full object-cover max-h-[380px]"
                  width={640}
                  height={380}
                />
              )}
            </div>

            {/* CALL CONTROLS */}
            <div className="flex items-center justify-center gap-4 border-t border-slate-800 pt-4">
              <button
                onClick={() => setActiveCall(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null)}
                className={`p-3 rounded-full border transition-all cursor-pointer ${activeCall.isMuted ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-800 text-slate-200 border-slate-700"}`}
                title={activeCall.isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setActiveCall(prev => prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null)}
                className={`p-3 rounded-full border transition-all cursor-pointer ${activeCall.isVideoOff ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-800 text-slate-200 border-slate-700"}`}
                title={activeCall.isVideoOff ? "Turn Video On" : "Turn Video Off"}
              >
                {activeCall.isVideoOff ? <X className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              <button
                onClick={endActiveCall}
                className="p-3.5 bg-red-600 hover:bg-red-500 rounded-full text-white transition-all shadow-lg shadow-red-600/20 cursor-pointer"
                title="Hang up"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>

          </div>
        )}

        {/* NORMAL CHAT FRAME */}
        <div className={`flex flex-col h-full rounded-3xl border overflow-hidden shadow-sm transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`} id="chat_frame">
          
          {/* CONSOLE HEADER */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-4 sm:px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3 truncate flex-1 mr-2">
              {/* MOBILE SHOW-SIDEBAR BUTTON */}
              <button
                onClick={() => setMobileView("sidebar")}
                className="lg:hidden p-2 -ml-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 transition-all mr-1 shrink-0"
                title="View All Group Rooms & Call Deck"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm tracking-wide truncate">
                  {chatChannel === "private_copilot" 
                    ? "🔒 1-on-1 AI Study Copilot (Private)" 
                    : chatChannel === "global" 
                    ? "🌎 Public Study Lounge" 
                    : `Room: ${store.studyGroups.find(g => g.id === chatChannel)?.name || "Group Study"}`}
                </h3>
                <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase truncate">
                  {chatChannel === "private_copilot" 
                    ? "Strictly private & confidential to your account" 
                    : chatChannel === "global" 
                    ? "Public discussion • Say 'gemini' to prompt" 
                    : "P2P Group Session Shared"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chatChannel === "private_copilot" && (
                <button
                  onClick={handleClearChat}
                  className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Clear history and start fresh chat"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>New Chat</span>
                </button>
              )}
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                {chatChannel === "private_copilot" ? "ISOLATED" : "SECURE"}
              </span>
            </div>
          </div>


          {/* MESSAGES VIEWPORT */}
          <div ref={viewportRef} className={`flex-1 overflow-y-auto p-6 flex flex-col gap-5 ${theme === "dark" ? "bg-slate-900/40" : "bg-slate-50/20"}`} id="chat_viewport">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto p-4">
                <Cpu className="w-10 h-10 text-indigo-500 animate-pulse mb-3" />
                <p className="text-xs font-bold">Workspace Feed Active</p>
                <p className="text-[10px] text-slate-400 mt-1">This is a fresh channel. Start the conversation or request Gemini to write a multi-subject syllabus!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === currentUser.username;
                const isAi = m.sender === "gemini";
                
                return (
                  <div 
                    key={m.id} 
                    className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    id={`chat_message_${m.id}`}
                  >
                    {/* AVATAR */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isMe 
                        ? "bg-indigo-600 text-white border-indigo-700" 
                        : isAi 
                          ? "bg-slate-950 text-indigo-400 border-indigo-950"
                          : "bg-slate-800 text-slate-200 border-slate-750"
                    }`}>
                      {isAi ? <Cpu className="w-4 h-4 text-indigo-400" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* BUBBLE CONTENT */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[10px] font-bold text-slate-400">{m.senderFullName}</span>
                        <span className="text-[8px] text-slate-500">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed transition-colors ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-sm"
                          : theme === "dark"
                            ? "bg-slate-850 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                            : "bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm"
                      }`}>
                        {/* Display message body */}
                        <p className="whitespace-pre-line font-medium">{m.text}</p>

                        {/* Inline attached photo rendering */}
                        {m.fileUrl && m.isPhoto && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-indigo-500/20 max-w-sm">
                            <img 
                              src={m.fileUrl} 
                              alt={m.fileName || "shared attachment"} 
                              className="w-full h-auto max-h-[220px] object-cover hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="p-1.5 bg-slate-950/60 text-[9px] flex items-center justify-between text-slate-300">
                              <span className="truncate">{m.fileName}</span>
                              <a href={m.fileUrl} download={m.fileName} className="text-indigo-400 hover:underline flex items-center gap-0.5">
                                <Download className="w-3 h-3" /> Save
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Inline attached text/PDF document file block */}
                        {m.fileUrl && !m.isPhoto && (
                          <div className={`mt-3 p-3 rounded-xl flex items-center justify-between gap-3 border ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                              <div className="truncate">
                                <p className="font-bold text-[10px] truncate">{m.fileName}</p>
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider">File Attachment</p>
                              </div>
                            </div>
                            <a 
                              href={m.fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shrink-0"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>

                      {/* VOICE SPEAKER INDICATOR / TTS CONTROL */}
                      <div className="flex items-center gap-2 px-1">
                        <button
                          onClick={() => speakTextAloud(m.id, m.text)}
                          className={`text-[9px] font-bold flex items-center gap-1 transition-colors ${speakingMessageId === m.id ? "text-emerald-500 animate-pulse" : "text-slate-400 hover:text-indigo-400"}`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{speakingMessageId === m.id ? "Speaking..." : "Read out loud"}</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}

            {/* AI THINKING LOADING */}
            {isSending && (
              <div className="flex gap-3 max-w-[85%] mr-auto" id="loading_reply_bubble">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-slate-950 text-indigo-400 border-slate-950 animate-pulse">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                </div>
                <div className={`p-4 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 shadow-xs border ${theme === "dark" ? "bg-slate-850 border-slate-800" : "bg-white border-slate-100"}`}>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                  <span className="ml-1 font-semibold text-slate-400">Gemini is rewriting study state...</span>
                </div>
              </div>
            )}

            {/* TYPING INDICATOR */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400 italic px-2 animate-pulse py-1" id="typing_status">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                <span>
                  {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length === 1 ? "is typing..." : "are typing..."}
                </span>
              </div>
            )}

          </div>

          {/* BOTTOM INTERACTIVE TYPING BOX */}
          <div className={`p-3 sm:p-4 border-t ${theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-150"}`} id="chat_input_panel">
            
            {/* INLINE ATTACHMENT STATUS */}
            {attachedFile && (
              <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs mb-3 animate-fadeIn ${theme === "dark" ? "bg-slate-900 border-indigo-950 text-slate-300" : "bg-indigo-50/50 border-indigo-100 text-slate-700"}`}>
                <div className="flex items-center gap-2 truncate">
                  {attachedFile.isPhoto ? <Image className="w-4 h-4 text-indigo-500 shrink-0" /> : <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />}
                  <span className="font-bold truncate">{attachedFile.name}</span>
                  <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Ready</span>
                </div>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-400 mb-3 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* DISPATCH ATTACHMENT TRIGGERS */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,text/*,application/pdf"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className={`p-2.5 sm:p-3 rounded-xl border hover:scale-105 transition-all cursor-pointer text-slate-400 shrink-0 ${theme === "dark" ? "bg-slate-850 border-slate-800 hover:border-slate-700 hover:text-white" : "bg-white border-slate-200 hover:border-slate-300 hover:text-slate-800"}`}
                title="Attach study photo or text documents"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* VOICE REC DICTATION BUTTON */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shrink-0 ${isListening ? "bg-red-500 text-white border-red-600 animate-pulse scale-110" : theme === "dark" ? "bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-800"}`}
                title="Dictate with Speech-to-Text"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* INPUT BAR */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }} 
                className="flex-1 flex gap-1.5 sm:gap-2 min-w-0"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={chatChannel === "global" ? "Ask Gemini study copilot..." : `Group chat...`}
                  className={`flex-1 min-w-0 text-xs p-2.5 sm:p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-inner ${theme === "dark" ? "bg-slate-850 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500" : "bg-white border-slate-150 text-slate-800 placeholder-slate-400 focus:border-indigo-500"}`}
                  disabled={isSending}
                  required={!attachedFile}
                />
                <button
                  type="submit"
                  disabled={isSending || (!inputValue.trim() && !attachedFile)}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>

      {/* =======================================================
          MODAL: PROFILE MANAGEMENT 
          ======================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-55 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}>
            <div className="flex items-center justify-between border-b border-slate-800/10 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-500" /> Manage Study Identity
              </h3>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Your Full Display Name</label>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={e => setFullNameInput(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${theme === "dark" ? "bg-slate-850 border-slate-750 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bio / Aspirations</label>
                <textarea
                  rows={3}
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${theme === "dark" ? "bg-slate-850 border-slate-750 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                  placeholder="Tell your peer group what you are preparing for..."
                />
              </div>

              <div className="bg-slate-950/20 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-800/10 dark:border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-300 block mb-0.5">Avatar Generation:</span>
                Your unique avatar is programmatically generated based on your display name seeds. Give it a creative seed in the text field above to shift your image profile!
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className={`flex-1 p-2.5 rounded-xl border font-bold text-xs cursor-pointer text-center ${theme === "dark" ? "bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-750" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer text-center"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
