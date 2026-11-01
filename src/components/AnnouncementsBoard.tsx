import React, { useState } from "react";
import { AppStore, Announcement, getSafeHtmlSnippet } from "../types";
import { 
  Megaphone, 
  Code, 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  PlusCircle, 
  Eye, 
  RefreshCw,
  Sparkles,
  X
} from "lucide-react";

interface AnnouncementsBoardProps {
  store: AppStore;
  currentUser: any;
  onUpdateStore: (updatedFields: Partial<AppStore>) => Promise<void>;
  theme: "light" | "dark";
}

export default function AnnouncementsBoard({ 
  store, 
  currentUser, 
  onUpdateStore, 
  theme 
}: AnnouncementsBoardProps) {
  // Announcements form
  const [annTitle, setAnnTitle] = useState("");
  const [annHtml, setAnnHtml] = useState("");
  const [annLoading, setAnnLoading] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);
  const [annError, setAnnError] = useState("");

  // Gemini AI Generator States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleGenerateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError("");
    setAnnSuccess(false);

    try {
      const response = await fetch("/api/ai/generate-announcement-snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          username: currentUser?.username || "anonymous",
          fullName: currentUser?.fullName || "Anonymous Scholar"
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate educational announcement.");
      }

      await onUpdateStore({ announcements: data.store.announcements });

      setAiPrompt("");
      setIsAiOpen(false);
      setAnnSuccess(true);
    } catch (err: any) {
      console.error("Gemini Announcement Maker failed:", err);
      setAiError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setAiLoading(false);
    }
  };

  // Password change form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  const [activeSnippetPreview, setActiveSnippetPreview] = useState<string | null>(null);

  // Submit new announcement
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annHtml.trim()) {
      setAnnError("Title and HTML snippet content are required.");
      return;
    }

    setAnnLoading(true);
    setAnnError("");
    setAnnSuccess(false);

    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: currentUser?.fullName || "Anonymous Student",
          title: annTitle,
          htmlContent: annHtml
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to post announcement.");
      }

      const data = await response.json();
      if (data.success) {
        setAnnTitle("");
        setAnnHtml("");
        setAnnSuccess(true);
        // Sync store state in parent App component
        await onUpdateStore({ announcements: data.store.announcements });
      }
    } catch (err: any) {
      setAnnError(err.message || "Something went wrong.");
    } finally {
      setAnnLoading(false);
    }
  };

  // Submit change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!newPassword) {
      setPwdError("New password cannot be empty.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser?.username,
          oldPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update password.");
      }

      const data = await response.json();
      if (data.success) {
        setPwdSuccess("Your workspace password has been updated successfully.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPwdError(err.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  // Pre-configured HTML template snippets to guide the user's creativity
  const templates = [
    {
      name: "Visual Kanban Card",
      html: `<div class="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 max-w-sm">
  <span class="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase rounded-lg">Study Target</span>
  <h3 class="text-md font-bold mt-2">Organic Chemistry</h3>
  <p class="text-xs text-slate-400 mt-1">Review alkanes reactions and nucleophilic substitutions before Friday.</p>
  <div class="mt-4 flex items-center justify-between text-[11px] text-slate-500">
    <span>Progress: 80%</span>
    <span class="text-emerald-400 font-bold">● Active Study</span>
  </div>
</div>`
    },
    {
      name: "Interactive Grade Average Calculator",
      html: `<div class="p-6 bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-900/30 rounded-3xl text-slate-100">
  <h3 class="text-md font-bold mb-3">Study Grade Tracker</h3>
  <div class="space-y-2 text-xs">
    <div class="flex justify-between"><span>Midterm Exam:</span> <input type="number" id="g1" value="88" class="bg-slate-900 px-2 py-0.5 rounded w-16 text-right text-indigo-300" onchange="calc()"/></div>
    <div class="flex justify-between"><span>Quizzes Average:</span> <input type="number" id="g2" value="92" class="bg-slate-900 px-2 py-0.5 rounded w-16 text-right text-indigo-300" onchange="calc()"/></div>
    <div class="flex justify-between"><span>Practical Labs:</span> <input type="number" id="g3" value="85" class="bg-slate-900 px-2 py-0.5 rounded w-16 text-right text-indigo-300" onchange="calc()"/></div>
  </div>
  <div class="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
    <span class="font-bold">Calculated Average:</span>
    <span id="avg" class="text-emerald-400 font-bold text-sm">88.3%</span>
  </div>
  <script>
    function calc() {
      const g1 = parseFloat(document.getElementById('g1').value) || 0;
      const g2 = parseFloat(document.getElementById('g2').value) || 0;
      const g3 = parseFloat(document.getElementById('g3').value) || 0;
      const result = ((g1 * 0.4) + (g2 * 0.3) + (g3 * 0.3)).toFixed(1);
      document.getElementById('avg').innerText = result + '%';
    }
  </script>
</div>`
    }
  ];

  return (
    <div className="space-y-8" id="announcements_module">
      
      {/* TWO COLUMN GRID: ADD BOARD + SETTINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1 & 2: BOARD AND NEW POST */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* POST HTML SNIPPET FORM */}
          <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} id="new_snippet_panel">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-2xl text-white">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-md sm:text-lg font-bold tracking-tight">HTML Snippet Sandbox</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Inject dynamic widgets, timers, custom text formatting, or styled cards into the public board</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiOpen(true)}
                className="flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02] shrink-0"
              >
                <Sparkles className="w-4 h-4 animate-pulse text-violet-200" />
                Generate with Gemini
              </button>
            </div>

            {annError && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-xs text-rose-400 mb-4 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{annError}</span>
              </div>
            )}

            {annSuccess && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-emerald-400 mb-4 animate-fadeIn">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Snippet successfully added to the public board! Scroll down to see it.</span>
              </div>
            )}

            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Announcement Title / Widget Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Reactions Study Card"
                  required
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"}`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Raw HTML & Tailwind Snippet Code</label>
                  
                  {/* QUICK EXAMPLES */}
                  <div className="flex gap-2">
                    {templates.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAnnHtml(t.html);
                          setAnnTitle(t.name);
                        }}
                        className="text-[9px] px-2 py-1 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-lg transition-colors font-bold uppercase cursor-pointer"
                      >
                        Template {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={8}
                  placeholder={`<div class="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-slate-100">
  <h3 class="text-md font-bold text-indigo-400">Custom Announcement!</h3>
  <p class="text-xs text-slate-300 mt-2">You can use <b>Tailwind CSS classes</b> here directly. Interactive elements and CSS work beautifully!</p>
</div>`}
                  required
                  value={annHtml}
                  onChange={e => setAnnHtml(e.target.value)}
                  className="w-full text-xs p-3 font-mono rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-950 border-slate-800 text-indigo-300 placeholder-indigo-900 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={annLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all tracking-wider uppercase cursor-pointer flex items-center gap-2"
                >
                  {annLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" /> Post Snippet Board
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* PUBLIC SNIPPET RENDERING BOARD */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-indigo-500 shrink-0" />
              <h3 className="text-sm font-bold tracking-tight uppercase text-slate-400">📢 Public Board Activities</h3>
            </div>

            {(!store.announcements || store.announcements.length === 0) ? (
              <div className={`p-10 rounded-3xl text-center border ${theme === "dark" ? "bg-slate-900/30 border-slate-800" : "bg-slate-100/30 border-slate-200"}`}>
                <p className="text-xs text-slate-400">The public HTML announcement board is currently empty. Post a snippet above, or ask Gemini Study Copilot in the chat tab to "Add HTML snippet" for you!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {store.announcements.map((ann: Announcement) => (
                  <div 
                    key={ann.id} 
                    className={`rounded-3xl border p-5 flex flex-col justify-between shadow-xs transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider truncate max-w-[150px]" title={ann.title}>
                          {ann.title}
                        </h4>
                        <span className="text-[9px] text-slate-500 bg-slate-800/10 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* SANDBOXED IFRAME VIEWPORT */}
                      <div className="relative mt-3 rounded-2xl overflow-hidden border border-slate-200/20 bg-slate-950">
                        <iframe
                          srcDoc={getSafeHtmlSnippet(ann.htmlContent)}
                          className="w-full h-44 border-0"
                          title={ann.title}
                          sandbox="allow-scripts allow-same-origin"
                        />
                        <button
                          onClick={() => setActiveSnippetPreview(ann.htmlContent)}
                          className="absolute bottom-2 right-2 p-1.5 bg-slate-900 hover:bg-indigo-600 rounded-lg text-white text-[10px] transition-all flex items-center gap-1 opacity-70 hover:opacity-100 shadow-lg cursor-pointer"
                          title="Open Fullscreen Sandbox Screen"
                        >
                          <Eye className="w-3.5 h-3.5" /> Full View
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/10 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Posted by: <b className="text-slate-300">{ann.author}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: SETTINGS / PASSWORD CHANGE */}
        <div className="space-y-8">
          
          {/* PASSWORD RESET MODULE */}
          <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`} id="password_portal">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-md sm:text-lg font-bold tracking-tight">Security Center</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage your private study workspace login credentials securely</p>
              </div>
            </div>

            {pwdError && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-xs text-rose-400 mb-4 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-emerald-400 mb-4 animate-fadeIn">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Your Account Username</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentUser?.username || "Guest"}
                  className="w-full text-xs p-3 rounded-xl border bg-slate-800/10 border-slate-800 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${theme === "dark" ? "bg-slate-850 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-800"}`}
                />
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-3 rounded-xl font-bold text-xs transition-all tracking-wider uppercase shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {pwdLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Save New Password
                  </>
                )}
              </button>
            </form>
          </div>
          
        </div>

      </div>

      {/* FULLSCREEN PREVIEW SANDBOX MODAL */}
      {activeSnippetPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fadeIn" id="sandbox_modal">
          <div className="w-full max-w-4xl h-[85vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fullscreen HTML Snippet Render Canvas</h3>
              </div>
              <button
                onClick={() => setActiveSnippetPreview(null)}
                className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Close Sandbox
              </button>
            </div>
            <div className="flex-1 bg-slate-950">
              <iframe
                srcDoc={getSafeHtmlSnippet(activeSnippetPreview)}
                className="w-full h-full border-0"
                title="Fullscreen Preview Sandbox Canvas"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: GENERATE ANNOUNCEMENT WITH GEMINI */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/20 to-indigo-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">AI Board Snippet Generator</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Powered by Gemini 3.5 Flash</p>
                </div>
              </div>
              <button 
                onClick={() => !aiLoading && setIsAiOpen(false)}
                disabled={aiLoading}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerateAnnouncement} className="p-6 space-y-4">
              
              {aiError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl">
                  ⚠️ {aiError}
                </div>
              )}

              {/* Text Area Prompt */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Describe the announcement or board card:
                </label>
                <textarea
                  required
                  rows={4}
                  disabled={aiLoading}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Weekly Math Challenge with 3 algebra puzzles and high contrast layout, important physics formula reference sheet, or motivational quote card..."
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                  }`}
                />
              </div>

              {/* Suggestions */}
              {!aiLoading && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    💡 Sample Announcement Prompts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "🏆 Chemistry Challenge", prompt: "A chemistry challenge card with 3 MCQ quiz questions about organic synthesis, click to show answers" },
                      { label: "📝 Weekly Checklist", prompt: "An interactive weekly homework completion checklist card styled with custom neon green checks" },
                      { label: "🌌 Physics Formulas", prompt: "An elegant dark reference card for essential Newtonian and gravitational physics formulas with beautiful typography" },
                      { label: "📅 Exam Warmup", prompt: "An exam warmup card with a live countdown and motivational text with glowing borders" }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAiPrompt(preset.prompt)}
                        className={`text-[9px] font-medium px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          theme === "dark" 
                            ? "bg-slate-950/50 border-slate-800 hover:bg-slate-850 text-slate-300" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading animation */}
              {aiLoading && (
                <div className="py-6 flex flex-col items-center justify-center space-y-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-purple-400 absolute top-3.5 left-3.5 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-indigo-400">Gemini is designing your announcement...</p>
                    <p className="text-[10px] text-slate-400 italic">"Injecting interactive Tailwind widgets into the public activities board..."</p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => setIsAiOpen(false)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:scale-100 hover:scale-[1.02] shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiLoading ? "Generating..." : "Post AI Announcement"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
