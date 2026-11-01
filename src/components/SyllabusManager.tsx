import React, { useState } from "react";
import { CourseSyllabus, Topic } from "../types";
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  HelpCircle, 
  Calendar, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

interface SyllabusManagerProps {
  syllabus: CourseSyllabus[];
  onAddCourse: (course: CourseSyllabus) => void;
  onUpdateTopics: (courseId: string, topics: Topic[]) => void;
  onDeleteCourse: (courseId: string) => void;
  theme?: "light" | "dark";
}

export default function SyllabusManager({ 
  syllabus, 
  onAddCourse, 
  onUpdateTopics, 
  onDeleteCourse,
  theme = "dark"
}: SyllabusManagerProps) {
  // New manual course state
  const [newCourseName, setNewCourseName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");

  // Gemini Syllabus Generation states
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Manual course creation
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const course: CourseSyllabus = {
      id: "course_" + Date.now(),
      courseName: newCourseName,
      topics: [
        { name: "Overview & Introductions", status: "Not Started" },
        { name: "Core Fundamentals", status: "Not Started" }
      ],
      examDate: newExamDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    onAddCourse(course);
    setNewCourseName("");
    setNewExamDate("");
  };

  // Gemini AI syllabus generation
  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/gemini/generate-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate syllabus outline");
      }

      const data = await response.json();
      if (data.success && data.syllabus) {
        const generated = data.syllabus;
        
        // Transform topic array of strings into Topic objects
        const topicsObj: Topic[] = generated.topics.map((tName: string) => ({
          name: tName,
          status: "Not Started"
        }));

        const course: CourseSyllabus = {
          id: "course_" + Date.now(),
          courseName: generated.courseName || aiPrompt,
          topics: topicsObj.length > 0 ? topicsObj : [{ name: "Topic 1: Intro", status: "Not Started" }],
          examDate: generated.examDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        };

        onAddCourse(course);
        setAiPrompt("");
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred. Please make sure GEMINI_API_KEY is configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle individual topic state in the list
  const handleToggleTopicStatus = (courseId: string, topicName: string, currentStatus: "Not Started" | "In Progress" | "Completed") => {
    const targetCourse = syllabus.find(c => c.id === courseId);
    if (!targetCourse) return;

    const nextStatusMap: Record<string, "Not Started" | "In Progress" | "Completed"> = {
      "Not Started": "In Progress",
      "In Progress": "Completed",
      "Completed": "Not Started"
    };

    const updatedTopics = targetCourse.topics.map(topic => {
      if (topic.name === topicName) {
        return { ...topic, status: nextStatusMap[currentStatus] };
      }
      return topic;
    });

    onUpdateTopics(courseId, updatedTopics);
  };

  // Calculate syllabus progress
  const getProgressPercentage = (topics: Topic[]) => {
    if (topics.length === 0) return 0;
    const completed = topics.filter(t => t.status === "Completed").length;
    const inProgress = topics.filter(t => t.status === "In Progress").length;
    return Math.round(((completed + inProgress * 0.5) / topics.length) * 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="syllabus_section">
      {/* LEFT COLUMN: ACTIVE SYLLABUSES & PROGRESS */}
      <div className="lg:col-span-7 flex flex-col gap-6" id="syllabuses_list_pane">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Syllabus Tracker
            </h2>
            <p className="text-xs text-slate-500 mt-1">Track subjects, modules, and current preparation level</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            {syllabus.length} Active Courses
          </span>
        </div>

        {syllabus.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center" id="empty_syllabus_state">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No courses loaded in your planner</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Use the Gemini Syllabus Generator or add a custom course outline in the side panel to begin tracking.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6" id="syllabus_courses_accordion">
            {syllabus.map((course) => {
              const progress = getProgressPercentage(course.topics);
              return (
                <div 
                  key={course.id} 
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col gap-4 transition-all"
                  id={`course_card_${course.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-base">{course.courseName}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Exam: {new Date(course.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span>•</span>
                        <span>{course.topics.length} topics total</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteCourse(course.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Remove Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="w-full">
                    <div className="flex justify-between items-center text-xs text-slate-600 font-semibold mb-1">
                      <span>Course Preparation Progress</span>
                      <span className={progress === 100 ? "text-emerald-600" : "text-indigo-600"}>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          progress === 100 ? "bg-emerald-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* TOPIC LIST */}
                  <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Modules & Topics (Click status to toggle):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {course.topics.map((topic) => (
                        <button
                          key={topic.name}
                          onClick={() => handleToggleTopicStatus(course.id, topic.name, topic.status)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                            topic.status === "Completed"
                              ? "bg-emerald-50/40 border-emerald-100 text-emerald-800 hover:bg-emerald-50"
                              : topic.status === "In Progress"
                                ? "bg-amber-50/40 border-amber-100 text-amber-800 hover:bg-amber-50"
                                : "bg-slate-50/40 border-slate-100 text-slate-700 hover:bg-slate-100/60"
                          }`}
                        >
                          {topic.status === "Completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : topic.status === "In Progress" ? (
                            <Circle className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div className="truncate pr-1">
                            <span className="text-xs font-semibold block truncate">{topic.name}</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">{topic.status}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: AI GENERATOR & MANUAL ENTRY */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="syllabus_creation_pane">
        {/* GEMINI AI SYLLABUS CARD */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800" id="gemini_syllabus_builder">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-400/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Automate via Gemini AI</h3>
              <p className="text-[10px] text-indigo-200">Give a course or topic, Gemini builds a full outline</p>
            </div>
          </div>

          <form onSubmit={handleAiGenerate} className="flex flex-col gap-3 mt-4">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., 'Modern European History from 1800 to 1950, with 6 core study modules'"
              rows={3}
              className="w-full text-xs p-3 bg-slate-800/80 border border-slate-700 rounded-xl focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-slate-100 placeholder-slate-400"
              required
            />
            
            {errorMsg && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-[11px] text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Syllabus...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Study Plan
                </>
              )}
            </button>
          </form>
          <div className="mt-4 border-t border-slate-800 pt-3 text-[10px] text-slate-400 flex items-center gap-1.5 justify-center">
            <span>Powered by</span>
            <span className="font-semibold text-indigo-300">gemini-3.5-flash</span>
          </div>
        </div>

        {/* MANUAL CREATION CARD */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm" id="manual_syllabus_builder">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-sm text-slate-800">Add Course Manually</h3>
          </div>

          <form onSubmit={handleManualAdd} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Subject / Course Title</label>
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="e.g., Introduction to Chemistry"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 placeholder-slate-400 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Exam Date (Optional)</label>
              <input
                type="date"
                value={newExamDate}
                onChange={(e) => setNewExamDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={!newCourseName.trim()}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              Add Starter Subject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
