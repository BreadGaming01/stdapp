import React, { useState, useEffect } from "react";
import { 
  AppStore, 
  Todo, 
  CourseSyllabus, 
  PomodoroRecord, 
  StudyGroup, 
  ExamCountdown, 
  DailyPlanner as PlannerType,
  Class10Chapter,
  SchoolHomework,
  PreviousBacklog,
  MasterStudyPlan
} from "./types";
import DailyPlanner from "./components/DailyPlanner";
import PomodoroTimer from "./components/PomodoroTimer";
import SyllabusManager from "./components/SyllabusManager";
import TodoList from "./components/TodoList";
import StudyGroups from "./components/StudyGroups";
import ExamCountdowns from "./components/ExamCountdowns";
import GeminiChatWorkspace from "./components/GeminiChatWorkspace";
import AnnouncementsBoard from "./components/AnnouncementsBoard";
import ParallelCoWatch from "./components/ParallelCoWatch";
import PracticeSheetMaker from "./components/PracticeSheetMaker";
import Class10SyllabusTracker from "./components/Class10SyllabusTracker";
import Class10MasterPlanner from "./components/Class10MasterPlanner";
import StudentProfileSwitcher from "./components/StudentProfileSwitcher";
import FinalDaywiseTodoCenter from "./components/FinalDaywiseTodoCenter";
import PublicResourcesModal from "./components/PublicResourcesModal";
import { DEFAULT_CLASS10_SYLLABUS } from "./data/class10Syllabus";
import { 
  Clock, 
  BookOpen, 
  CheckSquare, 
  Users, 
  CalendarDays, 
  BellRing, 
  RotateCcw, 
  Sparkles, 
  Award, 
  Flame, 
  CheckCircle2, 
  Loader2,
  MessageSquare,
  Megaphone,
  Tv,
  BrainCircuit,
  GraduationCap,
  Menu
} from "lucide-react";

