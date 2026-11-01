import React, { useState, useMemo } from "react";
import { 
  Class10Subject, 
  SchoolHomework, 
  PreviousBacklog, 
  MasterStudyPlan, 
  DaySchedule, 
  DayPlanTask 
} from "../types";
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  AlertCircle, 
  BookOpen, 
  BrainCircuit, 
  Backpack, 
  History, 
  Printer, 
  Loader2, 
  ChevronRight, 
  Flame, 
  Target, 
  CheckCheck,
  CalendarDays,
  FileText,
  BadgeAlert,
  ArrowRight
} from "lucide-react";

interface Class10MasterPlannerProps {
  syllabus: Class10Subject[];
  homework: SchoolHomework[];
  backlogs: PreviousBacklog[];
  masterPlan: MasterStudyPlan | null;
  onUpdateHomework: (homework: SchoolHomework[]) => void;
  onUpdateBacklogs: (backlogs: PreviousBacklog[]) => void;
  onUpdateMasterPlan: (plan: MasterStudyPlan | null) => void;
  theme?: "light" | "dark";
  currentUser?: any;
}

export default function Class10MasterPlanner({
  syllabus,
  homework,
  backlogs,
  masterPlan,
  onUpdateHomework,
  onUpdateBacklogs,
  onUpdateMasterPlan,
  theme = "dark",
  currentUser
}: Class10MasterPlannerProps) {
  const [activeTab, setActiveTab] = useState<"roadmap" | "homework" | "backlogs" | "setup">("roadmap");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Planner setup inputs
  const [targetExamName, setTargetExamName] = useState("CBSE Class 10 Board / Pre-Board Examination");
  const [deadlineDate, setDeadlineDate] = useState(() => {
    // Default to 3 weeks ahead or existing masterPlan deadline
    if (masterPlan?.deadlineDate) return masterPlan.deadlineDate;
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().split("T")[0];
  });
  const [dailyWeekdayHours, setDailyWeekdayHours] = useState(4);
  const [dailyWeekendHours, setDailyWeekendHours] = useState(7);
  const [studentNotes, setStudentNotes] = useState("");

  // Homework modal / form state
  const [newHwSubject, setNewHwSubject] = useState("Mathematics");
  const [newHwTitle, setNewHwTitle] = useState("");
  const [newHwDueDate, setNewHwDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [newHwMinutes, setNewHwMinutes] = useState(45);
  const [newHwPriority, setNewHwPriority] = useState<"Urgent" | "Normal" | "Low">("Normal");

  // Backlogs form state
  const [newBlSubject, setNewBlSubject] = useState("Science");
  const [newBlTopic, setNewBlTopic] = useState("");
  const [newBlType, setNewBlType] = useState<"Theory" | "Questions Unsolved" | "Competency Pending" | "Missed Class" | "Revision Needed">("Questions Unsolved");
  const [newBlHours, setNewBlHours] = useState(2);
  const [newBlSeverity, setNewBlSeverity] = useState<"High" | "Medium" | "Low">("High");

  // Custom task form state for current day
  const [isAddingCustomTask, setIsAddingCustomTask] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskTime, setCustomTaskTime] = useState("07:00 PM - 08:00 PM");
  const [customTaskSubject, setCustomTaskSubject] = useState("Mathematics");
  const [customTaskCategory, setCustomTaskCategory] = useState<DayPlanTask["category"]>("Deep Study");

  // Compile full syllabus audit
  const syllabusAudit = useMemo(() => {
    return syllabus.map(sub => {
      const remaining: string[] = [];
      const partial: string[] = [];
      const completed: string[] = [];
      const competencyPending: string[] = [];
      const questionsPending: string[] = [];

      sub.chapters.forEach(ch => {
        if (ch.status === "Completely Done") {
          completed.push(ch.title);
        } else if (ch.status === "Partially Done") {
          partial.push(ch.title);
        } else {
          remaining.push(ch.title);
        }

        if (!ch.competencyDone) competencyPending.push(ch.title);
        if (!ch.questionsPracticed) questionsPending.push(ch.title);
      });

      return {
        id: sub.id,
        name: sub.name,
        remainingChapters: remaining,
        partialChapters: partial,
        completedChapters: completed,
        competencyPending,
        questionsPending,
        totalChapters: sub.chapters.length
      };
    });
  }, [syllabus]);

  // Overall audit counts
  const auditTotals = useMemo(() => {
    let remaining = 0;
    let partial = 0;
    let completed = 0;
    let competencyPending = 0;
    let questionsPending = 0;

    syllabusAudit.forEach(s => {
      remaining += s.remainingChapters.length;
      partial += s.partialChapters.length;
      completed += s.completedChapters.length;
      competencyPending += s.competencyPending.length;
      questionsPending += s.questionsPending.length;
    });

    return { remaining, partial, completed, competencyPending, questionsPending };
  }, [syllabusAudit]);

  // Trigger Gemini AI generation
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/gemini/generate-class10-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusAudit,
          homeworkList: homework.filter(h => !h.completed),
          backlogsList: backlogs.filter(b => !b.completed),
          deadlineDate,
          dailyStudyHoursWeekday: Number(dailyWeekdayHours),
          dailyStudyHoursWeekend: Number(dailyWeekendHours),
          targetExamName,
          studentNotes: studentNotes.trim()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate AI study plan");
      }

      const data = await response.json();
      if (data.success && data.masterPlan) {
        onUpdateMasterPlan(data.masterPlan);
        setActiveTab("roadmap");
        setActiveDayIndex(0);
      } else {
        throw new Error("Invalid response received from server");
      }
    } catch (err: any) {
      console.error("AI Planner error:", err);
      setErrorMsg(err.message || "An unexpected error occurred while contacting AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle task completion inside masterPlan
  const handleToggleTask = (dayIndex: number, taskId: string) => {
    if (!masterPlan) return;
    const updatedDays = masterPlan.days.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day;
      const updatedTasks = day.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, completed: !t.completed };
        }
        return t;
      });

      // Day is completed if all tasks are completed
      const allCompleted = updatedTasks.length > 0 && updatedTasks.every(t => t.completed);
      return { ...day, tasks: updatedTasks, completed: allCompleted };
    });

    onUpdateMasterPlan({
      ...masterPlan,
      days: updatedDays
    });
  };

  // Add custom task to active day
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPlan || !customTaskTitle.trim()) return;

    const newTask: DayPlanTask = {
      id: "custom_task_" + Date.now(),
      timeSlot: customTaskTime.trim() || "Evening Slot",
      subject: customTaskSubject,
      category: customTaskCategory,
      title: customTaskTitle.trim(),
      description: "Custom task scheduled by student",
      completed: false
    };

    const updatedDays = masterPlan.days.map((day, dIdx) => {
      if (dIdx !== activeDayIndex) return day;
      return {
        ...day,
        tasks: [...day.tasks, newTask]
      };
    });

    onUpdateMasterPlan({
      ...masterPlan,
      days: updatedDays
    });

    setCustomTaskTitle("");
    setIsAddingCustomTask(false);
  };

  // Homework actions
  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwTitle.trim()) return;

    const newHw: SchoolHomework = {
      id: "hw_" + Date.now(),
      subject: newHwSubject,
      title: newHwTitle.trim(),
      dueDate: newHwDueDate,
      estimatedMinutes: Number(newHwMinutes) || 45,
      priority: newHwPriority,
      completed: false,
      createdAt: new Date().toISOString()
    };

    onUpdateHomework([newHw, ...homework]);
    setNewHwTitle("");
  };

  const handleToggleHomework = (id: string) => {
    onUpdateHomework(homework.map(h => h.id === id ? { ...h, completed: !h.completed } : h));
  };

  const handleDeleteHomework = (id: string) => {
    onUpdateHomework(homework.filter(h => h.id !== id));
  };

  // Backlogs actions
  const handleAddBacklog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlTopic.trim()) return;

    const newBl: PreviousBacklog = {
      id: "bl_" + Date.now(),
      subject: newBlSubject,
      topic: newBlTopic.trim(),
      backlogType: newBlType,
      severity: newBlSeverity,
      estimatedHours: Number(newBlHours) || 2,
      completed: false,
      createdAt: new Date().toISOString()
    };

    onUpdateBacklogs([newBl, ...backlogs]);
    setNewBlTopic("");
  };

  const handleToggleBacklog = (id: string) => {
    onUpdateBacklogs(backlogs.map(b => b.id === id ? { ...b, completed: !b.completed } : b));
  };

  const handleDeleteBacklog = (id: string) => {
    onUpdateBacklogs(backlogs.filter(b => b.id !== id));
  };

  // Printable schedule view
  const handlePrintSchedule = () => {
    window.print();
  };

  // Compute active day stats
  const activeDay = masterPlan?.days[activeDayIndex] || null;
  const planStats = useMemo(() => {
    if (!masterPlan || !masterPlan.days.length) return { totalTasks: 0, completedTasks: 0, percent: 0 };
    let totalTasks = 0;
    let completedTasks = 0;
    masterPlan.days.forEach(d => {
      d.tasks.forEach(t => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });
    return {
      totalTasks,
      completedTasks,
      percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [masterPlan]);

  return (
    <div className="flex flex-col gap-6" id="class10_master_planner">
      {/* TOP HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Class 10 CBSE AI Day-Wise Master Planner
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
              Deadline-Driven Study Blueprint
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Gemini analyzes your <span className="text-indigo-300 font-semibold">{auditTotals.remaining} remaining chapters</span>, 
              <span className="text-amber-300 font-semibold"> {auditTotals.partial} in-progress chapters</span>, 
              <span className="text-cyan-300 font-semibold"> {auditTotals.competencyPending} competency gaps</span>, 
              plus pending school homework and past backlogs to craft a realistic, day-wise schedule.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab("setup")}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4 text-slate-400" />
              <span>Target &amp; Hours</span>
            </button>

            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-linear-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Building Day-Wise Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{masterPlan ? "Regenerate AI Plan" : "Generate Day-Wise Plan"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW RIBBON */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 backdrop-blur-xs rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-bold text-slate-400">Target Deadline</div>
            <div className="text-sm md:text-base font-extrabold text-white mt-0.5 truncate">{deadlineDate}</div>
            <div className="text-[10px] text-slate-400">Class 10 Milestone</div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-xs rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-bold text-amber-400">Active Homework</div>
            <div className="text-sm md:text-base font-extrabold text-amber-300 mt-0.5">
              {homework.filter(h => !h.completed).length} Pending
            </div>
            <div className="text-[10px] text-slate-400">Auto-slotted in evenings</div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-xs rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-bold text-rose-400">Past Backlogs</div>
            <div className="text-sm md:text-base font-extrabold text-rose-300 mt-0.5">
              {backlogs.filter(b => !b.completed).length} Unresolved
            </div>
            <div className="text-[10px] text-slate-400">Clearance slots scheduled</div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-xs rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Plan Progress</div>
            <div className="text-sm md:text-base font-extrabold text-emerald-400 mt-0.5">
              {planStats.completedTasks}/{planStats.totalTasks} Tasks ({planStats.percent}%)
            </div>
            <div className="text-[10px] text-slate-400">Checked off by you</div>
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "roadmap"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Day-Wise Schedule {masterPlan?.days ? `(${masterPlan.days.length} Days)` : ""}</span>
        </button>

        <button
          onClick={() => setActiveTab("homework")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "homework"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Backpack className="w-4 h-4" />
          <span>School Homework ({homework.filter(h => !h.completed).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("backlogs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "backlogs"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Previous Backlogs ({backlogs.filter(b => !b.completed).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("setup")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "setup"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Target Deadline &amp; Capacity</span>
        </button>

        {masterPlan && (
          <div className="ml-auto">
            <button
              onClick={handlePrintSchedule}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border border-slate-200 dark:border-slate-700"
              title="Print or Save Schedule as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB CONTENT: 1. ROADMAP (DAY-WISE SCHEDULE) */}
      {activeTab === "roadmap" && (
        <div className="flex flex-col gap-6">
          {!masterPlan ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center">
              <BrainCircuit className="w-12 h-12 text-indigo-500 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                No Day-Wise Plan Generated Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                Click below to have Gemini compile your Class 10th syllabus status, homework, and backlogs into a structured day-by-day plan up to {deadlineDate}.
              </p>
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate My Class 10 Plan Now</span>
              </button>
            </div>
          ) : (
            <>
              {/* STRATEGY SUMMARY BANNER */}
              {masterPlan.strategySummary && (
                <div className="p-4 md:p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-3.5">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide block mb-1">
                      AI Board Mentor Strategy:
                    </span>
                    {masterPlan.strategySummary}
                  </div>
                </div>
              )}

              {/* DAY SELECTOR PILLS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {masterPlan.days.map((day, idx) => {
                  const isSelected = activeDayIndex === idx;
                  const dayCompletedTasks = day.tasks.filter(t => t.completed).length;
                  const isDayDone = day.tasks.length > 0 && dayCompletedTasks === day.tasks.length;

                  return (
                    <button
                      key={day.dayNumber}
                      onClick={() => setActiveDayIndex(idx)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border flex flex-col items-start gap-0.5 min-w-[110px] ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                          : isDayDone
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>Day {day.dayNumber}</span>
                        {isDayDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <span className={`text-[10px] font-normal ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                        {day.dayName} • {day.date}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ACTIVE DAY CARD */}
              {activeDay && (
                <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  {/* Day Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          Day {activeDay.dayNumber} of {masterPlan.days.length}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {activeDay.dayName}, {activeDay.date}
                        </span>
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                        {activeDay.focusSubject}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        🎯 Target: <span className="font-medium text-slate-700 dark:text-slate-300">{activeDay.dailyGoal}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Planned Hours</div>
                        <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                          {activeDay.studyHoursTarget} hrs
                        </div>
                      </div>

                      <button
                        onClick={() => setIsAddingCustomTask(prev => !prev)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>

                  {/* CUSTOM TASK FORM */}
                  {isAddingCustomTask && (
                    <form onSubmit={handleAddCustomTask} className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                      <div className="text-xs font-bold text-slate-800 dark:text-white">Add Task to Day {activeDay.dayNumber}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={customTaskTitle}
                          onChange={(e) => setCustomTaskTitle(e.target.value)}
                          placeholder="Task title (e.g., Solve Science Chapter 3 Exemplar)"
                          className="sm:col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                          required
                        />
                        <input
                          type="text"
                          value={customTaskTime}
                          onChange={(e) => setCustomTaskTime(e.target.value)}
                          placeholder="Time slot (e.g. 05:00 PM - 06:15 PM)"
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={customTaskSubject}
                            onChange={(e) => setCustomTaskSubject(e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <option>Mathematics</option>
                            <option>Science</option>
                            <option>Social Science</option>
                            <option>English Language and Literature</option>
                            <option>Hindi Course A</option>
                          </select>

                          <select
                            value={customTaskCategory}
                            onChange={(e) => setCustomTaskCategory(e.target.value as any)}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <option>Deep Study</option>
                            <option>Competency Questions</option>
                            <option>NCERT Practice</option>
                            <option>School Homework</option>
                            <option>Backlog Clearance</option>
                            <option>Quick Revision</option>
                            <option>Break</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingCustomTask(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Tasks List */}
                  <div className="flex flex-col gap-3 mt-5">
                    {activeDay.tasks.map((task) => {
                      const isDone = !!task.completed;

                      // Badge styles for category
                      const categoryStyles: Record<string, string> = {
                        "Deep Study": "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
                        "Competency Questions": "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
                        "NCERT Practice": "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
                        "School Homework": "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                        "Backlog Clearance": "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                        "Quick Revision": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                        "Break": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      };

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(activeDayIndex, task.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 select-none ${
                            isDone
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 opacity-80"
                              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <button
                            type="button"
                            className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            }`}
                          >
                            {isDone && <CheckCheck className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                                {task.timeSlot}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryStyles[task.category] || categoryStyles["Deep Study"]}`}>
                                {task.category}
                              </span>

                              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {task.subject}
                              </span>
                            </div>

                            <h4 className={`text-sm font-bold leading-snug ${isDone ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. SCHOOL HOMEWORK */}
      {activeTab === "homework" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Add School Homework Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Backpack className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add School Homework</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log daily homework given in school. The AI scheduler reserves prime late-afternoon/early-evening study slots for your homework so it's always ready.
            </p>

            <form onSubmit={handleAddHomework} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                <select
                  value={newHwSubject}
                  onChange={(e) => setNewHwSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                >
                  <option>Mathematics</option>
                  <option>Science</option>
                  <option>Social Science</option>
                  <option>English Language and Literature</option>
                  <option>Hindi Course A</option>
                  <option>Computer Applications / IT</option>
                  <option>Other Subject</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Homework Details</label>
                <input
                  type="text"
                  value={newHwTitle}
                  onChange={(e) => setNewHwTitle(e.target.value)}
                  placeholder="e.g., Maths Exercise 4.3 Q1 to Q6 in register"
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newHwDueDate}
                    onChange={(e) => setNewHwDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    step="5"
                    value={newHwMinutes}
                    onChange={(e) => setNewHwMinutes(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Urgent", "Normal", "Low"] as const).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setNewHwPriority(p)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newHwPriority === p
                          ? p === "Urgent" 
                            ? "bg-rose-500 text-white border-rose-500 shadow-xs" 
                            : p === "Normal" 
                            ? "bg-amber-500 text-white border-amber-500 shadow-xs" 
                            : "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save School Homework</span>
              </button>
            </form>
          </div>

          {/* RIGHT: Active Homework List */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Upcoming Homework ({homework.filter(h => !h.completed).length})
              </h3>
              <span className="text-xs text-slate-400">
                {homework.filter(h => h.completed).length} completed
              </span>
            </div>

            {homework.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Backpack className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No school homework added yet. Log your daily homework on the left!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {homework.map(hw => (
                  <div
                    key={hw.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      hw.completed
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-70"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleHomework(hw.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                          hw.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {hw.completed && <CheckCheck className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {hw.subject}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            hw.priority === "Urgent" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" :
                            hw.priority === "Normal" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}>
                            {hw.priority}
                          </span>
                        </div>
                        <h4 className={`text-xs md:text-sm font-bold truncate ${hw.completed ? "line-through text-slate-500" : "text-slate-900 dark:text-white"}`}>
                          {hw.title}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Due: {hw.dueDate} • Est. {hw.estimatedMinutes} mins
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteHomework(hw.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                      title="Delete homework"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. PREVIOUS BACKLOGS */}
      {activeTab === "backlogs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Add Backlog Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Record Previous Backlog</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Don't let older chapters haunt you. Add topics you missed or skipped in school, and Gemini will insert dedicated daily clearance slots so you catch up painlessly.
            </p>

            <form onSubmit={handleAddBacklog} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                <select
                  value={newBlSubject}
                  onChange={(e) => setNewBlSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                >
                  <option>Mathematics</option>
                  <option>Science</option>
                  <option>Social Science</option>
                  <option>English Language and Literature</option>
                  <option>Hindi Course A</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Backlog Topic / Chapter</label>
                <input
                  type="text"
                  value={newBlTopic}
                  onChange={(e) => setNewBlTopic(e.target.value)}
                  placeholder="e.g., Light Refraction Lens numericals, or Nationalism in Europe notes"
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Backlog Type</label>
                  <select
                    value={newBlType}
                    onChange={(e) => setNewBlType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                  >
                    <option>Questions Unsolved</option>
                    <option>Theory</option>
                    <option>Competency Pending</option>
                    <option>Missed Class</option>
                    <option>Revision Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Est. Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={newBlHours}
                    onChange={(e) => setNewBlHours(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Severity / Urgency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["High", "Medium", "Low"] as const).map(sev => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setNewBlSeverity(sev)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newBlSeverity === sev
                          ? sev === "High"
                            ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                            : sev === "Medium"
                            ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                            : "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Backlog Tracker</span>
              </button>
            </form>
          </div>

          {/* RIGHT: Backlog List */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Pending Backlogs ({backlogs.filter(b => !b.completed).length})
              </h3>
              <span className="text-xs text-slate-400">
                {backlogs.filter(b => b.completed).length} cleared
              </span>
            </div>

            {backlogs.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800">
                <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No backlogs recorded! If you have missed topics or unpracticed exercises, log them on the left.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {backlogs.map(bl => (
                  <div
                    key={bl.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      bl.completed
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-70"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleBacklog(bl.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                          bl.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {bl.completed && <CheckCheck className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {bl.subject}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {bl.backlogType}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            bl.severity === "High" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" :
                            bl.severity === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}>
                            {bl.severity} Priority
                          </span>
                        </div>
                        <h4 className={`text-xs md:text-sm font-bold truncate ${bl.completed ? "line-through text-slate-500" : "text-slate-900 dark:text-white"}`}>
                          {bl.topic}
                        </h4>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Estimated effort: {bl.estimatedHours} hours
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBacklog(bl.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                      title="Delete backlog"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. PLANNER SETUP & DEADLINE */}
      {activeTab === "setup" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-3xl mx-auto shadow-sm flex flex-col gap-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Target Deadline &amp; Daily Study Capacity
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure your upcoming exam date, available weekday vs weekend study hours, and special notes so Gemini builds your optimal study timetable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Target Milestone / Exam Name
              </label>
              <input
                type="text"
                value={targetExamName}
                onChange={(e) => setTargetExamName(e.target.value)}
                placeholder="e.g. CBSE Class 10 Board Exam / Pre-Board 1"
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Target Deadline Date
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Weekday Daily Study Hours (After School)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                step="0.5"
                value={dailyWeekdayHours}
                onChange={(e) => setDailyWeekdayHours(Number(e.target.value))}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Weekend Daily Study Hours (Full Day)
              </label>
              <input
                type="number"
                min="2"
                max="16"
                step="0.5"
                value={dailyWeekendHours}
                onChange={(e) => setDailyWeekendHours(Number(e.target.value))}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Weak Subjects / Special Mentorship Notes for Gemini AI
            </label>
            <textarea
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="e.g., I am weak in Mathematics Trigonometry and Circles proofs. Need extra practice in Science Electricity numericals. Keep Hindi writing format revision towards the end."
              rows={3}
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={() => setActiveTab("roadmap")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Back to Schedule
            </button>
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Generate AI Plan With These Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
