import React, { useState } from "react";
import { UserAccount } from "../types";
import { 
  Users, 
  UserPlus, 
  Check, 
  Sparkles, 
  GraduationCap, 
  X, 
  ChevronDown, 
  ShieldCheck, 
  LogOut,
  ArrowRight
} from "lucide-react";

interface StudentProfileSwitcherProps {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  onSwitchUser: (user: UserAccount) => void;
  onLogout: () => void;
  theme?: "light" | "dark";
}

// Preset Class 10 students for instant demo switching
const PRESET_STUDENTS: UserAccount[] = [
  {
    username: "aarav_sharma",
    fullName: "Aarav Sharma",
    bio: "Class 10th CBSE • Aiming for 95%+ in Science & Maths",
    avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Aarav",
    theme: "dark",
    status: "online",
    createdAt: new Date().toISOString()
  },
  {
    username: "priya_patel",
    fullName: "Priya Patel",
    bio: "Class 10th CBSE • Focusing on SST, English & Hindi A",
    avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Priya",
    theme: "dark",
    status: "online",
    createdAt: new Date().toISOString()
  },
  {
    username: "rohan_gupta",
    fullName: "Rohan Gupta",
    bio: "Class 10th CBSE • Clearing backlogs & Competency questions",
    avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Rohan",
    theme: "dark",
    status: "online",
    createdAt: new Date().toISOString()
  }
];

export default function StudentProfileSwitcher({
  currentUser,
  accounts,
  onSwitchUser,
  onLogout,
  theme = "dark"
}: StudentProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Combine registered accounts with presets (deduplicating by username)
  const allAvailableStudents = React.useMemo(() => {
    const map = new Map<string, UserAccount>();
    PRESET_STUDENTS.forEach(p => map.set(p.username.toLowerCase(), p));
    (accounts || []).forEach(a => map.set(a.username.toLowerCase(), a));
    return Array.from(map.values());
  }, [accounts]);

  const handleSelectStudent = (student: UserAccount) => {
    onSwitchUser(student);
    setIsOpen(false);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim()) return;

    const formattedUsername = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const newStudent: UserAccount = {
      username: formattedUsername,
      fullName: newFullName.trim(),
      bio: "Class 10th CBSE Student",
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(newFullName.trim())}`,
      theme: "dark",
      status: "online",
      createdAt: new Date().toISOString()
    };

    try {
      // Register with backend
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formattedUsername,
          password: "student_password_123",
          fullName: newFullName.trim(),
          bio: "Class 10th CBSE Student",
          avatarUrl: newStudent.avatarUrl
        })
      });
    } catch (err) {
      console.warn("Backend registration note:", err);
    }

    onSwitchUser(newStudent);
    setNewFullName("");
    setNewUsername("");
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer ${
          theme === "dark" 
            ? "bg-slate-800/90 hover:bg-slate-750 border-slate-700/80 text-white" 
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs"
        }`}
        title="Switch Student Account or Sign In"
      >
        <img
          src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser?.fullName || "Student")}`}
          alt={currentUser?.fullName || "Student"}
          className="w-7 h-7 rounded-xl object-cover border border-indigo-400/40"
        />
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold leading-tight flex items-center gap-1.5 truncate max-w-[130px]">
            <span>{currentUser?.fullName || "Student Profile"}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
              10th
            </span>
          </div>
          <div className="text-[10px] text-slate-400 leading-none truncate max-w-[130px]">
            @{currentUser?.username || "student"}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* DROPDOWN / MODAL */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col gap-4 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Student Account Switcher
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every student gets their own <span className="text-indigo-500 font-semibold">isolated personal workspace</span>: personal Class 10 syllabus progress, school homework, previous backlogs, and day-wise study plan! AI Copilot &amp; community chat remain common.
            </p>

            {/* Current Active User Banner */}
            {currentUser && (
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-xl object-cover shrink-0 border border-indigo-400/50"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate">
                      @{currentUser.username} (Active)
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  Active
                </span>
              </div>
            )}

            {/* Quick Switch Profiles */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Switch Student Profile:
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {allAvailableStudents.map(student => {
                  const isCurrent = currentUser?.username?.toLowerCase() === student.username.toLowerCase();

                  return (
                    <button
                      key={student.username}
                      onClick={() => handleSelectStudent(student)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                        isCurrent
                          ? "bg-slate-100 dark:bg-slate-800/90 border-indigo-500 text-slate-900 dark:text-white"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={student.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(student.fullName)}`}
                          alt={student.fullName}
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{student.fullName}</div>
                          <div className="text-[10px] text-slate-400 truncate">{student.bio || `@${student.username}`}</div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Create New Student Account Section */}
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create or Sign In with Another Student Name</span>
              </button>
            ) : (
              <form onSubmit={handleCreateStudent} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                <div className="text-xs font-bold text-slate-800 dark:text-white">New Student Profile</div>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => {
                    setNewFullName(e.target.value);
                    if (!newUsername || newUsername.startsWith("student_")) {
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                    }
                  }}
                  placeholder="Full Name (e.g., Ishaan Sharma)"
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  placeholder="Username / Student ID (e.g., ishaan_10th)"
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  required
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Create &amp; Switch</span>
                  </button>
                </div>
              </form>
            )}

            {/* Logout button */}
            {currentUser && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out of current profile</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
