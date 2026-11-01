import React, { useState, useMemo } from "react";
import { Class10Subject, Class10Chapter, ChapterStatus } from "../types";
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Sparkles, 
  HelpCircle, 
  BarChart3, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Filter,
  Flame,
  Brain,
  FileCheck2,
  GraduationCap,
  Folder,
  FolderOpen,
  FolderClosed,
  ChevronRight,
  Plus,
  Minus
} from "lucide-react";

interface Class10SyllabusTrackerProps {
  subjects: Class10Subject[];
  onUpdateChapter: (subjectId: string, chapterId: string, updates: Partial<Class10Chapter>) => void;
  onBatchUpdateStatus?: (subjectId: string, status: ChapterStatus) => void;
  onOpenStudyPlanner?: () => void;
  theme?: "light" | "dark";
}

// Clean math string formatter helper
export const formatMathText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/sart\s*\(([^)]+)\)/gi, "√$1")
    .replace(/sqrt\s*\(([^)]+)\)/gi, "√$1")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^n\b/g, "ⁿ")
    .replace(/x\^2/gi, "x²")
    .replace(/ax\^2/gi, "ax²")
    .replace(/\bpi\b/gi, "π")
    .replace(/\btheta\b/gi, "θ");
};

// Automatic folder unit resolver
export const getChapterUnitFolder = (subjectId: string, chapterNumber: number, title: string, customUnit?: string): string => {
  if (customUnit) return customUnit;
  if (subjectId === "maths") {
    if (chapterNumber === 1) return "Unit 1: Number Systems";
    if (chapterNumber >= 2 && chapterNumber <= 5) return "Unit 2: Algebra";
    if (chapterNumber === 7) return "Unit 3: Coordinate Geometry";
    if (chapterNumber === 6 || chapterNumber === 10) return "Unit 4: Geometry";
    if (chapterNumber === 8 || chapterNumber === 9) return "Unit 5: Trigonometry";
    if (chapterNumber === 11 || chapterNumber === 12) return "Unit 6: Mensuration";
    if (chapterNumber >= 13) return "Unit 7: Statistics & Probability";
  } else if (subjectId === "science") {
    if (chapterNumber >= 1 && chapterNumber <= 4) return "Unit 1: Chemical Substances - Nature & Behaviour";
    if (chapterNumber >= 5 && chapterNumber <= 8) return "Unit 2: World of Living (Biology)";
    if (chapterNumber === 9 || chapterNumber === 10) return "Unit 3: Natural Phenomena (Physics)";
    if (chapterNumber === 11 || chapterNumber === 12) return "Unit 4: Effects of Current (Physics)";
    if (chapterNumber >= 13) return "Unit 5: Natural Resources";
  } else if (subjectId === "sst" || subjectId === "social") {
    if (chapterNumber >= 1 && chapterNumber <= 5) return "Folder 1: History - India & Contemporary World II";
    if (chapterNumber >= 6 && chapterNumber <= 12) return "Folder 2: Geography - Contemporary India II";
    if (chapterNumber >= 13 && chapterNumber <= 17) return "Folder 3: Democratic Politics II (Civics)";
    if (chapterNumber >= 18) return "Folder 4: Understanding Economic Development (Economics)";
  } else if (subjectId === "english") {
    if (chapterNumber >= 1 && chapterNumber <= 9) return "Folder 1: First Flight (Prose)";
    if (chapterNumber >= 10 && chapterNumber <= 19) return "Folder 2: First Flight (Poetry)";
    if (chapterNumber >= 20 && chapterNumber <= 28) return "Folder 3: Footprints Without Feet (Supplementary)";
    if (chapterNumber >= 29) return "Folder 4: Grammar & Creative Writing";
  } else if (subjectId === "hindi_a" || subjectId === "hindi") {
    if (chapterNumber >= 1 && chapterNumber <= 6) return "Folder 1: क्षितिज भाग 2 (काव्य खंड - Poetry)";
    if (chapterNumber >= 7 && chapterNumber <= 12) return "Folder 2: क्षितिज भाग 2 (गद्य खंड - Prose)";
    if (chapterNumber >= 13 && chapterNumber <= 15) return "Folder 3: कृतिका भाग 2 (पूरक पाठ्यपुस्तक)";
    if (chapterNumber >= 16) return "Folder 4: व्याकरण एवं रचनात्मक लेखन";
  }
  return "General Unit";
};

