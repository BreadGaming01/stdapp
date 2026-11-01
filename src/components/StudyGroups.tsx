import React, { useState } from "react";
import { StudyGroup, GroupNote, GroupSession } from "../types";
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  Plus, 
  FileText, 
  User, 
  Send, 
  MessageSquare, 
  CalendarDays,
  FileSpreadsheet
} from "lucide-react";

interface StudyGroupsProps {
  groups: StudyGroup[];
  onUpdateGroup: (updatedGroup: StudyGroup) => void;
  onAddGroup: (newGroup: StudyGroup) => void;
  currentUserEmail: string;
  theme?: "light" | "dark";
}

export default function StudyGroups({ 
  groups, 
  onUpdateGroup, 
  onAddGroup, 
  currentUserEmail,
  theme = "dark"
}: StudyGroupsProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");
  const activeGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  // Forms state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [authorName, setAuthorName] = useState("Me");

  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionAgenda, setSessionAgenda] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);

  // Handle Note Posting
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !noteTitle.trim() || !noteContent.trim()) return;

    const newNote: GroupNote = {
      id: "note_" + Date.now(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      author: authorName.trim() || currentUserEmail || "Student User",
      timestamp: new Date().toISOString()
    };

    const updatedGroup: StudyGroup = {
      ...activeGroup,
      notes: [newNote, ...activeGroup.notes]
    };

    onUpdateGroup(updatedGroup);
    setNoteTitle("");
    setNoteContent("");
  };

  // Handle Session scheduling
  const handleScheduleSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !sessionTitle.trim() || !sessionTime) return;

    const newSession: GroupSession = {
      id: "session_" + Date.now(),
      title: sessionTitle.trim(),
      time: sessionTime,
      durationMinutes: sessionDuration,
      agenda: sessionAgenda.trim()
    };

    const updatedGroup: StudyGroup = {
      ...activeGroup,
      sessions: [...activeGroup.sessions, newSession].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      )
    };

    onUpdateGroup(updatedGroup);
    setSessionTitle("");
    setSessionTime("");
    setSessionDuration(60);
    setSessionAgenda("");
  };

  // Create new study group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup: StudyGroup = {
      id: "group_" + Date.now(),
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || "Collaborative workspace for shared curriculum learning.",
      members: [currentUserEmail || "kanta123090@gmail.com", "Sarah Jenkins"],
      notes: [],
      sessions: []
    };

    onAddGroup(newGroup);
    setSelectedGroupId(newGroup.id);
    setNewGroupName("");
    setNewGroupDesc("");
    setShowCreateForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="study_groups_section">
      {/* LEFT COLUMN: GROUP NAVIGATION */}
      <div className="lg:col-span-4 flex flex-col gap-4" id="group_sidebar">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Study Groups
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all cursor-pointer"
            title="Create New Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateGroup} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 animate-slideIn">
            <h4 className="text-xs font-bold text-slate-700">Form New Study Circle</h4>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Biology Lab Partners"
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Description</label>
              <textarea
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="e.g., Preparing for AP biology exams and sharing lab insights."
                rows={2}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1" id="group_selection_list">
          {groups.map((group) => {
            const isSelected = activeGroup?.id === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                    : "bg-white hover:bg-slate-50 border-slate-100 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm truncate">{group.name}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {group.members.length} members
                  </span>
                </div>
                <p className={`text-xs mt-1.5 line-clamp-2 ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                  {group.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[10px] font-semibold">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 shrink-0" /> {group.notes.length} Notes
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" /> {group.sessions.length} Sessions
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE GROUP PANELS */}
      {activeGroup ? (
        <div className="lg:col-span-8 flex flex-col gap-6" id="group_workspace_view">
          {/* HEADER HERO */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs" id="active_group_header">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{activeGroup.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{activeGroup.description}</p>
              </div>
              <div className="flex flex-col text-left md:text-right shrink-0">
                <span className="text-xs text-slate-400 font-semibold">Members Registered</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mt-1 self-start md:self-end">
                  {activeGroup.members.join(", ")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="active_group_tabs_and_tools">
            {/* NOTES NOTEBOOK (LEFT IN GROUP PANEL) */}
            <div className="md:col-span-7 flex flex-col gap-6" id="group_notes_panel">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex-1 flex flex-col">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-slate-400" /> Shared Knowledge Base
                </h4>

                {/* POST NEW NOTE FORM */}
                <form onSubmit={handleAddNote} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-3 mb-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Publish New Review Note</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Note Title (e.g. L'Hopital's Rule)"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Author (e.g. Sam)"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold"
                    />
                  </div>
                  <textarea
                    placeholder="Type or paste core formulas, outlines, concepts or reference links..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                    required
                  />
                  <button
                    type="submit"
                    className="self-end px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Send className="w-3 h-3" /> Post Note
                  </button>
                </form>

                {/* SCROLLABLE NOTES BOARD */}
                <div className="flex-1 overflow-y-auto max-h-[350px] flex flex-col gap-3 pr-1" id="notes_scrollable_container">
                  {activeGroup.notes.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No notes published yet in this workspace. Be the first to post a study tip!
                    </div>
                  ) : (
                    activeGroup.notes.map((note) => (
                      <div key={note.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-800">{note.title}</h5>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-600 flex items-center gap-0.5">
                              <User className="w-2.5 h-2.5" /> {note.author}
                            </span>
                            <span>•</span>
                            <span>{new Date(note.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-2 whitespace-pre-line leading-relaxed border-t border-slate-100 pt-2">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* JOINT SESSIONS (RIGHT IN GROUP PANEL) */}
            <div className="md:col-span-5 flex flex-col gap-6" id="group_sessions_panel">
              {/* LIST SESSIONS */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex-1 flex flex-col">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-slate-400" /> Joint Review Planner
                </h4>

                <div className="flex-1 overflow-y-auto max-h-[220px] flex flex-col gap-2.5 mb-5 pr-1" id="scheduled_sessions_list">
                  {activeGroup.sessions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs my-auto">
                      No reviews scheduled yet. Use the scheduler below to coordinate joint session alerts.
                    </div>
                  ) : (
                    activeGroup.sessions.map((session) => (
                      <div key={session.id} className="bg-gradient-to-br from-indigo-50/40 to-slate-50 border border-slate-100 rounded-xl p-3">
                        <h5 className="font-bold text-xs text-slate-800">{session.title}</h5>
                        
                        <div className="flex flex-col gap-1.5 mt-2 text-[10px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1 text-slate-600">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                            {new Date(session.time).toLocaleString("en-US", { 
                              weekday: "short",
                              month: "short", 
                              day: "numeric", 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Duration: {session.durationMinutes} mins
                          </span>
                        </div>

                        {session.agenda && (
                          <p className="text-[10px] text-slate-600 bg-white/70 rounded-lg p-2 mt-2 border border-slate-100 italic">
                            Agenda: {session.agenda}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* SCHEDULE FORM */}
                <form onSubmit={handleScheduleSession} className="border-t border-slate-100 pt-4 mt-auto flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Schedule Review Session</p>
                  
                  <input
                    type="text"
                    placeholder="Session Focus (e.g. Midterm prep)"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-semibold"
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={sessionTime}
                      onChange={(e) => setSessionTime(e.target.value)}
                      className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-semibold"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Minutes"
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(Math.max(15, parseInt(e.target.value) || 60))}
                      className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-semibold"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Short agenda (optional)"
                    value={sessionAgenda}
                    onChange={(e) => setSessionAgenda(e.target.value)}
                    className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700"
                  />

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-lg text-xs transition-all cursor-pointer mt-1"
                  >
                    Save & Announce Session
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center flex items-center justify-center">
          <p className="text-sm font-semibold text-slate-500">No collaborative groups available. Click plus to create one!</p>
        </div>
      )}
    </div>
  );
}
