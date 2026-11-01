import React, { useState } from "react";
import { Todo, CourseSyllabus } from "../types";
import { 
  Sparkles, 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  Calendar, 
  BookOpen, 
  Clock, 
  Loader2, 
  AlertCircle, 
  ChevronUp, 
  CheckCircle2, 
  HelpCircle,
  TrendingDown
} from "lucide-react";

interface TodoListProps {
  todos: Todo[];
  syllabus: CourseSyllabus[];
  onAddTodo: (todo: Todo) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdatePriorities: (updates: { id: string; priority: "High" | "Medium" | "Low"; reasoning?: string }[]) => void;
  theme?: "light" | "dark";
}

export default function TodoList({ 
  todos, 
  syllabus, 
  onAddTodo, 
  onToggleTodo, 
  onDeleteTodo, 
  onUpdatePriorities,
  theme = "dark"
}: TodoListProps) {
  // New todo form state
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estMins, setEstMins] = useState(30);

  // Gemini state
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo: Todo = {
      id: "todo_" + Date.now(),
      title: title.trim(),
      deadline: deadline || new Date().toISOString().split("T")[0],
      priority: "Medium", // Default, can be prioritized by AI
      completed: false,
      course: course || (syllabus.length > 0 ? syllabus[0].courseName : "General Study"),
      estimatedMinutes: estMins,
      actualMinutes: 0
    };

    onAddTodo(newTodo);
    setTitle("");
    setDeadline("");
    setEstMins(30);
  };

  const handleAutoPrioritize = async () => {
    if (todos.length === 0) return;
    setIsPrioritizing(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/gemini/prioritize-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todos: todos.map(t => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline,
            course: t.course
          })),
          currentDate: new Date().toISOString().split("T")[0]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to automate prioritizing");
      }

      const data = await response.json();
      if (data.success && data.updates) {
        onUpdatePriorities(data.updates);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not connect to Gemini. Please ensure API key is set.");
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Helper colors for priorities
  const getPriorityBadgeStyles = (p: string) => {
    if (p === "High") return "bg-rose-50 text-rose-700 border-rose-100";
    if (p === "Medium") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Sort todos: Incomplete first, then priority (High > Medium > Low), then by deadline
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const weightA = priorityWeight[a.priority] || 2;
    const weightB = priorityWeight[b.priority] || 2;
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="todo_section">
      {/* LEFT COLUMN: ACTIVE TODOS */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="todos_list_pane">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" /> Study Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-1">Check off tasks, monitor urgency, and analyze priorities</p>
          </div>

          <button
            onClick={handleAutoPrioritize}
            disabled={isPrioritizing || todos.length === 0}
            className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white disabled:bg-slate-200 disabled:text-slate-400 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shadow-indigo-100/40"
          >
            {isPrioritizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Coaching Priorities...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-Prioritize (Gemini AI)
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs text-rose-600 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Priority Alignment Error</p>
              <p className="text-[11px] text-rose-500 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {sortedTodos.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center" id="empty_todo_state">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Your study checklist is empty</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Enter a task on the right sidebar or consult Gemini for daily schedule suggestions to build your study queue.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5" id="active_todo_items_list">
            {sortedTodos.map((todo) => (
              <div 
                key={todo.id} 
                className={`bg-white rounded-2xl border border-slate-100 p-4.5 shadow-xs flex flex-col gap-3 transition-all ${
                  todo.completed ? "opacity-75 bg-slate-50/50" : ""
                }`}
                id={`todo_card_${todo.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* CHECKBOX AND TITLE */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleTodo(todo.id)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100/50" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:border-slate-400" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className={`text-sm font-semibold text-slate-800 break-words ${todo.completed ? "line-through text-slate-400" : ""}`}>
                        {todo.title}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          {todo.course}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Due: {new Date(todo.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {todo.estimatedMinutes} mins est.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PRIORITY & ACTIONS */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadgeStyles(todo.priority)}`}>
                      {todo.priority} Priority
                    </span>
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI REASONING BOX */}
                {todo.reasoning && !todo.completed && (
                  <div className="bg-gradient-to-r from-indigo-50/50 to-emerald-50/30 border border-indigo-100/60 rounded-xl px-3 py-2 text-[10px] text-indigo-900 flex items-start gap-1.5 animate-fadeIn">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-semibold text-indigo-700">Gemini Reasoning: </span>
                      <span className="text-slate-600 italic font-medium">"{todo.reasoning}"</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: NEW TODO FORM */}
      <div className="lg:col-span-5" id="todos_creation_pane">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-slate-400" /> Add New Task
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complete calculus practice sheet"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Course / Subject</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium cursor-pointer"
              >
                {syllabus.length > 0 ? (
                  syllabus.map((c) => (
                    <option key={c.id} value={c.courseName}>
                      {c.courseName}
                    </option>
                  ))
                ) : (
                  <option value="General Study">General Study</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Est. Duration (Mins)</label>
                <input
                  type="number"
                  value={estMins}
                  onChange={(e) => setEstMins(Math.max(5, parseInt(e.target.value) || 30))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              Add Task to Checklist
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