export default function Class10SyllabusTracker({
  subjects,
  onUpdateChapter,
  onOpenStudyPlanner,
  theme = "dark"
}: Class10SyllabusTrackerProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChapterStatus | "competency-pending" | "questions-pending">("all");
  
  // Track open folders (defaults to all open or first open)
  const [openFolders, setOpenFolders] = useState<{ [folderKey: string]: boolean }>({});
  const [expandedChapterIds, setExpandedChapterIds] = useState<{ [id: string]: boolean }>({});

  const toggleFolder = (folderKey: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderKey]: prev[folderKey] === undefined ? false : !prev[folderKey]
    }));
  };

  const isFolderOpen = (folderKey: string) => {
    return openFolders[folderKey] !== false; // Default open
  };

  const handleExpandAllFolders = (expand: boolean) => {
    const next: { [k: string]: boolean } = {};
    folderGroups.forEach(g => {
      next[g.folderKey] = expand;
    });
    setOpenFolders(next);
  };

  const toggleExpandChapter = (id: string) => {
    setExpandedChapterIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute aggregate statistics
  const stats = useMemo(() => {
    let totalChapters = 0;
    let completed = 0;
    let partial = 0;
    let remaining = 0;
    let competencyDoneCount = 0;
    let questionsDoneCount = 0;
    let pyqsDoneCount = 0;

    const subjectBreakdown: { [id: string]: { name: string; total: number; done: number; partial: number; color: string } } = {};

    subjects.forEach(sub => {
      let subDone = 0;
      let subPartial = 0;
      sub.chapters.forEach(ch => {
        totalChapters++;
        if (ch.status === "Completely Done") {
          completed++;
          subDone++;
        } else if (ch.status === "Partially Done") {
          partial++;
          subPartial++;
        } else {
          remaining++;
        }

        if (ch.competencyDone) competencyDoneCount++;
        if (ch.questionsPracticed) questionsDoneCount++;
        if (ch.pyqsDone) pyqsDoneCount++;
      });

      subjectBreakdown[sub.id] = {
        name: sub.name,
        total: sub.chapters.length,
        done: subDone,
        partial: subPartial,
        color: sub.color
      };
    });

    const completionRate = totalChapters > 0 
      ? Math.round(((completed + partial * 0.5) / totalChapters) * 100) 
      : 0;

    const competencyRate = totalChapters > 0
      ? Math.round((competencyDoneCount / totalChapters) * 100)
      : 0;

    return {
      totalChapters,
      completed,
      partial,
      remaining,
      competencyDoneCount,
      questionsDoneCount,
      pyqsDoneCount,
      completionRate,
      competencyRate,
      subjectBreakdown
    };
  }, [subjects]);

  // Group chapters by Subject and Folder/Unit
  const folderGroups = useMemo(() => {
    const groups: {
      folderKey: string;
      subjectId: string;
      subjectName: string;
      folderName: string;
      color: string;
      chapters: { subject: Class10Subject; chapter: Class10Chapter }[];
      doneCount: number;
      totalCount: number;
    }[] = [];

    const groupMap = new Map<string, typeof groups[0]>();

    subjects.forEach(sub => {
      if (selectedSubjectId !== "all" && sub.id !== selectedSubjectId) {
        return;
      }

      sub.chapters.forEach(ch => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = ch.title.toLowerCase().includes(q);
          const matchSubtopics = ch.subTopics?.some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchSubtopics) return;
        }

        // Status filter
        if (statusFilter === "competency-pending" && ch.competencyDone) {
          return;
        } else if (statusFilter === "questions-pending" && ch.questionsPracticed) {
          return;
        } else if (statusFilter !== "all" && statusFilter !== "competency-pending" && statusFilter !== "questions-pending") {
          if (ch.status !== statusFilter) return;
        }

        const folderName = getChapterUnitFolder(sub.id, ch.chapterNumber, ch.title, ch.unit);
        const folderKey = `${sub.id}__${folderName}`;

        if (!groupMap.has(folderKey)) {
          const newGroup = {
            folderKey,
            subjectId: sub.id,
            subjectName: sub.name,
            folderName,
            color: sub.color,
            chapters: [],
            doneCount: 0,
            totalCount: 0
          };
          groupMap.set(folderKey, newGroup);
          groups.push(newGroup);
        }

        const g = groupMap.get(folderKey)!;
        g.chapters.push({ subject: sub, chapter: ch });
        g.totalCount++;
        if (ch.status === "Completely Done") {
          g.doneCount++;
        } else if (ch.status === "Partially Done") {
          g.doneCount += 0.5;
        }
      });
    });

    return groups;
  }, [subjects, selectedSubjectId, searchQuery, statusFilter]);

  const totalFilteredChaptersCount = useMemo(() => {
    return folderGroups.reduce((acc, g) => acc + g.chapters.length, 0);
  }, [folderGroups]);

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn" id="class10_syllabus_tracker">
      {/* HERO BANNER & STATS */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border border-indigo-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                CBSE Board Exam 2026 Ready
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Organized Folder Trees
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Class 10 Syllabus &amp; Topic Question Vault</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Track your exact completion status across all 5 core CBSE Class 10 subjects. Open and study only the required folders and chapters on demand.
            </p>
          </div>

          {onOpenStudyPlanner && (
            <button
              onClick={onOpenStudyPlanner}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0 self-start md:self-center"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Day-Wise AI Plan</span>
            </button>
          )}
        </div>

        {/* PROGRESS METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Syllabus Covered</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-white">{stats.completionRate}%</span>
              <span className="text-[10px] text-slate-400">({stats.completed}/{stats.totalChapters} done)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Competency Questions</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-indigo-400">{stats.competencyRate}%</span>
              <span className="text-[10px] text-slate-400">({stats.competencyDoneCount} chs)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.competencyRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Standard Questions</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-cyan-400">{stats.questionsDoneCount}</span>
              <span className="text-[10px] text-slate-400">/ {stats.totalChapters} chapters</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">NCERT In-text &amp; Back Exercises</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Remaining Backlog</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-rose-400">{stats.remaining}</span>
              <span className="text-[10px] text-slate-400">chapters unstarted</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">Target priority clearance</p>
          </div>
        </div>
      </div>

      {/* SUBJECT SELECTOR TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setSelectedSubjectId("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            selectedSubjectId === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>All 5 Subjects</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-mono">
            {stats.totalChapters}
          </span>
        </button>

        {subjects.map(sub => {
          const subStat = stats.subjectBreakdown[sub.id];
          const percent = subStat && subStat.total > 0 
            ? Math.round(((subStat.done + subStat.partial * 0.5) / subStat.total) * 100) 
            : 0;

          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                selectedSubjectId === sub.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{sub.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/80 font-mono">
                {percent}%
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters, formulas, or topics (e.g. √5, Quadratic, Life Processes, सूरदास)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === "all"
                ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All ({totalFilteredChaptersCount})
          </button>
          <button
            onClick={() => setStatusFilter("Remaining")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === "Remaining"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60"
            }`}
          >
            Remaining
          </button>
          <button
            onClick={() => setStatusFilter("Partially Done")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === "Partially Done"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60"
            }`}
          >
            Partially Done
          </button>
          <button
            onClick={() => setStatusFilter("Completely Done")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === "Completely Done"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter("competency-pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              statusFilter === "competency-pending"
                ? "bg-indigo-600 text-white"
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
            }`}
          >
            Needs Competency Qs
          </button>
        </div>
      </div>

      {/* FOLDER EXPAND/COLLAPSE CONTROLS */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="font-semibold">
          Showing {folderGroups.length} topic folders ({totalFilteredChaptersCount} chapters)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExpandAllFolders(true)}
            className="hover:text-indigo-500 font-bold transition cursor-pointer flex items-center gap-1"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Expand All</span>
          </button>
          <span>•</span>
          <button
            onClick={() => handleExpandAllFolders(false)}
            className="hover:text-indigo-500 font-bold transition cursor-pointer flex items-center gap-1"
          >
            <FolderClosed className="w-3.5 h-3.5" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* FOLDER TREES / ACCORDIONS */}
      <div className="flex flex-col gap-4">
        {folderGroups.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No chapters match your criteria</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or switching filters.</p>
          </div>
        ) : (
          folderGroups.map(group => {
            const isOpen = isFolderOpen(group.folderKey);
            const folderPercent = group.totalCount > 0 ? Math.round((group.doneCount / group.totalCount) * 100) : 0;

            return (
              <div
                key={group.folderKey}
                className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* FOLDER ACCORDION HEADER */}
                <button
                  onClick={() => toggleFolder(group.folderKey)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                      {isOpen ? <FolderOpen className="w-5 h-5" /> : <FolderClosed className="w-5 h-5" />}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {group.subjectName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold font-mono">
                          {group.chapters.length} {group.chapters.length === 1 ? "chapter" : "chapters"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                        {group.folderName}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Folder Progress Bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1 w-28">
                      <div className="flex items-center justify-between w-full text-[10px] font-bold">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-emerald-500">{folderPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${folderPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* FOLDER CONTENTS: CHAPTER LIST */}
                {isOpen && (
                  <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-3">
                    {group.chapters.map(({ subject, chapter }) => {
                      const isExpanded = !!expandedChapterIds[chapter.id];

                      return (
                        <div
                          key={chapter.id}
                          className="bg-slate-50/70 dark:bg-slate-950/50 rounded-xl border border-slate-200/80 dark:border-slate-800/90 p-3.5 transition-all hover:border-indigo-400/50"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Chapter Title & Number */}
                            <div className="flex items-start gap-3">
                              <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 shrink-0">
                                Ch {chapter.chapterNumber}
                              </span>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {formatMathText(chapter.title)}
                                </h4>
                                {chapter.subTopics && chapter.subTopics.length > 0 && (
                                  <button
                                    onClick={() => toggleExpandChapter(chapter.id)}
                                    className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-400 mt-0.5 flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{chapter.subTopics.length} key topics</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Action Controls & Checkboxes */}
                            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                              {/* Status Dropdown */}
                              <select
                                value={chapter.status}
                                onChange={(e) => onUpdateChapter(subject.id, chapter.id, { status: e.target.value as ChapterStatus })}
                                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
                                  chapter.status === "Completely Done"
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                    : chapter.status === "Partially Done"
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                }`}
                              >
                                <option value="Remaining">Remaining</option>
                                <option value="Partially Done">Partially Done</option>
                                <option value="Completely Done">Completely Done</option>
                              </select>

                              {/* Theory Done */}
                              <button
                                onClick={() => onUpdateChapter(subject.id, chapter.id, { theoryDone: !chapter.theoryDone })}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  chapter.theoryDone
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                                title="NCERT Concepts and Theory completed"
                              >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${chapter.theoryDone ? "opacity-100" : "opacity-30"}`} />
                                <span>Theory</span>
                              </button>

                              {/* Questions Practiced */}
                              <button
                                onClick={() => onUpdateChapter(subject.id, chapter.id, { questionsPracticed: !chapter.questionsPracticed })}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  chapter.questionsPracticed
                                    ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800"
                                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                                title="Questions practiced"
                              >
                                <FileCheck2 className={`w-3.5 h-3.5 ${chapter.questionsPracticed ? "opacity-100" : "opacity-30"}`} />
                                <span>Questions</span>
                              </button>

                              {/* Competency Done */}
                              <button
                                onClick={() => onUpdateChapter(subject.id, chapter.id, { competencyDone: !chapter.competencyDone })}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  chapter.competencyDone
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                                title="CBSE Competency-based questions"
                              >
                                <Brain className={`w-3.5 h-3.5 ${chapter.competencyDone ? "opacity-100" : "opacity-30"}`} />
                                <span>Competency</span>
                              </button>

                              {/* PYQs Done */}
                              <button
                                onClick={() => onUpdateChapter(subject.id, chapter.id, { pyqsDone: !chapter.pyqsDone })}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  chapter.pyqsDone
                                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                                title="Past board questions solved"
                              >
                                <GraduationCap className={`w-3.5 h-3.5 ${chapter.pyqsDone ? "opacity-100" : "opacity-30"}`} />
                                <span>PYQs</span>
                              </button>
                            </div>
                          </div>

                          {/* Subtopics breakdown */}
                          {isExpanded && chapter.subTopics && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Subtopics &amp; Focus Concepts:
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {chapter.subTopics.map((topic, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                                  >
                                    • {formatMathText(topic)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
