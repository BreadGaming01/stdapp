import React, { useState } from "react";
import { DailyPlanner as PlannerType, CourseSyllabus, ScheduleBlock } from "../types";
import { 
  Sparkles, 
  CalendarDays, 
  Clock, 
  CheckCircle, 
  Circle, 
  HelpCircle, 
  AlertCircle, 
  Loader2, 
  BrainCircuit, 
  Smile 
} from "lucide-react";

interface DailyPlannerProps {
  planner: PlannerType;
  syllabus: CourseSyllabus[];
  onUpdatePlanner: (updatedPlanner: PlannerType) => void;
  theme?: "light" | "dark";
}

export default function DailyPlanner({ 
  planner, 
  syllabus, 
  onUpdatePlanner,
  theme = "dark"
}: DailyPlannerProps) {
  const [basicTasksInput, setBasicTasksInput] = useState(planner.basicTasks || "");
  const [isPlanning, setIsPlanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Handle schedule item checkbox toggle
  const handleToggleScheduleItem = (index: number) => {
    const updatedSchedule = planner.schedule.map((block, i) => {
      if (i === index) {
        return { ...block, completed: !block.completed };
      }
      return block;
    });

    onUpdatePlanner({
      ...planner,
      schedule: updatedSchedule
    });
  };

  // Consult Gemini AI to generate day plan
  const handleGenerateDayPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!basicTasksInput.trim()) return;

    setIsPlanning(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/gemini/plan-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicTasks: basicTasksInput.trim(),
          syllabus: syllabus.map(s => ({
            courseName: s.courseName,
            topics: s.topics.map(t => ({ name: t.name, status: t.status }))
          })),
          currentDate: new Date().toISOString().split("T")[0]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to organize daily planner");
      }

      const data = await response.json();
      if (data.success && data.planner) {
        const generated = data.planner;
        
        onUpdatePlanner({
          date: new Date().toISOString().split("T")[0],
          basicTasks: basicTasksInput.trim(),
          schedule: generated.schedule.map((block: any) => ({
            ...block,
            completed: false // Default to uncompleted
          })),
          aiAdvice: generated.aiAdvice || "Make sure to take hydration breaks and follow your Pomodoro intervals!"
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred. Please verify GEMINI_API_KEY.");
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="daily_planner_section">
      {/* LEFT: CONSULT GEMINI TO DESIGN THE DAY */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="planner_input_panel">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h3 className="font-bold text-sm text-slate-800">Decide Your Day with Gemini</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your basic goals, errands, or loose tasks. Gemini will cross-reference your active syllabus to build a high-performance time-blocked study day.
          </p>

          <form onSubmit={handleGenerateDayPlan} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Today's Intentions & Tasks</label>
              <textarea
                value={basicTasksInput}
                onChange={(e) => setBasicTasksInput(e.target.value)}
                placeholder="e.g. Read Chemistry chapter 2, go for a 30 min run, buy groceries, study vectors for Calculus exam."
                rows={4}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder-slate-400 font-medium"
                required
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs text-rose-600 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPlanning || !basicTasksInput.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shadow-indigo-100"
            >
              {isPlanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI Architecting Your Day...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Consult Gemini for Schedule
                </>
              )}
            </button>
          </form>
        </div>

        {/* AI COACHING ADVICE CARD */}
        {planner.aiAdvice && (
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 relative overflow-hidden" id="ai_coaching_advice">
            {/* Background glowing circle */}
            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-300">AI Coach Advice</h4>
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed italic relative z-10 whitespace-pre-line">
              "{planner.aiAdvice}"
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-[10px] text-slate-400 font-semibold relative z-10">
              <Smile className="w-3.5 h-3.5 text-emerald-400" />
              <span>Optimized syllabus pacing suggestions included</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: TIME-BLOCKED SCHEDULE SCREEN */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="planner_schedule_pane">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" /> Study Agenda Block
            </h2>
            <p className="text-xs text-slate-500 mt-1">Hourly time-blocks optimized for brain recovery and curriculum coverage</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        {planner.schedule.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center my-auto" id="empty_agenda_state">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No active agenda blocks</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Your hourly schedule is clear. Write down today's intentions on the left and consult Gemini to design your blocks.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3" id="agenda_blocks_list">
            {planner.schedule.map((block, index) => (
              <div 
                key={index}
                className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex items-center justify-between gap-4 transition-all ${
                  block.completed ? "opacity-60 bg-slate-50/50" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* TIME SLOT BULLET */}
                  <div className="shrink-0 text-center min-w-[110px] bg-indigo-50/50 border border-indigo-100 rounded-xl py-1.5 px-2 text-indigo-900">
                    <span className="text-[10px] font-bold block leading-none">TIME BLOCK</span>
                    <span className="text-[10px] font-mono font-bold block mt-1 tracking-tight">{block.timeSlot}</span>
                  </div>

                  {/* BLOCK DESCRIPTION */}
                  <div>
                    <p className={`text-xs font-bold text-slate-800 ${block.completed ? "line-through text-slate-400" : ""}`}>
                      {block.taskName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {block.isAIGenerated ? (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          AI Structured
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          Custom block
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* COMPLETE CHECK */}
                <button
                  onClick={() => handleToggleScheduleItem(index)}
                  className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer"
                  title="Toggle Block Completion"
                >
                  {block.completed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:border-slate-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
