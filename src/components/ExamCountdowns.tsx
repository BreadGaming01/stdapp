import React, { useState, useEffect } from "react";
import { ExamCountdown } from "../types";
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Plus, 
  BellRing, 
  BookOpen, 
  AlertCircle 
} from "lucide-react";

interface ExamCountdownsProps {
  countdowns: ExamCountdown[];
  onAddCountdown: (newCountdown: ExamCountdown) => void;
  onDeleteCountdown: (id: string) => void;
  coursesList: string[];
  theme?: "light" | "dark";
}

export default function ExamCountdowns({ 
  countdowns, 
  onAddCountdown, 
  onDeleteCountdown,
  coursesList,
  theme = "dark"
}: ExamCountdownsProps) {
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState("");

  const [tick, setTick] = useState(0);

  // Force tick re-render every second for real-time countdown calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate) return;

    const newCD: ExamCountdown = {
      id: "countdown_" + Date.now(),
      title: title.trim(),
      examDate: new Date(examDate).toISOString(),
      subject: subject || (coursesList.length > 0 ? coursesList[0] : "General Subject")
    };

    onAddCountdown(newCD);
    setTitle("");
    setExamDate("");
    setSubject("");
  };

  // Helper function to parse seconds into structured duration
  const getRemainingTime = (targetDateStr: string) => {
    const diffMs = new Date(targetDateStr).getTime() - Date.now();
    
    if (diffMs <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { total: totalSeconds, days, hours, minutes, seconds, isPassed: false };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="countdowns_section">
      {/* LEFT: LIVE COUNTDOWN CARDS */}
      <div className="lg:col-span-8 flex flex-col gap-6" id="countdown_clocks_pane">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-indigo-600 animate-pulse" /> Exam Countdown Timers
          </h2>
          <p className="text-xs text-slate-500 mt-1">Stay focused and pace your syllabus coverage before the clock runs out</p>
        </div>

        {countdowns.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center" id="empty_countdown_state">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No countdown clocks created</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Specify your upcoming midterm and final dates using the scheduler sidebar to see real-time countdown widgets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="countdown_cards_grid">
            {countdowns.map((cd) => {
              const time = getRemainingTime(cd.examDate);
              const formattedDate = new Date(cd.examDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div 
                  key={cd.id} 
                  className={`rounded-2xl border p-5 flex flex-col gap-4 relative overflow-hidden transition-all ${
                    time.isPassed 
                      ? "bg-slate-50 border-slate-100 opacity-60" 
                      : time.days <= 3 
                        ? "bg-gradient-to-br from-rose-50/50 to-white border-rose-200/60 shadow-xs shadow-rose-50"
                        : "bg-white border-slate-100 shadow-xs"
                  }`}
                  id={`countdown_widget_${cd.id}`}
                >
                  {/* URGENCY ALERT BANNER */}
                  {!time.isPassed && time.days <= 3 && (
                    <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {cd.subject}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-2">{cd.title}</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{formattedDate}</p>
                    </div>

                    <button
                      onClick={() => onDeleteCountdown(cd.id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-all"
                      title="Delete Countdown"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* TICKING GRID */}
                  {time.isPassed ? (
                    <div className="bg-slate-100 rounded-xl py-3 text-center text-xs font-bold text-slate-500 border border-slate-200">
                      Exam Session Completed or Commenced!
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-center" id={`ticking_values_for_${cd.id}`}>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-1">
                        <span className="block text-lg font-mono font-bold text-slate-800 leading-none">
                          {time.days.toString().padStart(2, "0")}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1 block">Days</span>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-1">
                        <span className="block text-lg font-mono font-bold text-slate-800 leading-none">
                          {time.hours.toString().padStart(2, "0")}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1 block">Hours</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-1">
                        <span className="block text-lg font-mono font-bold text-slate-800 leading-none">
                          {time.minutes.toString().padStart(2, "0")}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1 block">Mins</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-1">
                        <span className={`block text-lg font-mono font-bold leading-none ${time.days <= 1 ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
                          {time.seconds.toString().padStart(2, "0")}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1 block">Secs</span>
                      </div>
                    </div>
                  )}

                  {!time.isPassed && time.days <= 3 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-2.5 py-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Less than 3 days left! Focus your Pomodoros on key course syllabus now.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: CREATE COUNTDOWN FORM */}
      <div className="lg:col-span-4" id="countdown_creation_pane">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-slate-400" /> Create Timer
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Exam / Review Event Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AP Biology Final"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Affiliated Course</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium cursor-pointer"
              >
                {coursesList.length > 0 ? (
                  coursesList.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))
                ) : (
                  <option value="General Study">General Study</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Exam Date & Time</label>
              <input
                type="datetime-local"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!title.trim() || !examDate}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              Initialize Countdown
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
