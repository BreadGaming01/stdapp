export interface Todo {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  priority: "High" | "Medium" | "Low";
  completed: boolean;
  course: string;
  estimatedMinutes: number;
  actualMinutes: number;
  reasoning?: string; // Optional reasoning from Gemini
}

export interface Topic {
  name: string;
  status: "Not Started" | "In Progress" | "Completed";
}

export interface CourseSyllabus {
  id: string;
  courseName: string;
  topics: Topic[];
  examDate: string; // YYYY-MM-DD
}

export interface PomodoroRecord {
  id: string;
  timestamp: string; // ISO String
  durationMinutes: number;
  type: "work" | "short-break" | "long-break";
  completed: boolean;
}

export interface GroupNote {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string; // ISO String
}

export interface GroupSession {
  id: string;
  title: string;
  time: string; // YYYY-MM-DDTHH:MM
  durationMinutes: number;
  agenda?: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  notes: GroupNote[];
  sessions: GroupSession[];
}

export interface ExamCountdown {
  id: string;
  title: string;
  examDate: string; // YYYY-MM-DDTHH:MM or ISO String
  subject: string;
}

export interface ScheduleBlock {
  timeSlot: string;
  taskName: string;
  isAIGenerated: boolean;
  completed?: boolean;
}

export interface DailyPlanner {
  date: string;
  basicTasks: string;
  schedule: ScheduleBlock[];
  aiAdvice: string;
}

export interface UserAccount {
  username: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  theme: "light" | "dark";
  status?: "online" | "away" | "offline";
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderFullName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  isPhoto?: boolean;
  mutationsApplied?: string[];
}

export interface Announcement {
  id: string;
  author: string;
  title: string;
  htmlContent: string;
  createdAt: string;
}

export interface SharedStream {
  id: string;
  title: string;
  type: "youtube" | "iframe" | "html_snippet";
  contentValue: string;
  addedBy: string;
  addedByFullName: string;
  createdAt: string;
  category?: string;
  activeWatchers?: string[];
}

export type ChapterStatus = "Remaining" | "Partially Done" | "Completely Done";

export interface Class10Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  unit?: string; // Folder/Unit classification (e.g. "Unit 1: Number Systems")
  subTopics?: string[];
  status: ChapterStatus;
  theoryDone: boolean;
  questionsPracticed: boolean;
  questionsPracticedCount?: number;
  competencyDone: boolean;
  pyqsDone: boolean;
  notes?: string;
}

export interface Class10Subject {
  id: string;
  name: string;
  code?: string;
  color: string;
  chapters: Class10Chapter[];
  examDate?: string;
}

export interface PublicResourceItem {
  id: string;
  title: string;
  category: "CBSE Official" | "Maths Formulas" | "Science Notes" | "SST Mindmaps" | "Interactive Widget" | "Announcement" | "Study Tool";
  description: string;
  url?: string;
  actionButtonLabel?: string;
  actionButtonUrl?: string;
  htmlSnippet?: string;
  authorName: string;
  createdAt: string;
  likes?: number;
  tags?: string[];
}

export interface TaskManipulationResult {
  reply: string;
  markedDoneCount: number;
  shiftedDeadlinesCount: number;
  addedTasksCount: number;
  summary: string;
}


export interface SchoolHomework {
  id: string;
  subject: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  estimatedMinutes: number;
  priority: "Urgent" | "Normal" | "Low";
  completed: boolean;
  createdAt: string;
}

export interface PreviousBacklog {
  id: string;
  subject: string;
  topic: string;
  backlogType: "Theory" | "Questions Unsolved" | "Competency Pending" | "Missed Class" | "Revision Needed";
  severity: "High" | "Medium" | "Low";
  estimatedHours: number;
  targetDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface DayPlanTask {
  id: string;
  timeSlot: string;
  subject: string;
  category: "Deep Study" | "Competency Questions" | "NCERT Practice" | "School Homework" | "Backlog Clearance" | "Quick Revision" | "Break";
  title: string;
  description: string;
  completed: boolean;
}

export interface DaySchedule {
  dayNumber: number;
  date: string;
  dayName: string;
  focusSubject: string;
  dailyGoal: string;
  studyHoursTarget: number;
  tasks: DayPlanTask[];
  completed?: boolean;
}

export interface MasterStudyPlan {
  id: string;
  generatedAt: string;
  deadlineDate: string;
  dailyStudyHoursWeekday: number;
  dailyStudyHoursWeekend: number;
  targetExamName: string;
  strategySummary: string;
  days: DaySchedule[];
}

export interface AppStore {
  todos: Todo[];
  syllabus: CourseSyllabus[];
  class10Syllabus?: Class10Subject[];
  homework?: SchoolHomework[];
  backlogs?: PreviousBacklog[];
  masterPlan?: MasterStudyPlan | null;
  pomodoros: PomodoroRecord[];
  studyGroups: StudyGroup[];
  countdowns: ExamCountdown[];
  planner: DailyPlanner;
  accounts?: UserAccount[];
  globalMessages?: ChatMessage[];
  groupMessages?: { [groupId: string]: ChatMessage[] };
  copilotMessages?: ChatMessage[];
  announcements?: Announcement[];
  publicResources?: PublicResourceItem[];
  sharedStreams?: SharedStream[];
  questionBank?: Question[];
  practiceSheets?: PracticeSheet[];
  liveRooms?: LiveRoom[];
  userStores?: { [username: string]: any };
}


export interface LiveRoom {
  id: string;
  code: string;
  title: string;
  streamId: string | null;
  streamTitle?: string;
  streamType?: "youtube" | "iframe" | "html_snippet";
  streamValue?: string;
  createdByName: string;
  createdByUsername: string;
  createdAt: string;
  participants: {
    username: string;
    fullName: string;
    avatarUrl?: string;
    joinedAt: string;
    isMuted?: boolean;
    isCameraOff?: boolean;
  }[];
  activeStreamState?: {
    playing: boolean;
    currentTime: number;
    lastUpdated: string;
  };
  messages?: {
    id: string;
    sender: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    timestamp: string;
  }[];
}

export interface Question {
  id: string;
  questionText: string;
  options?: string[]; // MCQs if present
  correctAnswer: string; // Answer option, or explanation
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  createdAt: string;
}

export interface PracticeSheet {
  id: string;
  title: string;
  subject: string;
  questions: Question[];
  createdAt: string;
  createdBy: string;
  solvedAnswers?: { [questionId: string]: string };
  solvedAt?: string;
}

export function getSafeHtmlSnippet(html: string): string {
  const trimmed = html ? html.trim() : "";
  const hasHtmlTag = /<html/i.test(trimmed) || /<!DOCTYPE/i.test(trimmed);
  
  if (hasHtmlTag) {
    if (!/tailwindcss\.com/i.test(trimmed)) {
      if (/<head>/i.test(trimmed)) {
        return trimmed.replace(/<head>/i, `<head>\n  <script src="https://cdn.tailwindcss.com"></script>`);
      } else if (/<html>/i.test(trimmed)) {
        return trimmed.replace(/<html>/i, `<html>\n<head>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>`);
      }
    }
    return trimmed;
  }
  
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
        padding: 16px;
        margin: 0;
        color: #f1f5f9;
        background-color: #090d16;
      }
      .font-display {
        font-family: 'Space Grotesk', sans-serif;
      }
      .font-mono {
        font-family: 'JetBrains Mono', monospace;
      }
    </style>
  </head>
  <body>
    ${trimmed}
  </body>
</html>`;
}

