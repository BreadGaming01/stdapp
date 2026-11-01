import React, { useState, useMemo } from "react";
import { Todo, SchoolHomework, PreviousBacklog, MasterStudyPlan, DaySchedule, DayPlanTask } from "../types";
import { 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Send, 
  ArrowRight, 
  Flame, 
  BookOpen, 
  BrainCircuit, 
  CheckSquare, 
  Plus, 
  CalendarDays, 
  Shuffle, 
  Bot, 
  Zap,
  Filter
} from "lucide-react";
import { formatMathText } from "./Class10SyllabusTracker";

interface FinalDaywiseTodoCenterProps {
  todos: Todo[];
  homework: SchoolHomework[];
  backlogs: PreviousBacklog[];
  masterPlan: MasterStudyPlan | null;
  onToggleTodo: (id: string) => void;
  onUpdateHomework: (hw: SchoolHomework[]) => void;
  onUpdateBacklogs: (b: PreviousBacklog[]) => void;
  onUpdateMasterPlan: (mp: MasterStudyPlan | null) => void;
  onRefreshStore: () => Promise<void>;
  theme?: "light" | "dark";
  currentUser?: any;
}

export default function FinalDaywiseTodoCenter({
  todos,
  homework,
  backlogs,
  masterPlan,
  onToggleTodo,
  onUpdateHomework,
  onUpdateBacklogs,
  onUpdateMasterPlan,
  onRefreshStore,
  theme = "dark",
  currentUser
}: FinalDaywiseTodoCenterProps) {
  const [aiInstruction, setAiInstruction] = useState("");
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    reply: string;
    markedDoneCount: number;
    shiftedDeadlinesCount: number;
    addedTasksCount: number;
  } | null>(null);

  const [filterMode, setFilterMode] = useState<"all" | "today" | "pending" | "homework" | "backlogs">("all");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Merge Master Plan days with user's Homework, Backlogs, and Todos
  const dayWiseAgenda = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dayLabel: string;
      focusSubject?: string;
      dailyGoal?: string;
      tasks: {
        id: string;
        source: "master_plan" | "homework" | "backlog" | "todo";
        title: string;
        category: string;
        subject: string;
        completed: boolean;
        timeSlot?: string;
        dueDate?: string;
        priority?: string;
        estimatedMinutes?: number;
      }[];
    }>();

    // 1. Seed from masterPlan days if present
    if (masterPlan && masterPlan.days) {
      masterPlan.days.forEach((day, index) => {
        const dStr = day.date || todayStr;
        if (!map.has(dStr)) {
          map.set(dStr, {
            date: dStr,
            dayLabel: `Day ${day.dayNumber} (${day.dayName || dStr})`,
            focusSubject: day.focusSubject,
            dailyGoal: day.dailyGoal,
            tasks: []
          });
        }
        const bucket = map.get(dStr)!;
        (day.tasks || []).forEach(t => {
          bucket.tasks.push({
            id: t.id,
            source: "master_plan",
            title: t.title,
            category: t.category,
            subject: t.subject,
            completed: !!t.completed,
            timeSlot: t.timeSlot
          });
        });
      });
    }

    // 2. Ensure today exists
    if (!map.has(todayStr)) {
      map.set(todayStr, {
        date: todayStr,
        dayLabel: `Today (${todayStr})`,
        focusSubject: "All Core Subjects",
        dailyGoal: "Execute prioritized daily tasks & complete school homework",
        tasks: []
      });
    }

    // 3. Inject school homework by dueDate
    homework.forEach(hw => {
      const dStr = hw.dueDate || todayStr;
      if (!map.has(dStr)) {
        map.set(dStr, {
          date: dStr,
          dayLabel: `Due: ${dStr}`,
          tasks: []
        });
      }
      map.get(dStr)!.tasks.push({
        id: hw.id,
        source: "homework",
        title: `[Homework] ${hw.title}`,
        category: "School Homework",
        subject: hw.subject,
        completed: hw.completed,
        dueDate: hw.dueDate,
        priority: hw.priority,
        estimatedMinutes: hw.estimatedMinutes
      });
    });

    // 4. Inject backlogs by targetDate or today
    backlogs.forEach(b => {
      const dStr = b.targetDate || todayStr;
      if (!map.has(dStr)) {
        map.set(dStr, {
          date: dStr,
          dayLabel: `Target: ${dStr}`,
          tasks: []
        });
      }
      map.get(dStr)!.tasks.push({
        id: b.id,
        source: "backlog",
        title: `[Backlog Recovery] ${b.topic}`,
        category: "Backlog Clearance",
        subject: b.subject,
        completed: b.completed,
        priority: b.severity,
        estimatedMinutes: Math.round((b.estimatedHours || 1) * 60)
      });
    });

    // 5. Inject personal todos by deadline
    todos.forEach(t => {
      const dStr = t.deadline || todayStr;
      if (!map.has(dStr)) {
        map.set(dStr, {
          date: dStr,
          dayLabel: `Deadline: ${dStr}`,
          tasks: []
        });
      }
      map.get(dStr)!.tasks.push({
        id: t.id,
        source: "todo",
        title: t.title,
        category: "Personal Task",
        subject: t.course,
        completed: t.completed,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes
      });
    });

    // Sort by date ascending
    const sortedDays = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return sortedDays;
  }, [masterPlan, homework, backlogs, todos, todayStr]);

  // Execute Natural Language AI command to manipulate tasks
  const handleExecuteAiCommand = async (customPrompt?: string) => {
    const textToRun = (customPrompt || aiInstruction).trim();
    if (!textToRun) return;

    setIsProcessingAi(true);
    setAiFeedback(null);

    try {
      const userParam = currentUser?.username ? `?user=${encodeURIComponent(currentUser.username)}` : "";
      const res = await fetch(`/api/ai/manipulate-tasks${userParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: textToRun })
      });

      if (res.ok) {
        const data = await res.json();
        setAiFeedback({
          reply: data.reply || "Tasks updated successfully!",
          markedDoneCount: data.markedDoneCount || 0,
          shiftedDeadlinesCount: data.shiftedDeadlinesCount || 0,
          addedTasksCount: data.addedTasksCount || 0
        });
        setAiInstruction("");
        // Reload fresh store
        await onRefreshStore();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process task manipulation.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error contacting AI Command Center.");
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Toggle item completion based on source
  const handleToggleItem = (task: { id: string; source: string; completed: boolean }) => {
    if (task.source === "todo") {
      onToggleTodo(task.id);
    } else if (task.source === "homework") {
      const updated = homework.map(h => h.id === task.id ? { ...h, completed: !h.completed } : h);
      onUpdateHomework(updated);
    } else if (task.source === "backlog") {
      const updated = backlogs.map(b => b.id === task.id ? { ...b, completed: !b.completed } : b);
      onUpdateBacklogs(updated);
    } else if (task.source === "master_plan" && masterPlan) {
      const updatedDays = masterPlan.days.map(d => ({
        ...d,
        tasks: d.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
      }));
      onUpdateMasterPlan({ ...masterPlan, days: updatedDays });
    }
  };

  // Quick prompt buttons
  const quickPrompts = [
    "I finished Quadratic Equations, shift pending tasks to tomorrow",
    "Push all due homework by 2 days",
    "Add 45 min competency question practice for Mathematics today",
    "Mark science homework as completed and add 30 min revision for Life Processes",
    "Rebalance upcoming deadlines evenly across this week"
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn" id="final_daywise_todo_center">
      {/* HEADER & AI COMMAND CENTER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI High-Thinking Execution
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Unified Day-Wise Schedule
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-indigo-400 animate-pulse" />
                <span>Final Strategic Day-Wise Todo Center</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Deeply analyzes all tasks, deadlines, school homework, and past backlogs day by day. Command the AI in natural language to mark items done, shift deadlines, or add new study sessions.
              </p>
            </div>
          </div>

          {/* AI NATURAL LANGUAGE COMMAND BAR */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 mt-3 shadow-inner">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Bot className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleExecuteAiCommand();
                  }}
                  placeholder="Tell AI: 'Mark maths homework done, move English to Friday, add 45m science revision'..."
                  disabled={isProcessingAi}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/40 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <button
                onClick={() => handleExecuteAiCommand()}
                disabled={isProcessingAi || !aiInstruction.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shrink-0"
              >
                {isProcessingAi ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Analyzing &amp; Manipulating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute Command</span>
                  </>
                )}
              </button>
            </div>

            {/* QUICK COMMAND PROMPTS */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10 text-[11px]">
              <span className="text-slate-400 font-semibold mr-1">⚡ Quick Actions:</span>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteAiCommand(prompt)}
                  disabled={isProcessingAi}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* AI FEEDBACK TOAST / BANNER */}
          {aiFeedback && (
            <div className="mt-4 p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-100 flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                  AI Action Successfully Applied to Database!
                </h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {aiFeedback.reply}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-emerald-300 pt-1 border-t border-emerald-500/20">
                <span>✅ {aiFeedback.markedDoneCount} marked completed</span>
                <span>•</span>
                <span>📅 {aiFeedback.shiftedDeadlinesCount} deadlines adjusted</span>
                <span>•</span>
                <span>➕ {aiFeedback.addedTasksCount} new tasks scheduled</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BUTTONS & SUMMARY */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All Scheduled Days ({dayWiseAgenda.length})
          </button>
          <button
            onClick={() => setFilterMode("today")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === "today"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Today Only
          </button>
          <button
            onClick={() => setFilterMode("homework")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === "homework"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            Homework ({homework.filter(h => !h.completed).length} pending)
          </button>
          <button
            onClick={() => setFilterMode("backlogs")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === "backlogs"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            }`}
          >
            Backlogs ({backlogs.filter(b => !b.completed).length} pending)
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
          Active Student: <span className="text-indigo-400 font-bold">{currentUser?.fullName || "Class 10 Student"}</span>
        </div>
      </div>

      {/* DAY-WISE LIST VIEW */}
      <div className="flex flex-col gap-5">
        {dayWiseAgenda
          .filter(day => {
            if (filterMode === "today") return day.date === todayStr;
            if (filterMode === "homework") return day.tasks.some(t => t.source === "homework");
            if (filterMode === "backlogs") return day.tasks.some(t => t.source === "backlog");
            return true;
          })
          .map((dayGroup, dIdx) => {
            const isToday = dayGroup.date === todayStr;
            const completedCount = dayGroup.tasks.filter(t => t.completed).length;
            const totalCount = dayGroup.tasks.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div
                key={dayGroup.date}
                className={`rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isToday
                    ? "bg-slate-900/90 border-indigo-500/60 ring-2 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* DAY HEADER */}
                <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isToday
                    ? "bg-indigo-950/40 border-indigo-500/30"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isToday ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                          {dayGroup.dayLabel}
                        </h3>
                        {isToday && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold animate-pulse">
                            TODAY
                          </span>
                        )}
                      </div>
                      {dayGroup.dailyGoal && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          🎯 {dayGroup.dailyGoal}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Day Progress Indicator */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {completedCount} / {totalCount} done
                      </span>
                      <span className="text-[10px] text-emerald-500 font-semibold">
                        {progressPercent}% Complete
                      </span>
                    </div>

                    <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* TASK ITEMS LIST */}
                <div className="p-4 flex flex-col gap-2.5">
                  {dayGroup.tasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2 text-center">
                      No specific tasks scheduled for this day yet. Tell AI to schedule tasks above!
                    </p>
                  ) : (
                    dayGroup.tasks.map(task => {
                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            task.completed
                              ? "bg-slate-100/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/50 opacity-60"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              onClick={() => handleToggleItem(task)}
                              className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                              title={task.completed ? "Mark Incomplete" : "Mark Done"}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  task.source === "homework"
                                    ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20"
                                    : task.source === "backlog"
                                    ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20"
                                    : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                                }`}>
                                  {task.category}
                                </span>
                                {task.subject && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {task.subject}
                                  </span>
                                )}
                              </div>
                              <h4 className={`text-xs sm:text-sm font-semibold truncate mt-1 ${
                                task.completed
                                  ? "line-through text-slate-400 dark:text-slate-500"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}>
                                {formatMathText(task.title)}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.timeSlot && (
                              <span className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                {task.timeSlot}
                              </span>
                            )}
                            {task.estimatedMinutes && (
                              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.estimatedMinutes}m
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