export default function App() {
  const [store, setStore] = useState<AppStore | null>(null);
  const [activeTab, setActiveTab] = useState<"planner" | "syllabus" | "todo" | "chat" | "pomodoro" | "groups" | "countdowns" | "announcements" | "lectures" | "practice">("planner");
  const [plannerViewMode, setPlannerViewMode] = useState<"final_daywise" | "master" | "daily">("final_daywise");
  const [syllabusViewMode, setSyllabusViewMode] = useState<"class10" | "custom">("class10");
  const [isPublicResourcesOpen, setIsPublicResourcesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("study_theme");
    return (saved as "light" | "dark") || "dark";
  });


  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem("study_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    // Default student profile for immediate seamless usage
    return {
      username: "aarav_sharma",
      fullName: "Aarav Sharma",
      bio: "Class 10th CBSE Student • Aiming for 95%+",
      avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Aarav",
      theme: "dark",
      status: "online"
    };
  });

  useEffect(() => {
    localStorage.setItem("study_theme", theme);
  }, [theme]);

  const handleLogin = (user: any) => {
    handleSwitchUser(user);
  };

  const handleSwitchUser = async (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("study_user", JSON.stringify(user));
    if (user.theme) {
      setTheme(user.theme);
    }
    await fetchStore(user.username);
  };

  const handleLogout = async () => {
    if (currentUser?.username) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser.username })
        });
      } catch (e) {
        console.error(e);
      }
    }
    const guestStudent = {
      username: "guest_student",
      fullName: "Guest Student",
      bio: "Class 10th CBSE",
      avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Guest",
      theme: "dark",
      status: "online"
    };
    setCurrentUser(guestStudent);
    localStorage.setItem("study_user", JSON.stringify(guestStudent));
    await fetchStore(guestStudent.username);
  };

  const handleUpdateProfileLocal = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("study_user", JSON.stringify(updatedUser));
    if (updatedUser.theme) {
      setTheme(updatedUser.theme);
    }
  };

  const getUserQuery = (targetUser?: string) => {
    const u = targetUser || currentUser?.username || "default_student";
    return `?user=${encodeURIComponent(u)}`;
  };

  // Load the initial store from the Express backend
  useEffect(() => {
    fetchStore();
    // Simple polling to sync common messages & chat (every 4 seconds)
    const interval = setInterval(() => {
      syncStoreOnly();
    }, 4000);
    return () => clearInterval(interval);
  }, [currentUser?.username]);

  const syncStoreOnly = async () => {
    try {
      const response = await fetch(`/api/store${getUserQuery()}`);
      if (response.ok) {
        const data = await response.json();
        setStore(prev => {
          if (!prev) return data;
          // Overlay updates while keeping active local UI state
          return { ...prev, ...data };
        });
      }
    } catch (error) {
      // quiet sync error
    }
  };

  const fetchStore = async (targetUser?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/store${getUserQuery(targetUser)}`);
      if (response.ok) {
        const data = await response.json();
        setStore(data);
      }
    } catch (error) {
      console.error("Failed to load store:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generic helper to update store state and save back to Express server
  const saveStoreUpdate = async (updatedFields: Partial<AppStore>) => {
    if (!store) return;
    const newStore = { ...store, ...updatedFields };
    // Optimistic UI update
    setStore(newStore);
    
    try {
      await fetch(`/api/store${getUserQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedFields,
          activeUser: currentUser?.username || "default_student"
        })
      });
    } catch (error) {
      console.error("Failed to save store update to server:", error);
    }
  };

  // Reset store back to initial default values
  const handleResetStore = async () => {
    if (!window.confirm("Are you sure you want to reset all study data and reload defaults?")) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/store/reset", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setStore(data.store);
        setActiveTab("planner");
      }
    } catch (error) {
      console.error("Failed to reset database store:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- STATE SETTERS PROXIED TO SAVE UTILITY ---
  
  const handleAddTodo = (todo: Todo) => {
    if (!store) return;
    saveStoreUpdate({ todos: [...store.todos, todo] });
  };

  const handleToggleTodo = (id: string) => {
    if (!store) return;
    const updated = store.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveStoreUpdate({ todos: updated });
  };

  const handleDeleteTodo = (id: string) => {
    if (!store) return;
    const updated = store.todos.filter(t => t.id !== id);
    saveStoreUpdate({ todos: updated });
  };

  const handleUpdatePriorities = (updates: { id: string; priority: "High" | "Medium" | "Low"; reasoning?: string }[]) => {
    if (!store) return;
    const updatedTodos = store.todos.map(todo => {
      const update = updates.find(u => u.id === todo.id);
      if (update) {
        return {
          ...todo,
          priority: update.priority,
          reasoning: update.reasoning
        };
      }
      return todo;
    });
    saveStoreUpdate({ todos: updatedTodos });
  };

  const handleAddCourse = (course: CourseSyllabus) => {
    if (!store) return;
    // Add syllabus course
    const nextSyllabus = [...store.syllabus, course];
    // Auto add an exam countdown if it has an exam date
    const nextCountdowns = [...store.countdowns];
    if (course.examDate) {
      const alreadyExists = nextCountdowns.some(c => c.id === `${course.id}-count`);
      if (!alreadyExists) {
        nextCountdowns.push({
          id: `${course.id}-count`,
          title: `${course.courseName} Exam`,
          examDate: `${course.examDate}T09:00:00.000Z`,
          subject: course.courseName
        });
      }
    }
    saveStoreUpdate({ syllabus: nextSyllabus, countdowns: nextCountdowns });
  };

  const handleUpdateCourseTopics = (courseId: string, topics: any[]) => {
    if (!store) return;
    const updated = store.syllabus.map(c => c.id === courseId ? { ...c, topics } : c);
    saveStoreUpdate({ syllabus: updated });
  };

  const handleDeleteCourse = (courseId: string) => {
    if (!store) return;
    const updatedSyllabus = store.syllabus.filter(c => c.id !== courseId);
    const updatedCountdowns = store.countdowns.filter(c => c.id !== `${courseId}-count`);
    saveStoreUpdate({ syllabus: updatedSyllabus, countdowns: updatedCountdowns });
  };

  const handleAddPomodoroRecord = (record: PomodoroRecord) => {
    if (!store) return;
    saveStoreUpdate({ pomodoros: [...store.pomodoros, record] });
  };

  const handleUpdateStudyGroup = (updatedGroup: StudyGroup) => {
    if (!store) return;
    const updated = store.studyGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    saveStoreUpdate({ studyGroups: updated });
  };

  const handleAddStudyGroup = (newGroup: StudyGroup) => {
    if (!store) return;
    saveStoreUpdate({ studyGroups: [...store.studyGroups, newGroup] });
  };

  const handleAddCountdown = (countdown: ExamCountdown) => {
    if (!store) return;
    saveStoreUpdate({ countdowns: [...store.countdowns, countdown] });
  };

  const handleDeleteCountdown = (id: string) => {
    if (!store) return;
    const updated = store.countdowns.filter(c => c.id !== id);
    saveStoreUpdate({ countdowns: updated });
  };

  const handleUpdatePlanner = (updatedPlanner: PlannerType) => {
    saveStoreUpdate({ planner: updatedPlanner });
  };

  const handleUpdateClass10Chapter = (subjectId: string, chapterId: string, updates: Partial<Class10Chapter>) => {
    if (!store) return;
    const currentSyllabus = store.class10Syllabus && store.class10Syllabus.length > 0 
      ? store.class10Syllabus 
      : DEFAULT_CLASS10_SYLLABUS;

    const updated = currentSyllabus.map(sub => {
      if (sub.id !== subjectId) return sub;
      const updatedChapters = sub.chapters.map(ch => {
        if (ch.id === chapterId) {
          return { ...ch, ...updates };
        }
        return ch;
      });
      return { ...sub, chapters: updatedChapters };
    });

    saveStoreUpdate({ class10Syllabus: updated });
  };

  const handleUpdateHomework = (homework: SchoolHomework[]) => {
    if (!store) return;
    saveStoreUpdate({ homework });
  };

  const handleUpdateBacklogs = (backlogs: PreviousBacklog[]) => {
    if (!store) return;
    saveStoreUpdate({ backlogs });
  };

  const handleUpdateMasterPlan = (masterPlan: MasterStudyPlan | null) => {
    if (!store) return;
    saveStoreUpdate({ masterPlan });
  };

  const handleApplyAiMutations = async (mutations: any) => {
    if (!store || !mutations) return;

    let nextSyllabus = [...store.syllabus];
    let nextTodos = [...store.todos];
    let nextCountdowns = [...store.countdowns];
    let nextPlanner = { ...store.planner };
    let nextStudyGroups = [...store.studyGroups];

    let changed = false;

    if (mutations.addSyllabus && Array.isArray(mutations.addSyllabus) && mutations.addSyllabus.length > 0) {
      mutations.addSyllabus.forEach((course: any) => {
        if (!nextSyllabus.some(c => c.id === course.id || c.courseName.toLowerCase() === course.courseName.toLowerCase())) {
          nextSyllabus.push(course);
          changed = true;
        }
      });
    }

    if (mutations.addTodos && Array.isArray(mutations.addTodos) && mutations.addTodos.length > 0) {
      mutations.addTodos.forEach((todo: any) => {
        if (!nextTodos.some(t => t.id === todo.id || t.title.toLowerCase() === todo.title.toLowerCase())) {
          nextTodos.push(todo);
          changed = true;
        }
      });
    }

    if (mutations.addCountdowns && Array.isArray(mutations.addCountdowns) && mutations.addCountdowns.length > 0) {
      mutations.addCountdowns.forEach((cd: any) => {
        if (!nextCountdowns.some(c => c.id === cd.id || c.title.toLowerCase() === cd.title.toLowerCase())) {
          nextCountdowns.push(cd);
          changed = true;
        }
      });
    }

    if (mutations.updatePlanner && typeof mutations.updatePlanner === "object") {
      nextPlanner = mutations.updatePlanner;
      changed = true;
    }

    if (mutations.addGroupSession && typeof mutations.addGroupSession === "object") {
      const { groupId, session } = mutations.addGroupSession;
      nextStudyGroups = nextStudyGroups.map(g => {
        if (g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase()) {
          const sessions = g.sessions || [];
          if (!sessions.some(s => s.id === session.id)) {
            return { ...g, sessions: [...sessions, session] };
          }
        }
        return g;
      });
      changed = true;
    }

    if (mutations.addGroupNote && typeof mutations.addGroupNote === "object") {
      const { groupId, note } = mutations.addGroupNote;
      nextStudyGroups = nextStudyGroups.map(g => {
        if (g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase()) {
          const notes = g.notes || [];
          if (!notes.some(n => n.id === note.id)) {
            return { ...g, notes: [...notes, note] };
          }
        }
        return g;
      });
      changed = true;
    }

    if (mutations.prioritizeTodos) {
      try {
        const response = await fetch("/api/gemini/prioritize-todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ todos: nextTodos, currentDate: new Date().toISOString().split("T")[0] })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.updates)) {
            nextTodos = nextTodos.map(todo => {
              const update = data.updates.find((u: any) => u.id === todo.id);
              if (update) {
                return { ...todo, priority: update.priority, reasoning: update.reasoning };
              }
              return todo;
            });
            changed = true;
          }
        }
      } catch (err) {
        console.error("AI prioritization failed inside chat mutation:", err);
      }
    }

    if (changed) {
      await saveStoreUpdate({
        syllabus: nextSyllabus,
        todos: nextTodos,
        countdowns: nextCountdowns,
        planner: nextPlanner,
        studyGroups: nextStudyGroups
      });
    }
  };

  // --- STATS / KPIS FOR THE OVERVIEW BAR ---
  const completedTodosCount = store?.todos.filter(t => t.completed).length || 0;
  const totalTodosCount = store?.todos.length || 0;
  const focusTimeCompleted = store?.pomodoros
    .filter(p => p.type === "work" && p.completed)
    .reduce((acc, p) => acc + p.durationMinutes, 0) || 0;

  const class10SyllabusData = store?.class10Syllabus && store.class10Syllabus.length > 0 
    ? store.class10Syllabus 
    : DEFAULT_CLASS10_SYLLABUS;

  let totalClass10Chapters = 0;
  let completedClass10Chapters = 0;
  let partialClass10Chapters = 0;
  let remainingClass10Chapters = 0;
  let competencyDoneChapters = 0;

  class10SyllabusData.forEach(sub => {
    sub.chapters.forEach(ch => {
      totalClass10Chapters++;
      if (ch.status === "Completely Done") completedClass10Chapters++;
      else if (ch.status === "Partially Done") partialClass10Chapters++;
      else remainingClass10Chapters++;
      if (ch.competencyDone) competencyDoneChapters++;
    });
  });

  const class10ProgressPercent = totalClass10Chapters > 0
    ? Math.round(((completedClass10Chapters + partialClass10Chapters * 0.5) / totalClass10Chapters) * 100)
    : 0;

  const pendingHomeworkCount = store?.homework?.filter(h => !h.completed).length || 0;
  const pendingBacklogsCount = store?.backlogs?.filter(b => !b.completed).length || 0;

  if (isLoading || !store) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading Student Study Hub...</p>
      </div>
    );
  }

  const coursesList = store.syllabus.map(c => c.courseName);

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`} id="app_root">
      {/* GLOBAL BANNER HEADER */}
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 shadow-sm ${theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`} id="app_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md sm:text-lg font-bold tracking-tight">CBSE Class 10 Study Hub</h1>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  5 Subjects Master Planner
                </span>
              </div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Maths • Science • SST • English • Hindi A
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* PUBLIC RESOURCES & COMMUNITY BLOG HAMBURGER BUTTON (DIRECT ACCESS WITHOUT LOGIN) */}
            <button
              onClick={() => setIsPublicResourcesOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                theme === "dark" 
                  ? "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40" 
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
              }`}
              title="Open Public Resources & Community Blog (Viewable Directly Without Login)"
            >
              <Menu className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">📢 Public Resources &amp; Blog</span>
              <span className="sm:hidden">📢 Resources</span>
            </button>

            {/* LIGHT/DARK TOGGLE BUTTON */}
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className={`p-2 rounded-xl transition-all border text-xs cursor-pointer ${theme === "dark" ? "bg-slate-850 hover:bg-slate-800 text-yellow-400 border-slate-750" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"}`}
              title="Toggle Dark/Light Mode"
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>


            {/* STUDENT PROFILE & ACCOUNT SWITCHER */}
            <StudentProfileSwitcher
              currentUser={currentUser}
              accounts={store.accounts || []}
              onSwitchUser={handleSwitchUser}
              onLogout={handleLogout}
              theme={theme}
            />

            {/* DEV RESET BUTTON */}
            <button
              onClick={handleResetStore}
              className={`hidden md:flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${theme === "dark" ? "bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750" : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"}`}
              title="Reset Personal Study Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset My Data
            </button>
          </div>
        </div>
      </header>

      {/* QUICK STATUS BAR */}
      <section className={`border-b py-4 transition-colors duration-300 ${theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-slate-100/50 border-slate-100"}`} id="quick_status_bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Class 10 Syllabus</p>
                <h4 className={`text-xs sm:text-sm font-bold truncate ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {class10ProgressPercent}% ({completedClass10Chapters}/{totalClass10Chapters} done)
                </h4>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">School Homework</p>
                <h4 className={`text-xs sm:text-sm font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {pendingHomeworkCount} pending assignments
                </h4>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Past Backlogs</p>
                <h4 className={`text-xs sm:text-sm font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {pendingBacklogsCount} topics to clear
                </h4>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Personal Todos</p>
                <h4 className={`text-xs sm:text-sm font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  {completedTodosCount}/{totalTodosCount} tasks
                </h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* TAB CONTROLS */}
        <div className={`flex border-b overflow-x-auto gap-4 mb-8 pb-1 scrollbar-none transition-colors duration-300 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`} id="dashboard_tabs">
          <button
            onClick={() => setActiveTab("planner")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "planner" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-indigo-500" />
            <span>Class 10 AI Master Planner</span>
            {(pendingHomeworkCount + pendingBacklogsCount) > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                {pendingHomeworkCount + pendingBacklogsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("syllabus")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "syllabus" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Class 10 Syllabus Audit</span>
          </button>

          <button
            onClick={() => setActiveTab("todo")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "todo" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CheckSquare className="w-4 h-4 text-cyan-500" />
            <span>Personal Tasks ({store.todos.filter(t => !t.completed).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "chat" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-purple-500" />
            AI Study Copilot &amp; Chats
          </button>
          
          <button
            onClick={() => setActiveTab("pomodoro")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "pomodoro" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pomodoro Focus
          </button>

          <button
            onClick={() => setActiveTab("groups")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "groups" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Collaborative Groups
          </button>

          <button
            onClick={() => setActiveTab("countdowns")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "countdowns" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BellRing className="w-4 h-4" />
            Exam Countdowns
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "announcements" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            📢 Snippets &amp; Public Board
          </button>

          <button
            onClick={() => setActiveTab("lectures")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "lectures" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Tv className="w-4 h-4 text-indigo-500" />
            🎥 Watch &amp; Learn Arena
          </button>

          <button
            onClick={() => setActiveTab("practice")}
            className={`py-3 px-4 text-xs font-bold shrink-0 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "practice" 
                ? "border-indigo-600 text-indigo-500" 
                : theme === "dark" ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-violet-500" />
            🧠 Practice &amp; Questions
          </button>
        </div>

        {/* TAB ACTIVE VIEWPORT */}
        <div className="animate-fadeIn" id="dashboard_viewport">
          {activeTab === "planner" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPlannerViewMode("final_daywise")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      plannerViewMode === "final_daywise"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>🎯 Final Day-Wise Todo &amp; AI Action Center</span>
                  </button>

                  <button
                    onClick={() => setPlannerViewMode("master")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      plannerViewMode === "master"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>📅 Master Study Plan Generator</span>
                  </button>

                  <button
                    onClick={() => setPlannerViewMode("daily")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      plannerViewMode === "daily"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>⏱️ Hourly Daily Agenda</span>
                  </button>
                </div>
              </div>

              {plannerViewMode === "final_daywise" ? (
                <FinalDaywiseTodoCenter
                  todos={store.todos || []}
                  homework={store.homework || []}
                  backlogs={store.backlogs || []}
                  masterPlan={store.masterPlan || null}
                  onToggleTodo={handleToggleTodo}
                  onUpdateHomework={handleUpdateHomework}
                  onUpdateBacklogs={handleUpdateBacklogs}
                  onUpdateMasterPlan={handleUpdateMasterPlan}
                  onRefreshStore={() => fetchStore()}
                  theme={theme}
                  currentUser={currentUser}
                />
              ) : plannerViewMode === "master" ? (
                <Class10MasterPlanner
                  syllabus={store.class10Syllabus && store.class10Syllabus.length > 0 ? store.class10Syllabus : DEFAULT_CLASS10_SYLLABUS}
                  homework={store.homework || []}
                  backlogs={store.backlogs || []}
                  masterPlan={store.masterPlan || null}
                  onUpdateHomework={handleUpdateHomework}
                  onUpdateBacklogs={handleUpdateBacklogs}
                  onUpdateMasterPlan={handleUpdateMasterPlan}
                  theme={theme}
                  currentUser={currentUser}
                />
              ) : (
                <DailyPlanner 
                  planner={store.planner}
                  syllabus={store.syllabus}
                  onUpdatePlanner={handleUpdatePlanner}
                  theme={theme}
                />
              )}
            </div>
          )}


          {activeTab === "syllabus" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSyllabusViewMode("class10")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      syllabusViewMode === "class10"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    🎓 CBSE Class 10 Syllabus (5 Core Subjects)
                  </button>
                  <button
                    onClick={() => setSyllabusViewMode("custom")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      syllabusViewMode === "custom"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    📝 Custom Course Manager
                  </button>
                </div>
              </div>

              {syllabusViewMode === "class10" ? (
                <Class10SyllabusTracker
                  subjects={store.class10Syllabus && store.class10Syllabus.length > 0 ? store.class10Syllabus : DEFAULT_CLASS10_SYLLABUS}
                  onUpdateChapter={handleUpdateClass10Chapter}
                  onOpenStudyPlanner={() => {
                    setActiveTab("planner");
                    setPlannerViewMode("master");
                  }}
                  theme={theme}
                />
              ) : (
                <SyllabusManager 
                  syllabus={store.syllabus}
                  onAddCourse={handleAddCourse}
                  onUpdateTopics={handleUpdateCourseTopics}
                  onDeleteCourse={handleDeleteCourse}
                  theme={theme}
                />
              )}
            </div>
          )}

          {activeTab === "chat" && (
            <GeminiChatWorkspace 
              store={store}
              onApplyMutations={handleApplyAiMutations}
              onUpdateStore={setStore}
              currentUser={currentUser}
              onLogin={handleLogin}
              onUpdateProfile={handleUpdateProfileLocal}
              theme={theme}
              onToggleTheme={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              onOpenPublicResources={() => setIsPublicResourcesOpen(true)}
            />
          )}


          {activeTab === "pomodoro" && (
            <PomodoroTimer 
              pomodoros={store.pomodoros}
              onAddRecord={handleAddPomodoroRecord}
              theme={theme}
            />
          )}

          {activeTab === "todo" && (
            <TodoList 
              todos={store.todos}
              syllabus={store.syllabus}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdatePriorities={handleUpdatePriorities}
              theme={theme}
            />
          )}

          {activeTab === "groups" && (
            <StudyGroups 
              groups={store.studyGroups}
              onUpdateGroup={handleUpdateStudyGroup}
              onAddGroup={handleAddStudyGroup}
              currentUserEmail={currentUser.username}
              theme={theme}
            />
          )}

          {activeTab === "countdowns" && (
            <ExamCountdowns 
              countdowns={store.countdowns}
              onAddCountdown={handleAddCountdown}
              onDeleteCountdown={handleDeleteCountdown}
              coursesList={coursesList}
              theme={theme}
            />
          )}

          {activeTab === "announcements" && (
            <AnnouncementsBoard 
              store={store}
              currentUser={currentUser}
              onUpdateStore={saveStoreUpdate}
              theme={theme}
            />
          )}

          {activeTab === "lectures" && (
            <ParallelCoWatch 
              store={store}
              onUpdateStore={saveStoreUpdate}
              currentUser={currentUser}
              theme={theme}
            />
          )}

          {activeTab === "practice" && (
            <PracticeSheetMaker 
              store={store}
              currentUser={currentUser}
              onUpdateStore={saveStoreUpdate}
              theme={theme}
            />
          )}
        </div>
      </main>

      {/* FOOTER METRIC BRAND */}
      <footer className={`border-t py-6 mt-16 text-center text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-slate-100 text-slate-400"}`}>
        <span>CBSE Class 10 Study Hub • Power of Full-Stack React, Express, MongoDB &amp; Gemini AI</span>
      </footer>

      {/* PUBLIC RESOURCES & COMMUNITY BLOG MODAL (VIEWABLE DIRECTLY WITHOUT LOGIN) */}
      <PublicResourcesModal
        isOpen={isPublicResourcesOpen}
        onClose={() => setIsPublicResourcesOpen(false)}
        currentUser={currentUser}
        theme={theme}
      />
    </div>
  );
}

