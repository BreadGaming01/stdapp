import React, { useState, useEffect, useRef } from "react";
import { PomodoroRecord } from "../types";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Award, 
  Flame, 
  TrendingUp, 
  Clock, 
  Coffee 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from "recharts";

interface PomodoroTimerProps {
  pomodoros: PomodoroRecord[];
  onAddRecord: (record: PomodoroRecord) => void;
  theme?: "light" | "dark";
}

export default function PomodoroTimer({ pomodoros, onAddRecord, theme = "dark" }: PomodoroTimerProps) {
  // Timer state
  const [mode, setMode] = useState<"work" | "short-break" | "long-break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [presetDuration, setPresetDuration] = useState(25); // minutes

  // Customize custom timers
  const [customWork, setCustomWork] = useState(25);
  const [customShort, setCustomShort] = useState(5);
  const [customLong, setCustomLong] = useState(15);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync mode changes with durations
  useEffect(() => {
    let mins = 25;
    if (mode === "work") mins = customWork;
    else if (mode === "short-break") mins = customShort;
    else if (mode === "long-break") mins = customLong;
    
    setTimeLeft(mins * 60);
    setPresetDuration(mins);
    setIsRunning(false);
  }, [mode, customWork, customShort, customLong]);

  // Audio simulation (using visual feedback & browser synthesizer safely if allowed)
  const playPing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context blocked by browser permission policy", e);
    }
  };

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playPing();
            
            // Log study session completion
            const record: PomodoroRecord = {
              id: "p_" + Date.now(),
              timestamp: new Date().toISOString(),
              durationMinutes: presetDuration,
              type: mode,
              completed: true
            };
            onAddRecord(record);
            
            // Automatic transitions
            if (mode === "work") {
              alert("Great focus! Time for a short break.");
              setMode("short-break");
            } else {
              alert("Break's over! Let's get back to work.");
              setMode("work");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, presetDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(presetDuration * 60);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Progress percentage
  const totalSeconds = presetDuration * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  // --- ANALYTICS CALCULATIONS ---
  const totalWorkMinutes = pomodoros
    .filter(p => p.type === "work" && p.completed)
    .reduce((acc, p) => acc + p.durationMinutes, 0);

  const totalSessionsCount = pomodoros.filter(p => p.completed).length;
  const workSessionsCount = pomodoros.filter(p => p.type === "work" && p.completed).length;

  // Group by date (last 7 days)
  const getDailyTrends = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const dayMins = pomodoros
        .filter(p => p.timestamp.startsWith(dateStr) && p.type === "work" && p.completed)
        .reduce((sum, p) => sum + p.durationMinutes, 0);

      const displayDate = new Date(dateStr).toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "numeric", 
        day: "numeric" 
      });

      return {
        date: displayDate,
        minutes: dayMins,
        rawDate: dateStr
      };
    });
  };

  const dailyTrendsData = getDailyTrends();

  // Mode breakdown for Pie Chart
  const getModeBreakdown = () => {
    const work = pomodoros.filter(p => p.type === "work" && p.completed).reduce((sum, p) => sum + p.durationMinutes, 0);
    const short = pomodoros.filter(p => p.type === "short-break" && p.completed).reduce((sum, p) => sum + p.durationMinutes, 0);
    const long = pomodoros.filter(p => p.type === "long-break" && p.completed).reduce((sum, p) => sum + p.durationMinutes, 0);

    return [
      { name: "Focus Work", value: work, color: "#f43f5e" },
      { name: "Short Break", value: short, color: "#10b981" },
      { name: "Long Break", value: long, color: "#3b82f6" }
    ].filter(item => item.value > 0);
  };

  const pieData = getModeBreakdown();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="pomodoro_section">
      {/* LEFT: TIMER CONTROL CARD */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center justify-between min-h-[500px]" id="timer_control_card">
        <div className="w-full text-center">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-rose-500 animate-pulse" /> Focus Zone
          </h2>
          <p className="text-xs text-slate-500 mt-1">Sustain deep attention with standard interval loops</p>
        </div>

        {/* MODE TOGGLES */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-xs mt-6" id="timer_mode_tabs">
          <button
            onClick={() => setMode("work")}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              mode === "work" 
                ? "bg-white text-rose-600 shadow-sm" 
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Work (Focus)
          </button>
          <button
            onClick={() => setMode("short-break")}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              mode === "short-break" 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Short Break
          </button>
          <button
            onClick={() => setMode("long-break")}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              mode === "long-break" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Long Break
          </button>
        </div>

        {/* PROGRESS CIRCLE */}
        <div className="relative my-8 flex items-center justify-center w-56 h-56" id="timer_clock_display">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="112"
              cy="112"
              r="96"
              className="stroke-slate-100"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Active progress ring */}
            <circle
              cx="112"
              cy="112"
              r="96"
              className={`transition-all duration-1000 ${
                mode === "work" 
                  ? "stroke-rose-500" 
                  : mode === "short-break" 
                    ? "stroke-emerald-500" 
                    : "stroke-blue-500"
              }`}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - progressPercent / 100)}
              strokeLinecap="round"
            />
          </svg>

          {/* Time & status text inside the circle */}
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-mono font-bold text-slate-800 tracking-tight">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-xs font-medium uppercase mt-1 tracking-wider ${
              mode === "work" 
                ? "text-rose-500" 
                : mode === "short-break" 
                  ? "text-emerald-500" 
                  : "text-blue-500"
            }`}>
              {mode === "work" ? "Focusing" : "Resting"}
            </span>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex gap-4 w-full justify-center" id="timer_action_buttons">
          <button
            onClick={toggleTimer}
            className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
              isRunning 
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                : mode === "work" 
                  ? "bg-rose-600 hover:bg-rose-700 text-white" 
                  : mode === "short-break" 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Pause" : "Start Focus"}
          </button>
          
          <button
            onClick={resetTimer}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* CUSTOM DURATION FORM */}
        <div className="w-full border-t border-slate-100 mt-6 pt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Configure custom intervals (mins):</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Work</label>
              <input 
                type="number" 
                value={customWork} 
                onChange={(e) => setCustomWork(Math.max(1, parseInt(e.target.value) || 25))}
                className="w-full text-center text-xs py-1.5 px-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">S. Break</label>
              <input 
                type="number" 
                value={customShort} 
                onChange={(e) => setCustomShort(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-full text-center text-xs py-1.5 px-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">L. Break</label>
              <input 
                type="number" 
                value={customLong} 
                onChange={(e) => setCustomLong(Math.max(1, parseInt(e.target.value) || 15))}
                className="w-full text-center text-xs py-1.5 px-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: ANALYTICS & STATS DASHBOARD */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="timer_analytics_dashboard">
        {/* TOP STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="pomodoro_quick_stats">
          <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-2xl p-4 border border-rose-100 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white text-rose-500 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Focus Completed</p>
              <h3 className="text-xl font-bold text-slate-800">{totalWorkMinutes} mins</h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white text-emerald-500 shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Total Loops</p>
              <h3 className="text-xl font-bold text-slate-800">{totalSessionsCount} intervals</h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 border border-indigo-100 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white text-indigo-500 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Work Sessions</p>
              <h3 className="text-xl font-bold text-slate-800">{workSessionsCount} focus blocks</h3>
            </div>
          </div>
        </div>

        {/* ANALYTICS PLOTS */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex-1" id="timer_charts_container">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-rose-500" /> Focus Trend (Last 7 Days)
          </h3>
          <div className="h-44 w-full" id="daily_study_trend_chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendsData}>
                <XAxis dataKey="date" tickLine={false} style={{ fontSize: "10px", fill: "#64748b" }} />
                <YAxis allowDecimals={false} style={{ fontSize: "10px", fill: "#64748b" }} />
                <Tooltip 
                  contentStyle={{ background: "#1e293b", color: "#fff", borderRadius: "8px", fontSize: "11px" }}
                  cursor={{ fill: "rgba(244, 63, 94, 0.05)" }}
                />
                <Bar dataKey="minutes" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  {dailyTrendsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.rawDate === new Date().toISOString().split("T")[0] ? "#e11d48" : "#fb7185"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-t border-slate-100 mt-6 pt-6" id="pomodoro_breakdown_section">
            <div className="md:col-span-5 flex flex-col justify-center">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Work vs. Recovery Break Ratio</h4>
              <p className="text-xs text-slate-500 mb-4">A balanced ratio of work and break intervals keeps brain cells rejuvenated and improves cognitive agility.</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Focus Work
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Short Break
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Long Break
                </div>
              </div>
            </div>

            <div className="md:col-span-7 flex justify-center items-center h-32" id="breakdown_pie_chart">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ background: "#1e293b", color: "#fff", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-slate-400 py-6">
                  No focus/break session completed yet. Complete a Pomodoro block to render ratio breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
