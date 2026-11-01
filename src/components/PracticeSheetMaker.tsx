import React, { useState, useEffect, useRef } from "react";
import { AppStore, Question, PracticeSheet } from "../types";
import {
  BrainCircuit,
  FileText,
  Plus,
  Sparkles,
  BookOpen,
  Award,
  CheckCircle,
  Download,
  Database,
  HelpCircle,
  Check,
  Trash2,
  Printer,
  ArrowRight,
  RefreshCw,
  X,
  PlusCircle,
  FileSpreadsheet,
  Edit,
  Upload,
  Layout,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Eye,
  Type
} from "lucide-react";

interface PracticeSheetMakerProps {
  store: AppStore;
  currentUser: any;
  onUpdateStore: (updatedFields: Partial<AppStore>) => Promise<void>;
  theme: "light" | "dark";
}

export default function PracticeSheetMaker({
  store,
  currentUser,
  onUpdateStore,
  theme
}: PracticeSheetMakerProps) {
  // Tabs: "sheets", "bank" (Question Bank), or "presentation" (16:9 PDF slide generator)
  const [activeTab, setActiveTab] = useState<"sheets" | "bank" | "presentation">("sheets");

  // Local storage lists synchronized with store
  const sheets = store.practiceSheets || [];
  const questionBank = store.questionBank || [];

  // Edit states
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSheet, setEditingSheet] = useState<PracticeSheet | null>(null);
  
  // Deleting confirmation states (in-app dialogs instead of window.confirm)
  const [confirmDeleteQuestionId, setConfirmDeleteQuestionId] = useState<string | null>(null);
  const [confirmDeleteSheetId, setConfirmDeleteSheetId] = useState<string | null>(null);

  // 16:9 Slides PDF Builder State
  const [presentationQuestions, setPresentationQuestions] = useState<Question[]>([]);
  const [slideTheme, setSlideTheme] = useState<"cbse2025" | "darkslate" | "techneon" | "chalkboard" | "classic">("cbse2025");
  const [solutionStyle, setSolutionStyle] = useState<"blank" | "ruled" | "grid" | "dotted">("ruled");
  const [questionFontSize, setQuestionFontSize] = useState<number>(20);
  const [borderStyle, setBorderStyle] = useState<"none" | "solid" | "double" | "glowing" | "dashed">("glowing");
  const [uploadedBg, setUploadedBg] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [watermarkText, setWatermarkText] = useState<string>("Co-Scholar Academy");
  const [customSlideLogo, setCustomSlideLogo] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  // Fully Editable System states for presentation slides
  const [slideConfigs, setSlideConfigs] = useState<Record<string, {
    x: number;          // relative top-left percent X
    y: number;          // relative top-left percent Y
    color: string;      // custom hex color
    fontSize: number;   // custom font size
    text: string;       // editable text
  }>>({});

  // Slide layout states (hide decorations is true by default to keep slide completely clean and focus only on question text)
  const [hideDecorations, setHideDecorations] = useState<boolean>(true);
  const [slideLayout, setSlideLayout] = useState<"full-width-top" | "split-50-50">("full-width-top");

  // Mouse Drag states for real-time canvas positioning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 5, y: 5 });

  // Photo Question parsing states
  const [parsingPhoto, setParsingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState(false);

  // Helper to obtain configuration for active slide question text
  const getActiveSlideConfig = (qId: string, originalText: string) => {
    return slideConfigs[qId] || {
      x: 5,
      y: 8,
      color: slideTheme === "cbse2025" ? "#1e293b" : "#ffffff",
      fontSize: questionFontSize || 22,
      text: originalText || ""
    };
  };

  // Helper to update active slide configuration
  const updateActiveSlideConfig = (updates: Partial<{ x: number; y: number; color: string; fontSize: number; text: string }>) => {
    const activeQ = presentationQuestions[activeSlideIndex];
    if (!activeQ) return;
    const qId = activeQ.id;
    const current = getActiveSlideConfig(qId, activeQ.questionText);
    setSlideConfigs(prev => ({
      ...prev,
      [qId]: {
        ...current,
        ...updates
      }
    }));
  };

  // Mouse Drag event handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const activeQ = presentationQuestions[activeSlideIndex];
    if (!activeQ) return;
    
    const container = document.getElementById("slide-canvas-preview");
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Calculate mouse delta
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Convert pixels to relative percentage
    const percentDeltaX = (deltaX / containerRect.width) * 100;
    const percentDeltaY = (deltaY / containerRect.height) * 100;
    
    // Calculate new position bounded to [0, 95]
    const newX = Math.max(0, Math.min(95, initialPos.x + percentDeltaX));
    const newY = Math.max(0, Math.min(95, initialPos.y + percentDeltaY));
    
    updateActiveSlideConfig({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // AI Generation inside Presentation Panel
  const [aiSlideSubject, setAiSlideSubject] = useState("");
  const [aiSlideDifficulty, setAiSlideDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [aiSlideCount, setAiSlideCount] = useState<number | string>(3);
  const [aiSlidePrompt, setAiSlidePrompt] = useState("");
  const [generatingSlideQuestions, setGeneratingSlideQuestions] = useState(false);
  const [aiSlideError, setAiSlideError] = useState("");
  const [aiSlideSuccess, setAiSlideSuccess] = useState(false);

  // Sheet Creation Form State
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetSubject, setSheetSubject] = useState("");
  const [sheetCount, setSheetCount] = useState<number | string>(5);
  const [sheetDifficulty, setSheetDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [specialPrompt, setSpecialPrompt] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Manual Question Creator State
  const [manualText, setManualText] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualDifficulty, setManualDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [isMcq, setIsMcq] = useState(true);
  const [mcqOptions, setMcqOptions] = useState<string[]>(["", "", "", ""]);
  const [mcqCorrect, setMcqCorrect] = useState("A"); // A, B, C, D
  const [subjectiveCorrect, setSubjectiveCorrect] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [questionSuccess, setQuestionSuccess] = useState(false);

  // Gemini Question Generator State
  const [aiGenSubject, setAiGenSubject] = useState("");
  const [aiGenDifficulty, setAiGenDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [aiGenCount, setAiGenCount] = useState<number | string>(3);
  const [aiGenPrompt, setAiGenPrompt] = useState("");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [aiGenError, setAiGenError] = useState("");
  const [aiGenSuccess, setAiGenSuccess] = useState(false);

  // Solving sheet state
  const [activeSolvingSheet, setActiveSolvingSheet] = useState<PracticeSheet | null>(null);
  const [solvingAnswers, setSolvingAnswers] = useState<{ [qId: string]: string }>({});
  const [viewingAnswersSheet, setViewingAnswersSheet] = useState<PracticeSheet | null>(null);

  // Fetch initial question bank and practice sheets on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          fetch("/api/question-bank"),
          fetch("/api/practice-sheets")
        ]);
        if (qRes.ok && sRes.ok) {
          const qData = await qRes.json();
          const sData = await sRes.json();
          await onUpdateStore({
            questionBank: qData.questionBank,
            practiceSheets: sData.practiceSheets
          });
        }
      } catch (err) {
        console.error("Failed to load question bank data:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Handle Question Upload & AI Parsing via Photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingPhoto(true);
    setPhotoError("");
    setPhotoSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch("/api/gemini/parse-photo-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data,
              mimeType: file.type
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to parse image with Gemini.");
          }

          const result = await res.json();
          if (result.success && result.question) {
            const parsedQ = result.question;
            setManualText(parsedQ.questionText || "");
            setManualSubject(parsedQ.subject || "General");
            setManualDifficulty(parsedQ.difficulty || "Medium");
            if (Array.isArray(parsedQ.options) && parsedQ.options.length > 0) {
              setIsMcq(true);
              const opts = ["", "", "", ""];
              parsedQ.options.forEach((o: string, idx: number) => {
                if (idx < 4) opts[idx] = o;
              });
              setMcqOptions(opts);
              setMcqCorrect("A");
            } else {
              setIsMcq(false);
              setSubjectiveCorrect(parsedQ.correctAnswer || "");
            }
            setPhotoSuccess(true);
          } else {
            throw new Error("No structured question data was returned.");
          }
        } catch (apiErr: any) {
          console.error("Gemini Photo Parse Error:", apiErr);
          setPhotoError(apiErr.message || "Failed to process photo with Gemini.");
        } finally {
          setParsingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setPhotoError("Failed to read image file.");
      setParsingPhoto(false);
    }
  };

  // Handle Manual Question Submission
  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError("");
    setQuestionSuccess(false);

    if (!manualText.trim() || !manualSubject.trim()) {
      setQuestionError("Question text and Subject are required.");
      return;
    }

    let options: string[] | undefined = undefined;
    let correctAnswer = "";

    if (isMcq) {
      if (mcqOptions.some(opt => !opt.trim())) {
        setQuestionError("All 4 multiple-choice options must be filled.");
        return;
      }
      options = mcqOptions.map(o => o.trim());
      const correctIdx = mcqCorrect.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      correctAnswer = options[correctIdx];
    } else {
      if (!subjectiveCorrect.trim()) {
        setQuestionError("Please provide a correct answer or guideline explanation.");
        return;
      }
      correctAnswer = subjectiveCorrect.trim();
    }

    setAddingQuestion(true);

    try {
      const response = await fetch("/api/question-bank/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: manualText.trim(),
          options,
          correctAnswer,
          subject: manualSubject.trim(),
          difficulty: manualDifficulty
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to add manual question.");
      }

      await onUpdateStore({ questionBank: data.store.questionBank });

      // Reset form
      setManualText("");
      setSubjectiveCorrect("");
      setMcqOptions(["", "", "", ""]);
      setQuestionSuccess(true);
    } catch (err: any) {
      setQuestionError(err.message || "An unexpected error occurred.");
    } finally {
      setAddingQuestion(false);
    }
  };

  // Handle Gemini Question Generation to Bank
  const handleGenerateQuestionsToBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiGenError("");
    setAiGenSuccess(false);

    if (!aiGenSubject.trim()) {
      setAiGenError("Please specify a subject (e.g. Physics, World History).");
      return;
    }

    setGeneratingQuestions(true);

    try {
      const response = await fetch("/api/question-bank/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: aiGenSubject.trim(),
          difficulty: aiGenDifficulty,
          count: Number(aiGenCount) || 3,
          prompt: aiGenPrompt.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate questions with Gemini.");
      }

      await onUpdateStore({ questionBank: data.store.questionBank });
      setAiGenPrompt("");
      setAiGenSuccess(true);
    } catch (err: any) {
      setAiGenError(err.message || "Something went wrong.");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Handle Creating a Practice Sheet
  const handleCreatePracticeSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSheetError("");

    if (!sheetTitle.trim() || !sheetSubject.trim()) {
      setSheetError("Title and Subject are required.");
      return;
    }

    setCreatingSheet(true);

    try {
      const response = await fetch("/api/practice-sheets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sheetTitle.trim(),
          subject: sheetSubject.trim(),
          questionCount: Number(sheetCount) || 5,
          difficulty: sheetDifficulty,
          prompt: specialPrompt.trim(),
          username: currentUser?.username || "anonymous"
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create practice sheet.");
      }

      await onUpdateStore({
        practiceSheets: data.store.practiceSheets,
        questionBank: data.store.questionBank // Bank is updated because fallback AI generation registers new questions
      });

      // Reset
      setSheetTitle("");
      setSheetSubject("");
      setSpecialPrompt("");
      setIsCreateOpen(false);
    } catch (err: any) {
      setSheetError(err.message || "An unexpected error occurred.");
    } finally {
      setCreatingSheet(false);
    }
  };

  // DELETE Question from Bank
  const handleDeleteQuestion = async (qId: string) => {
    try {
      const response = await fetch(`/api/question-bank/${qId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await onUpdateStore({ questionBank: data.store.questionBank });
        // Remove from presentation deck if it was there
        setPresentationQuestions(prev => prev.filter(q => q.id !== qId));
      } else {
        console.error("Failed to delete question:", data.error);
      }
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  };

  // UPDATE Question in Bank
  const handleUpdateQuestion = async (updatedQ: Question) => {
    try {
      const response = await fetch(`/api/question-bank/${updatedQ.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQ)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await onUpdateStore({
          questionBank: data.store.questionBank,
          practiceSheets: data.store.practiceSheets
        });
        setEditingQuestion(null);
        // Sync in presentation slides if active
        setPresentationQuestions(prev => prev.map(q => q.id === updatedQ.id ? { ...q, ...updatedQ } : q));
      } else {
        console.error("Failed to update question:", data.error);
      }
    } catch (err) {
      console.error("Failed to update question:", err);
    }
  };

  // DELETE Practice Sheet
  const handleDeleteSheet = async (sheetId: string) => {
    try {
      const response = await fetch(`/api/practice-sheets/${sheetId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await onUpdateStore({ practiceSheets: data.store.practiceSheets });
      } else {
        console.error("Failed to delete practice sheet:", data.error);
      }
    } catch (err) {
      console.error("Failed to delete practice sheet:", err);
    }
  };

  // UPDATE Practice Sheet (title / subject / list of questions)
  const handleUpdateSheet = async (sheetId: string, updatedFields: Partial<PracticeSheet>) => {
    try {
      const response = await fetch(`/api/practice-sheets/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await onUpdateStore({ practiceSheets: data.store.practiceSheets });
        setEditingSheet(null);
      } else {
        console.error("Failed to update practice sheet:", data.error);
      }
    } catch (err) {
      console.error("Failed to update practice sheet:", err);
    }
  };

  // AI Generated slide questions inside the presentation panel (adds questions directly to presentationQuestions and question bank)
  const handleGenerateSlideQuestionsAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiSlideError("");
    setAiSlideSuccess(false);

    if (!aiSlideSubject.trim()) {
      setAiSlideError("Subject category is required.");
      return;
    }

    setGeneratingSlideQuestions(true);

    try {
      const response = await fetch("/api/question-bank/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: aiSlideSubject.trim(),
          difficulty: aiSlideDifficulty,
          count: Number(aiSlideCount) || 3,
          prompt: aiSlidePrompt.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI questions.");
      }

      // Add to store
      await onUpdateStore({ questionBank: data.store.questionBank });
      
      // Filter generated questions from the update (they've been appended to store.questionBank)
      const newlyAdded = data.questions || [];
      if (newlyAdded.length > 0) {
        setPresentationQuestions(prev => [...prev, ...newlyAdded]);
        setAiSlideSuccess(true);
        setAiSlidePrompt("");
      } else {
        setAiSlideError("No new questions returned.");
      }
    } catch (err: any) {
      setAiSlideError(err.message || "An unexpected error occurred.");
    } finally {
      setGeneratingSlideQuestions(false);
    }
  };

  // Export high resolution presentation PDF using html2canvas & jsPDF
  const handleExportPresentationPdf = async () => {
    if (presentationQuestions.length === 0) return;
    setExportingPdf(true);
    
    // Save current slide selection
    const originalIndex = activeSlideIndex;
    
    try {
      // Import dynamically to optimize bundle load
      const { jsPDF } = await import("jspdf");
      const defaultHtml2Canvas = await import("html2canvas");
      const html2canvas = defaultHtml2Canvas.default;
      
      // Create a Landscape PDF of exact 16:9 proportion
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [960, 540]
      });
      
      // Loop through all slides and draw them sequentially on the PDF pages
      for (let i = 0; i < presentationQuestions.length; i++) {
        // Update the active slide index to render the hidden 960x540 capture canvas
        setActiveSlideIndex(i);
        
        // Wait for React to finish state propagation & paint in the DOM
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const captureContainer = document.getElementById("slide-canvas-preview");
        if (!captureContainer) {
          console.error("Slide canvas container not found for rendering index", i);
          continue;
        }
        
        // Capture with high device pixel ratio for super crisp and clear rendering
        const canvas = await html2canvas(captureContainer, {
          scale: 2, // Crisp high-definition output
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          width: captureContainer.clientWidth,
          height: captureContainer.clientHeight,
          scrollX: 0,
          scrollY: 0
        });
        
        const imgData = canvas.toDataURL("image/png");
        
        // Add page if we've already drawn the first page
        if (i > 0) {
          pdf.addPage([960, 540], "landscape");
        }
        
        // Draw the image filling the entire landscape page boundaries exactly
        pdf.addImage(imgData, "PNG", 0, 0, 960, 540);
      }
      
      // Save the PDF slide deck document with human readable name
      pdf.save(`Presentation_Slides_16_9_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate presentation slide PDF:", err);
    } finally {
      // Restore previous user slide preview focus and reset exporter loader state
      setActiveSlideIndex(originalIndex);
      setExportingPdf(false);
    }
  };

  // Solve Action: Submit responses
  const handleSubmitSolvedAnswers = async () => {
    if (!activeSolvingSheet) return;

    try {
      const response = await fetch("/api/practice-sheets/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: activeSolvingSheet.id,
          solvedAnswers: solvingAnswers
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await onUpdateStore({ practiceSheets: data.store.practiceSheets });
        // Transition to answers view
        const updatedSheet = data.store.practiceSheets.find((s: any) => s.id === activeSolvingSheet.id);
        setViewingAnswersSheet(updatedSheet);
        setActiveSolvingSheet(null);
        setSolvingAnswers({});
      }
    } catch (err) {
      console.error("Failed to submit solved answers:", err);
    }
  };

  // Print PDF generator helper
  const handlePrintPdf = (sheet: PracticeSheet, includeAnswers = false) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download/print practice sheets.");
      return;
    }

    const questionsHtml = sheet.questions.map((q, idx) => {
      const optionsHtml = q.options && q.options.length > 0
        ? `<div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${q.options.map((opt, oIdx) => `<div><b>${String.fromCharCode(65 + oIdx)}.</b> ${opt}</div>`).join("")}
           </div>`
        : `<div style="margin-top: 12px; border-bottom: 1px dashed #cbd5e1; height: 60px;"></div>`;

      const answerHtml = includeAnswers
        ? `<div style="margin-top: 10px; background: #f8fafc; border-left: 3px solid #10b981; padding: 6px 10px; font-weight: 500; font-size: 11px;">
            ✓ Correct Answer Key: <b>${q.correctAnswer}</b>
           </div>`
        : "";

      return `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
          <div style="font-weight: 600; font-size: 13px;">Question ${idx + 1}: ${q.questionText} <span style="font-size: 10px; color: #475569; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${q.difficulty}</span></div>
          ${optionsHtml}
          ${answerHtml}
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sheet.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              border-bottom: 2px double #cbd5e1;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 4px 0;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #475569;
              margin-top: 12px;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
            .student-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              font-size: 12px;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #4f46e5; text-transform: uppercase;">
              Gemini Advanced Scholastic Arena
            </div>
            <div class="title">${sheet.title}</div>
            <div style="font-size: 12px; font-weight: 500; color: #64748b;">Subject: ${sheet.subject}</div>
            <div class="meta-info">
              <span>Difficulty Level: <b>${sheet.questions[0]?.difficulty || "Mixed"}</b></span>
              <span>Date Created: <b>${new Date(sheet.createdAt).toLocaleDateString()}</b></span>
              <span>Total Questions: <b>${sheet.questions.length}</b></span>
            </div>
          </div>

          ${!includeAnswers ? `
          <div class="student-line">
            <span><b>STUDENT NAME:</b> ___________________________</span>
            <span><b>SCORE:</b> ________ / ${sheet.questions.length}</span>
          </div>
          ` : `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; text-align: center; color: #15803d; font-weight: 600;">
            ★ MODEL ANSWER KEY & SCHOLASTIC GUIDELINES ★
          </div>
          `}

          <div style="margin-top: 20px;">
            ${questionsHtml}
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Generated dynamically by Gemini Co-Scholar Study Arena
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Helper to determine matching questions from bank to guide creativity
  const getSubjectCounts = () => {
    const counts: { [subj: string]: number } = {};
    questionBank.forEach(q => {
      const subj = q.subject;
      counts[subj] = (counts[subj] || 0) + 1;
    });
    return counts;
  };
  const subjectCounts = getSubjectCounts();

  return (
    <div className="space-y-6" id="practice_sheets_module">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500 animate-pulse" />
            Co-Scholar Practice & Question Bank
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deploy assessments automatically, build robust test banks manually or via Gemini, and print official PDFs
          </p>
        </div>

        {/* TAB CONTROLLERS */}
        <div className="flex items-center gap-2 bg-slate-900/40 p-1 border border-slate-200/10 rounded-2xl shrink-0">
          <button
            onClick={() => {
              setActiveTab("sheets");
              setActiveSolvingSheet(null);
              setViewingAnswersSheet(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "sheets"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Practice Sheets ({sheets.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("bank");
              setActiveSolvingSheet(null);
              setViewingAnswersSheet(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "bank"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Question Bank ({questionBank.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("presentation");
              setActiveSolvingSheet(null);
              setViewingAnswersSheet(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "presentation"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            16:9 Slide Builder ({presentationQuestions.length})
          </button>
        </div>
      </div>

      {/* RENDER VIEW: PRACTICE SHEETS */}
      {activeTab === "sheets" && !activeSolvingSheet && !viewingAnswersSheet && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-slate-200/10 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Practice Sets Available</span>
              <p className="text-xs text-slate-300 font-medium">Generate customized question sheets on demand. If questions exist in the bank, the system draws them automatically!</p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Practice Sheet Maker
            </button>
          </div>

          {sheets.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${theme === "dark" ? "bg-slate-900/30 border-slate-800" : "bg-white border-slate-200"}`}>
              <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-300">No practice sheets created yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                Use the Practice Sheet Maker button above to customize your first exam sheet using Gemini or questions from your local bank!
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/30 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create First Sheet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sheets.map((sheet) => {
                const isSolved = !!sheet.solvedAnswers;
                return (
                  <div
                    key={sheet.id}
                    className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${
                      theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150 shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-[9px] font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg">
                            {sheet.subject}
                          </span>
                          <h3 className="text-sm font-bold text-white dark:text-slate-100 mt-1.5 line-clamp-1">
                            {sheet.title}
                          </h3>
                        </div>
                        {isSolved ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                            <Check className="w-3 h-3" /> Solved
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg animate-pulse">
                            ● Unsolved
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1">
                        Questions: <b>{sheet.questions.length}</b> • Created: <b>{new Date(sheet.createdAt).toLocaleDateString()}</b>
                      </p>

                      {/* Summary of Questions Included */}
                      <div className="mt-4 space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Question Syllabus Overview:</span>
                        <div className="space-y-1 line-clamp-2">
                          {sheet.questions.slice(0, 3).map((q, qidx) => (
                            <p key={q.id} className="text-[10px] text-slate-300 truncate">
                              {qidx + 1}. {q.questionText}
                            </p>
                          ))}
                          {sheet.questions.length > 3 && (
                            <p className="text-[9px] text-indigo-400 font-semibold italic">
                              + {sheet.questions.length - 3} more questions...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-200/10 flex flex-wrap gap-2 items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePrintPdf(sheet, false)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer hover:bg-slate-800 ${
                            theme === "dark" ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"
                          }`}
                          title="Export Blank Question Sheet as PDF (High Quality Layout)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintPdf(sheet, true)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer hover:bg-slate-800 ${
                            theme === "dark" ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"
                          }`}
                          title="Export Answer Key Document (PDF)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSheet(sheet);
                          }}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer hover:bg-indigo-600/20 hover:border-indigo-500/30 ${
                            theme === "dark" ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"
                          }`}
                          title="Edit Sheet"
                        >
                          <Edit className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDeleteSheetId(sheet.id);
                          }}
                          className="p-2 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors cursor-pointer"
                          title="Delete Practice Sheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {isSolved ? (
                          <button
                            onClick={() => setViewingAnswersSheet(sheet)}
                            className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            Review Submissions
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveSolvingSheet(sheet);
                              setSolvingAnswers({});
                            }}
                            className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.02]"
                          >
                            Solve Assessment
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE SOLVING VIEWPORT */}
      {activeTab === "sheets" && activeSolvingSheet && (
        <div className={`p-6 sm:p-8 rounded-3xl border ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        } space-y-6 animate-fadeIn`}>
          
          <div className="flex items-center justify-between border-b border-slate-200/10 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-indigo-600/10 text-indigo-400 px-2 py-0.5 rounded-lg">
                Subject: {activeSolvingSheet.subject}
              </span>
              <h2 className="text-md sm:text-lg font-black text-slate-100 mt-2">
                Solving: {activeSolvingSheet.title}
              </h2>
            </div>
            <button
              onClick={() => setActiveSolvingSheet(null)}
              className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              Cancel Solve
            </button>
          </div>

          <div className="space-y-6">
            {activeSolvingSheet.questions.map((q, qidx) => {
              const selectedValue = solvingAnswers[q.id] || "";
              const hasOptions = Array.isArray(q.options) && q.options.length > 0;

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-3"
                >
                  <p className="text-xs font-bold text-slate-100">
                    Q{qidx + 1}. {q.questionText}
                  </p>

                  {hasOptions ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options!.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isSelected = selectedValue === opt;
                        return (
                          <label
                            key={oIdx}
                            onClick={() => setSolvingAnswers({ ...solvingAnswers, [q.id]: opt })}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              isSelected
                                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold"
                                : "bg-slate-900/50 border-slate-800/40 hover:bg-slate-850 text-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="accent-indigo-500 hidden"
                            />
                            <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-extrabold ${
                              isSelected ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                            }`}>
                              {letter}
                            </span>
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={selectedValue}
                      onChange={(e) => setSolvingAnswers({ ...solvingAnswers, [q.id]: e.target.value })}
                      placeholder="Type your brief solution or explanation here..."
                      className="w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">
              Completed {Object.keys(solvingAnswers).length} of {activeSolvingSheet.questions.length} Questions
            </span>
            <button
              onClick={handleSubmitSolvedAnswers}
              className="text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all shadow-md hover:scale-[1.02] cursor-pointer"
            >
              Submit & Grade Practice Sheet
            </button>
          </div>
        </div>
      )}

      {/* VIEWING ANSWERS REVIEW SHEET */}
      {activeTab === "sheets" && viewingAnswersSheet && (
        <div className={`p-6 sm:p-8 rounded-3xl border ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        } space-y-6 animate-fadeIn`}>
          
          <div className="flex items-center justify-between border-b border-slate-200/10 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg">
                ★ Exam Evaluated
              </span>
              <h2 className="text-md sm:text-lg font-black text-slate-100 mt-2">
                Evaluated Performance: {viewingAnswersSheet.title}
              </h2>
            </div>
            <button
              onClick={() => setViewingAnswersSheet(null)}
              className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              Close Review
            </button>
          </div>

          {/* Calculate MCQ scores if options exist */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border border-emerald-800/20 text-center space-y-1">
            <Award className="w-8 h-8 text-emerald-400 mx-auto mb-1 animate-bounce" />
            <p className="text-xs text-slate-400 font-medium">Assessed Submission Breakdown</p>
            <p className="text-md font-extrabold text-emerald-400">
              Score: {
                viewingAnswersSheet.questions.filter(q => {
                  const subAns = viewingAnswersSheet.solvedAnswers?.[q.id] || "";
                  return subAns.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
                }).length
              } / {viewingAnswersSheet.questions.length} Correct
            </p>
          </div>

          <div className="space-y-6">
            {viewingAnswersSheet.questions.map((q, qidx) => {
              const subAns = viewingAnswersSheet.solvedAnswers?.[q.id] || "No Submission";
              const isCorrect = subAns.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border space-y-3 ${
                    isCorrect ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-100">
                      Q{qidx + 1}. {q.questionText}
                    </p>
                    {isCorrect ? (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg shrink-0">
                        ✓ Correct
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg shrink-0">
                        ✗ Incorrect/Open Review
                      </span>
                    )}
                  </div>

                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isSubmitted = subAns === opt;
                        const isCorrectOpt = q.correctAnswer === opt;
                        
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 border ${
                              isCorrectOpt
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold"
                                : isSubmitted
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                  : "bg-slate-900/40 border-slate-800/40 text-slate-400"
                            }`}
                          >
                            <span className="font-bold">{letter}.</span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 text-[11px] space-y-1">
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Answering Details:</p>
                    <p className="text-slate-300">Your Answer: <b className={isCorrect ? "text-emerald-400" : "text-rose-400"}>{subAns}</b></p>
                    {!isCorrect && (
                      <p className="text-emerald-400 font-medium">System Correct Reference Key: {q.correctAnswer}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER VIEW: QUESTION BANK */}
      {activeTab === "bank" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMN 1 & 2: QUESTION BANK VIEWER & GEMINI GENERATOR */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* GEMINI GENERATOR */}
            <div className={`p-6 sm:p-8 rounded-3xl border ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl text-white">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-md sm:text-lg font-bold tracking-tight">Gemini Assessment Designer</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Prompt Gemini to construct test questions and register them directly to the active test database</p>
                </div>
              </div>

              {aiGenError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl mb-4">
                  ⚠️ {aiGenError}
                </div>
              )}

              {aiGenSuccess && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl mb-4">
                  ✓ Successfully generated new AI questions and saved them into the database question bank below!
                </div>
              )}

              <form onSubmit={handleGenerateQuestionsToBank} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subject Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Physics, History"
                      required
                      value={aiGenSubject}
                      onChange={e => setAiGenSubject(e.target.value)}
                      className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question count</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      required
                      value={aiGenCount}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") {
                          setAiGenCount("");
                        } else {
                          const parsed = parseInt(val);
                          if (!isNaN(parsed)) {
                            setAiGenCount(parsed);
                          }
                        }
                      }}
                      className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Difficulty level</label>
                    <select
                      value={aiGenDifficulty}
                      onChange={e => setAiGenDifficulty(e.target.value as any)}
                      className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Optional details / prompt directives</label>
                  <textarea
                    rows={2}
                    value={aiGenPrompt}
                    onChange={e => setAiGenPrompt(e.target.value)}
                    placeholder="e.g. Focus on Newtonian gravity laws, kinetic equations, or vocabulary matching for intermediate Spanish conversational verbs..."
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={generatingQuestions || !aiGenSubject.trim()}
                    className="text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {generatingQuestions ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating Assessment...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate & Store Questions
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* REGISTERED QUESTIONS IN BANK LISTING */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Database Question Bank</h3>
              </div>

              {questionBank.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-slate-950/20 border border-slate-800/40">
                  <p className="text-xs text-slate-500">The Question Bank database is currently empty. Add questions manually on the right or generate them with Gemini above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questionBank.map((q, idx) => {
                    const isMc = Array.isArray(q.options) && q.options.length > 0;
                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all duration-300 ${
                          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg">
                              {q.subject}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                              q.difficulty === "Easy"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : q.difficulty === "Medium"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-100 dark:text-slate-200">
                          {idx + 1}. {q.questionText}
                        </p>

                        {isMc && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/10 dark:border-slate-800/60">
                            {q.options!.map((opt, oIdx) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isCorrect = q.correctAnswer === opt;
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded-lg text-[10px] flex items-center gap-1.5 border ${
                                    isCorrect
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold"
                                      : "bg-slate-950/40 border-slate-800/40 text-slate-400"
                                  }`}
                                >
                                  <span className="font-bold">{letter}.</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isMc && (
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[10px] text-slate-400">
                            <span className="font-bold text-[9px] uppercase text-indigo-400 block mb-0.5">Model Solution:</span>
                            {q.correctAnswer}
                          </div>
                        )}

                        {/* Question Action Strip */}
                        <div className="mt-4 pt-3.5 border-t border-slate-200/10 dark:border-slate-800/40 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              if (presentationQuestions.some(p => p.id === q.id)) {
                                return;
                              }
                              setPresentationQuestions([...presentationQuestions, q]);
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                              presentationQuestions.some(p => p.id === q.id)
                                ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 cursor-not-allowed"
                                : "bg-slate-950/40 border-slate-800/60 hover:bg-indigo-600/10 hover:border-indigo-500/30 text-indigo-400"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            {presentationQuestions.some(p => p.id === q.id) ? "Added to 16:9 Slide Deck" : "Add to Slide Deck"}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingQuestion(q);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-800 ${
                                theme === "dark" ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"
                              }`}
                              title="Edit Question"
                            >
                              <Edit className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDeleteQuestionId(q.id);
                              }}
                              className="p-1.5 rounded-lg border border-rose-500/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: MANUAL QUESTION CREATOR */}
          <div className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-3xl border ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Manual Question Injector</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Submit custom curriculum test questions directly into the central database</p>
                </div>
              </div>

              {questionError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl mb-4">
                  ⚠️ {questionError}
                </div>
              )}

              {questionSuccess && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl mb-4">
                  ✓ Question registered in database successfully!
                </div>
              )}

              {/* PHOTO SCANNING SECTION */}
              <div className="mb-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">Import Question from Photo (AI Scan)</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">
                  Upload an image/photo of a question (e.g. from a textbook, whiteboard, or screenshot). Gemini will extract the question content, options, correct answer, and subject!
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer">
                    {parsingPhoto ? (
                      <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-indigo-400 animate-pulse" />
                    )}
                    <span className="text-[11px] font-medium text-slate-300">
                      {parsingPhoto ? "Scanning image with Gemini..." : "Select or Drop Question Image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={parsingPhoto}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  
                  {photoError && (
                    <p className="text-[9px] text-rose-400 font-bold mt-1">⚠️ {photoError}</p>
                  )}
                  {photoSuccess && (
                    <p className="text-[9px] text-emerald-400 font-bold mt-1">✓ Question parsed successfully! Please review the pre-populated form fields below, then click "Add to Database Bank".</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleAddManualQuestion} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Text</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. What is the value of the acceleration due to gravity on Earth?"
                    required
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                      theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="Physics"
                      required
                      value={manualSubject}
                      onChange={e => setManualSubject(e.target.value)}
                      className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Difficulty</label>
                    <select
                      value={manualDifficulty}
                      onChange={e => setManualDifficulty(e.target.value as any)}
                      className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* TYPE TOGGLE */}
                <div className="pt-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Format</span>
                  <div className="flex gap-2 p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsMcq(true)}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer ${
                        isMcq ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Multiple Choice (MCQ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMcq(false)}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer ${
                        !isMcq ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Short Answer / Subjective
                    </button>
                  </div>
                </div>

                {/* MCQ SPECIFIC LAYOUT */}
                {isMcq ? (
                  <div className="space-y-3 pt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Options Definition</span>
                    {mcqOptions.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400 w-4">{letter}.</span>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${letter}`}
                            value={opt}
                            onChange={e => {
                              const updated = [...mcqOptions];
                              updated[idx] = e.target.value;
                              setMcqOptions(updated);
                            }}
                            className={`flex-1 text-xs p-2 rounded-lg border focus:outline-hidden ${
                              theme === "dark" ? "bg-slate-850 border-slate-750 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                          />
                        </div>
                      );
                    })}

                    <div className="pt-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Correct Letter Key</label>
                      <select
                        value={mcqCorrect}
                        onChange={e => setMcqCorrect(e.target.value)}
                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                          theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Model Correct Solution Answer</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9.8 m/s² or Explanation"
                      value={subjectiveCorrect}
                      onChange={e => setSubjectiveCorrect(e.target.value)}
                      className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={addingQuestion}
                  className="w-full text-xs font-bold p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {addingQuestion ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {addingQuestion ? "Registering..." : "Add to Database Bank"}
                </button>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* RENDER VIEW: 16:9 PRESENTATION BUILDER */}
      {activeTab === "presentation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* COLUMN 1: CONFIGURATION & SLIDE BUILDER CONTROLS */}
            <div className="space-y-6">
              
              {/* SLIDE DECK SETTINGS */}
              <div className={`p-6 rounded-3xl border ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800/20 dark:border-slate-800/60 pb-3">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-bold text-sm">Presentation Page Customizer</h3>
                </div>

                <div className="space-y-4">
                  {/* Theme Selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Slide Theme (Aesthetic style)</label>
                    <select
                      value={slideTheme}
                      onChange={e => setSlideTheme(e.target.value as any)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="cbse2025">★ CBSE 2025 Board Theme (Bold Red & Yellow)</option>
                      <option value="darkslate">Premium Dark Slate Theme (Elegant Gold & Slate)</option>
                      <option value="techneon">Cyber Tech Neon Theme (Vibrant Cyan Glow)</option>
                      <option value="chalkboard">Classic Blackboard Theme (Dusted Green Chalk)</option>
                      <option value="classic">Prism Bright Theme (Minimalist Clean Borders)</option>
                    </select>
                  </div>

                  {/* Custom Background Upload */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Upload Custom Background Image (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 transition-all cursor-pointer text-center bg-slate-950/25`}>
                        <Upload className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-400 font-medium">Select JPG/PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setUploadedBg(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {uploadedBg && (
                        <button
                          onClick={() => setUploadedBg(null)}
                          className="px-2.5 py-1.5 text-[9px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg border border-rose-500/20 transition-all"
                        >
                          Clear Image
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slide Layout Mode selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Slide Layout Format</label>
                    <select
                      value={slideLayout}
                      onChange={e => setSlideLayout(e.target.value as any)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="full-width-top">★ Clean Full Width Top (Recommended)</option>
                      <option value="split-50-50">Split Column (Left: Question, Right: Answer Canvas)</option>
                    </select>
                  </div>

                  {/* Clean Decorations option */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-300">Clean Mode (No Extra Text)</span>
                      <span className="text-[8px] text-slate-500 font-medium">Hides labels, watermarks, and headers</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hideDecorations}
                      onChange={e => setHideDecorations(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                    />
                  </div>

                  {/* Question Border Style */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Container Border (Boundary)</label>
                    <select
                      value={borderStyle}
                      onChange={e => setBorderStyle(e.target.value as any)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="glowing">Glowing Neon Ring Accent</option>
                      <option value="double">Premium Double Border Outline</option>
                      <option value="solid">Thick Solid Scholastic Border</option>
                      <option value="dashed">Chalkboard Hand-drawn Dashed</option>
                      <option value="none">No Border (Clean Card Background)</option>
                    </select>
                  </div>

                  {/* Typography size */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Question Font Size</label>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">{questionFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={36}
                      value={questionFontSize}
                      onChange={e => setQuestionFontSize(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-500 italic mt-0.5">Note: Long questions auto-scale downward to fit the 16:9 frame gracefully!</p>
                  </div>

                  {/* Solution Area Grid style */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Solution Layout Space Grid</label>
                    <select
                      value={solutionStyle}
                      onChange={e => setSolutionStyle(e.target.value as any)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="ruled">Notebook Ruled Lines (Diaries/Classrooms)</option>
                      <option value="grid">Technical Grid Graph paper</option>
                      <option value="dotted">Modern Bullet Dotted paper</option>
                      <option value="blank">Blank White Presentation Slate</option>
                    </select>
                  </div>

                  {/* Watermark Branding */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Branding / Header Watermark</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      placeholder="e.g. Co-Scholar Academy CBSE 2025"
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* INTERACTIVE TEXT CONTROLLER */}
              {presentationQuestions.length > 0 && (
                <div className={`p-6 rounded-3xl border ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}>
                  <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800/20 dark:border-slate-800/60 pb-3">
                    <Type className="w-4 h-4 text-indigo-500 animate-pulse" />
                    <h3 className="font-bold text-sm text-slate-100">Active Slide Editor</h3>
                  </div>

                  {(() => {
                    const activeQ = presentationQuestions[activeSlideIndex];
                    if (!activeQ) return null;
                    const config = getActiveSlideConfig(activeQ.id, activeQ.questionText);
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Modify Slide Text Content
                          </label>
                          <textarea
                            rows={3}
                            value={config.text}
                            onChange={e => updateActiveSlideConfig({ text: e.target.value })}
                            className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                              theme === "dark" ? "bg-slate-850 border-slate-700 text-white placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              Text Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={config.color}
                                onChange={e => updateActiveSlideConfig({ color: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                              />
                              <input
                                type="text"
                                value={config.color}
                                onChange={e => updateActiveSlideConfig({ color: e.target.value })}
                                className={`w-full text-[10px] font-mono p-2 rounded-lg border text-center focus:outline-hidden ${
                                  theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                                }`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              Text Font Size
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={12}
                                max={50}
                                value={config.fontSize}
                                onChange={e => updateActiveSlideConfig({ fontSize: Number(e.target.value) })}
                                className="w-full accent-indigo-500 cursor-pointer"
                              />
                              <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                                {config.fontSize}px
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              X Coordinate ({Math.round(config.x)}%)
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={90}
                              value={Math.round(config.x)}
                              onChange={e => updateActiveSlideConfig({ x: Number(e.target.value) })}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Y Coordinate ({Math.round(config.y)}%)
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={90}
                              value={Math.round(config.y)}
                              onChange={e => updateActiveSlideConfig({ y: Number(e.target.value) })}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/10 text-[9px] text-indigo-300 italic">
                          💡 Tip: Drag the question text directly on the canvas to place it, or use the sliders above!
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* APPEND AI QUESTIONS SECTION */}
              <div className={`p-6 rounded-3xl border ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
                  <h4 className="font-bold text-xs text-slate-100">AI Slide Injector</h4>
                </div>
                <p className="text-[10px] text-slate-400 mb-4">Craft targeted assessment curriculum slides using Gemini and append them directly to this presentation</p>

                {aiSlideError && (
                  <div className="p-3 text-[10px] bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl mb-3">
                    ⚠️ {aiSlideError}
                  </div>
                )}

                {aiSlideSuccess && (
                  <div className="p-3 text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl mb-3">
                    ✓ Questions generated and appended!
                  </div>
                )}

                <form onSubmit={handleGenerateSlideQuestionsAI} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Calculus, Indian Geography"
                      value={aiSlideSubject}
                      onChange={e => setAiSlideSubject(e.target.value)}
                      className={`w-full text-xs p-2 rounded-lg border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Count</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={aiSlideCount}
                        onChange={e => setAiSlideCount(e.target.value)}
                        className={`w-full text-xs p-2 rounded-lg border focus:outline-hidden ${
                          theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Difficulty</label>
                      <select
                        value={aiSlideDifficulty}
                        onChange={e => setAiSlideDifficulty(e.target.value as any)}
                        className={`w-full text-xs p-2 rounded-lg border focus:outline-hidden ${
                          theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Directives / Context</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Focus on trigonometric substitutions or 1857 revolt details..."
                      value={aiSlidePrompt}
                      onChange={e => setAiSlidePrompt(e.target.value)}
                      className={`w-full text-xs p-2 rounded-lg border focus:outline-hidden resize-none ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generatingSlideQuestions}
                    className="w-full text-[10px] font-bold py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {generatingSlideQuestions ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generatingSlideQuestions ? "Consulting AI..." : "Inject AI Generated Slides"}
                  </button>
                </form>
              </div>
            </div>

            {/* COLUMN 2 & 3: SLIDE DECK VIEWER, ACTIVE PREVIEW & EXPORTER */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* PRESENTATION PREVIEW AND ACTIONS */}
              <div className={`p-6 sm:p-8 rounded-3xl border ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/20 dark:border-slate-800/60 pb-4 mb-6">
                  <div>
                    <h3 className="text-md font-bold tracking-tight">Active Slides Arena</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Rearrange, preview, or export high-resolution presentation PDF documents with one question per slide
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {presentationQuestions.length > 0 && (
                      <button
                        onClick={() => {
                          setPresentationQuestions([]);
                          setActiveSlideIndex(0);
                        }}
                        className="text-[10px] font-bold px-3 py-1.5 border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                      >
                        Clear Deck
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const remaining = questionBank.filter(q => !presentationQuestions.some(p => p.id === q.id));
                        setPresentationQuestions([...presentationQuestions, ...remaining]);
                      }}
                      className="text-[10px] font-bold px-3 py-1.5 border border-indigo-500/20 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      Add All From Bank
                    </button>
                    <button
                      onClick={handleExportPresentationPdf}
                      disabled={exportingPdf || presentationQuestions.length === 0}
                      className="text-[10px] font-bold px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      {exportingPdf ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {exportingPdf ? "Generating PDF..." : "Export 16:9 Presentation PDF"}
                    </button>
                  </div>
                </div>

                {presentationQuestions.length === 0 ? (
                  <div className="p-16 text-center border border-dashed border-slate-800/40 dark:border-slate-800/70 rounded-3xl bg-slate-950/20">
                    <Layout className="w-10 h-10 text-slate-500 mx-auto mb-3 animate-pulse" />
                    <h4 className="font-bold text-xs text-slate-300">Your Slide Deck is Currently Empty</h4>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Add slides from the Question Bank list or use the Quick-Import tray below, or generate on-the-fly questions with AI!
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setActiveTab("bank");
                        }}
                        className="text-[10px] font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-500 transition-all"
                      >
                        Visit Question Bank
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* ASPECT VIDEO PREVIEW */}
                    <div 
                      className="w-full border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 aspect-video relative flex items-center justify-center"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      
                      {/* Responsive Preview rendering container */}
                      <div
                        id="slide-canvas-preview"
                        className="w-full h-full p-8 select-none transition-all duration-300 relative flex flex-col justify-start overflow-hidden"
                        style={{
                          backgroundImage: uploadedBg ? `url(${uploadedBg})` : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: uploadedBg 
                            ? "transparent" 
                            : slideTheme === "cbse2025" 
                              ? "#fffbeb" // warm cream for school theme
                              : slideTheme === "darkslate"
                                ? "#020617" // slate-950
                                : slideTheme === "techneon"
                                  ? "#09090b" // zinc-950
                                  : slideTheme === "chalkboard"
                                    ? "#0f2d1d" // dark dusty forest green
                                    : "#ffffff" // classic white
                        }}
                      >
                        {/* THEME DECORATIVE OVERLAYS */}
                        {!hideDecorations && slideTheme === "cbse2025" && !uploadedBg && (
                          <div className="absolute inset-x-0 top-0 h-12 bg-red-800 border-b-4 border-amber-400 flex items-center justify-between px-6 z-10">
                            <span className="text-white text-[10px] font-black tracking-widest uppercase">★ CENTRAL BOARD OF PRACTICE (CBSE 2025) ★</span>
                            <span className="text-amber-300 text-[9px] font-bold bg-black/30 px-2 py-0.5 rounded-md border border-amber-500/20">{watermarkText || "Co-Scholar Arena"}</span>
                          </div>
                        )}

                        {!hideDecorations && slideTheme === "darkslate" && !uploadedBg && (
                          <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
                        )}

                        {/* DRAGGABLE & EDITABLE SLIDE CONTENT */}
                        {(() => {
                          const activeQ = presentationQuestions[activeSlideIndex];
                          if (!activeQ) return null;
                          const config = getActiveSlideConfig(activeQ.id, activeQ.questionText);
                          
                          // Dragging Mouse Down handler
                          const handleMouseDown = (e: React.MouseEvent) => {
                            e.preventDefault();
                            setIsDragging(true);
                            setDragStart({ x: e.clientX, y: e.clientY });
                            setInitialPos({ x: config.x, y: config.y });
                          };

                          return (
                            <div className="w-full h-full relative">
                              
                              {/* Draggable container for the question text and its boundary option */}
                              <div
                                className={`absolute cursor-move select-none p-5 rounded-2xl transition-all duration-75 ${
                                  borderStyle === "glowing"
                                    ? "border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] bg-indigo-500/5"
                                    : borderStyle === "double"
                                      ? "border-4 border-double border-slate-750 bg-slate-900/40"
                                      : borderStyle === "solid"
                                        ? "border-2 border-slate-900 dark:border-white bg-slate-950/20"
                                        : borderStyle === "dashed"
                                          ? "border-2 border-dashed border-white/40 bg-white/5"
                                          : "bg-slate-900/10 dark:bg-slate-950/10"
                                }`}
                                style={{
                                  left: `${config.x}%`,
                                  top: `${config.y}%`,
                                  width: slideLayout === "full-width-top" ? "90%" : "46%",
                                  pointerEvents: "auto",
                                  zIndex: 30
                                }}
                                onMouseDown={handleMouseDown}
                              >
                                {/* Drag helper / badge (Only visible inside app builder, hidden if hideDecorations is true or when exporting) */}
                                {!hideDecorations && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                      slideTheme === "cbse2025" ? "bg-red-800 text-white" : "bg-indigo-500/10 text-indigo-400"
                                    }`}>
                                      {activeQ.subject}
                                    </span>
                                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-black/30 text-slate-400">
                                      {activeQ.difficulty}
                                    </span>
                                    <span className="text-[7px] text-slate-500 font-mono ml-auto">Drag me!</span>
                                  </div>
                                )}

                                {/* Question Text */}
                                <p
                                  style={{
                                    fontSize: `${config.fontSize}px`,
                                    color: config.color,
                                    fontWeight: 900,
                                    lineHeight: 1.35,
                                    fontFamily: slideTheme === "chalkboard" ? "monospace" : "sans-serif"
                                  }}
                                  className="tracking-tight whitespace-pre-wrap select-none"
                                >
                                  {config.text}
                                </p>

                                {/* Multiple Choice Options */}
                                {activeQ.options && activeQ.options.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    {activeQ.options.map((opt, oIdx) => {
                                      const letter = String.fromCharCode(65 + oIdx);
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold border flex items-center gap-2 ${
                                            slideTheme === "cbse2025"
                                              ? "bg-amber-100/50 border-amber-200 text-amber-900"
                                              : slideTheme === "chalkboard"
                                                ? "bg-white/5 border-white/10 text-white"
                                                : "bg-slate-900/60 border-slate-800 text-slate-300"
                                          }`}
                                        >
                                          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black ${
                                            slideTheme === "cbse2025" 
                                              ? "bg-red-800 text-white" 
                                              : "bg-indigo-600 text-white"
                                          }`}>
                                            {letter}
                                          </span>
                                          <span>{opt}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Split Solution Area Box (Only visible in Split Column layout) */}
                              {slideLayout === "split-50-50" && (
                                <div 
                                  className={`absolute rounded-2xl border flex flex-col justify-between p-5 overflow-hidden`}
                                  style={{
                                    right: "2%",
                                    top: "8%",
                                    width: "46%",
                                    height: "84%",
                                    backgroundColor: slideTheme === "cbse2025"
                                      ? "rgba(255, 255, 255, 0.75)"
                                      : slideTheme === "chalkboard"
                                        ? "rgba(15, 45, 29, 0.2)"
                                        : "rgba(15, 23, 42, 0.3)",
                                    borderColor: slideTheme === "cbse2025"
                                      ? "#fde047"
                                      : "rgba(255, 255, 255, 0.1)"
                                  }}
                                >
                                  {/* Solution background style patterns */}
                                  {solutionStyle === "ruled" && (
                                    <div className="absolute inset-x-0 top-12 bottom-12 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
                                      {Array.from({ length: 8 }).map((_, lIdx) => (
                                        <div key={lIdx} className="w-full border-b border-indigo-400 h-0" />
                                      ))}
                                    </div>
                                  )}
                                  {solutionStyle === "grid" && (
                                    <div
                                      className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.03]"
                                      style={{
                                        backgroundImage: "linear-gradient(to right, #6362f1 1px, transparent 1px), linear-gradient(to bottom, #6362f1 1px, transparent 1px)",
                                        backgroundSize: "16px 16px"
                                      }}
                                    />
                                  )}
                                  {solutionStyle === "dotted" && (
                                    <div
                                      className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-10"
                                      style={{
                                        backgroundImage: "radial-gradient(#6362f1 1px, transparent 1px)",
                                        backgroundSize: "16px 16px"
                                      }}
                                    />
                                  )}

                                  {/* Solution Arena Header */}
                                  {!hideDecorations && (
                                    <div className="flex items-center justify-between border-b border-slate-800/10 dark:border-slate-800/40 pb-2 z-10">
                                      <span className={`text-[9px] font-black uppercase tracking-wider ${
                                        slideTheme === "cbse2025" ? "text-red-800" : "text-indigo-400"
                                      }`}>
                                        ✎ STUDENT SOLUTION ARENA
                                      </span>
                                    </div>
                                  )}

                                  {/* Physical canvas space hint */}
                                  <div className="my-auto text-center pointer-events-none z-10">
                                    <p className="text-[10px] text-slate-500 font-medium italic">
                                      [Calculations & Solution Area]
                                    </p>
                                  </div>

                                  {/* Solution Footer */}
                                  {!hideDecorations && (
                                    <div className="flex items-center justify-between text-[8px] text-slate-500 font-semibold pt-2 border-t border-slate-800/10 dark:border-slate-800/40 z-10">
                                      <span>MARKS: ______</span>
                                      <span>TEACHER CO-SIGN: ______________</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Watermark brand at bottom (Hidden if hideDecorations is true) */}
                              {!hideDecorations && (
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                                  <span>{watermarkText}</span>
                                  <span className="font-bold">SLIDE PAGE {activeSlideIndex + 1} OF {presentationQuestions.length}</span>
                                </div>
                              )}

                            </div>
                          );
                        })()}

                      </div>

                    </div>

                    {/* SLIDE NAVIGATION AND REORDER LIST */}
                    <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-800/10 dark:border-slate-800/55 pt-4">
                      
                      {/* Previous/Next */}
                      <div className="flex items-center gap-2">
                        <button
                          disabled={activeSlideIndex === 0}
                          onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-400">
                          Slide <b className="text-indigo-400">{activeSlideIndex + 1}</b> of {presentationQuestions.length}
                        </span>
                        <button
                          disabled={activeSlideIndex === presentationQuestions.length - 1}
                          onClick={() => setActiveSlideIndex(prev => Math.min(presentationQuestions.length - 1, prev + 1))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Reorder actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            // Move slide up in array
                            if (activeSlideIndex > 0) {
                              const updated = [...presentationQuestions];
                              const temp = updated[activeSlideIndex];
                              updated[activeSlideIndex] = updated[activeSlideIndex - 1];
                              updated[activeSlideIndex - 1] = temp;
                              setPresentationQuestions(updated);
                              setActiveSlideIndex(activeSlideIndex - 1);
                            }
                          }}
                          disabled={activeSlideIndex === 0}
                          className="text-[10px] font-bold px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 border border-slate-750 text-slate-300 rounded-lg cursor-pointer"
                        >
                          Move Up
                        </button>
                        <button
                          onClick={() => {
                            // Move slide down in array
                            if (activeSlideIndex < presentationQuestions.length - 1) {
                              const updated = [...presentationQuestions];
                              const temp = updated[activeSlideIndex];
                              updated[activeSlideIndex] = updated[activeSlideIndex + 1];
                              updated[activeSlideIndex + 1] = temp;
                              setPresentationQuestions(updated);
                              setActiveSlideIndex(activeSlideIndex + 1);
                            }
                          }}
                          disabled={activeSlideIndex === presentationQuestions.length - 1}
                          className="text-[10px] font-bold px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 border border-slate-750 text-slate-300 rounded-lg cursor-pointer"
                        >
                          Move Down
                        </button>
                        <button
                          onClick={() => {
                            // Delete slide
                            const updated = presentationQuestions.filter((_, idx) => idx !== activeSlideIndex);
                            setPresentationQuestions(updated);
                            setActiveSlideIndex(prev => Math.max(0, Math.min(updated.length - 1, prev)));
                          }}
                          className="text-[10px] font-bold px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg cursor-pointer"
                        >
                          Remove Slide
                        </button>
                      </div>

                    </div>

                    {/* HORIZONTAL THUMBNAIL LIST OF SLIDES */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Slides Overview Deck Map</span>
                      <div className="flex gap-3 overflow-x-auto pb-3 pt-1">
                        {presentationQuestions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            onClick={() => setActiveSlideIndex(qIdx)}
                            className={`p-3 rounded-xl border shrink-0 w-44 cursor-pointer transition-all ${
                              activeSlideIndex === qIdx
                                ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                                : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[8px] font-bold bg-black/40 text-slate-400 px-1.5 py-0.5 rounded-md">SLIDE {qIdx + 1}</span>
                              <span className="text-[7px] text-slate-500 font-mono truncate max-w-[80px]">{q.subject}</span>
                            </div>
                            <p className="text-[9px] font-semibold text-slate-300 line-clamp-2">
                              {q.questionText}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* TRAY: QUICK IMPORT UN-ADDED QUESTION BANK */}
              <div className={`p-6 sm:p-8 rounded-3xl border ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-xs">Quick-Import Tray (Curriculum Bank)</h4>
                </div>
                <p className="text-[10px] text-slate-400 mb-4">
                  These questions currently reside inside your main Question Bank database but have not yet been imported into this 16:9 PDF presentation.
                </p>

                {questionBank.filter(q => !presentationQuestions.some(p => p.id === q.id)).length === 0 ? (
                  <div className="p-6 text-center border border-slate-800/40 bg-slate-950/10 rounded-2xl">
                    <p className="text-[10px] text-slate-500">All questions in the Question Bank are currently imported into this presentation deck!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
                    {questionBank
                      .filter(q => !presentationQuestions.some(p => p.id === q.id))
                      .map(q => (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-xl border border-slate-800/60 bg-slate-950/20 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex gap-1.5 mb-1.5">
                              <span className="text-[8px] font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md">{q.subject}</span>
                              <span className="text-[8px] font-bold bg-black/40 text-slate-500 px-1.5 py-0.5 rounded-md">{q.difficulty}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 font-semibold line-clamp-2">{q.questionText}</p>
                          </div>
                          <button
                            onClick={() => setPresentationQuestions([...presentationQuestions, q])}
                            className="mt-3 text-[9px] font-extrabold w-full text-center py-1 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all cursor-pointer border border-indigo-500/20"
                          >
                            + Import to Slide Deck
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL: EDIT INDIVIDUAL QUESTION */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/10 to-indigo-950/10">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Edit Question in Bank</h3>
              </div>
              <button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Question Content Text</label>
                <textarea
                  rows={3}
                  value={editingQuestion.questionText}
                  onChange={e => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                    theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editingQuestion.subject}
                    onChange={e => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* MCQ Options if editing a MCQ */}
              {Array.isArray(editingQuestion.options) && editingQuestion.options.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">MCQ Options Definition</label>
                  {editingQuestion.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400 w-4">{letter}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const updatedOpts = [...editingQuestion.options!];
                            updatedOpts[idx] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: updatedOpts });
                          }}
                          className={`flex-1 text-xs p-2 rounded-lg border focus:outline-hidden ${
                            theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        />
                      </div>
                    );
                  })}

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Correct Letter Key</label>
                    <input
                      type="text"
                      value={editingQuestion.correctAnswer}
                      onChange={e => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                      placeholder="Enter correct option exact text or index letter"
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                        theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Model Correct Answer Solution</label>
                  <input
                    type="text"
                    value={editingQuestion.correctAnswer}
                    onChange={e => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-950/20">
              <button
                onClick={() => setEditingQuestion(null)}
                className="text-xs px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateQuestion(editingQuestion)}
                className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
              >
                Save Updates
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODAL: EDIT PRACTICE SHEET DETAILS AND QUESTIONS */}
      {editingSheet && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/10 to-indigo-950/10">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Edit Practice Sheet Composition</h3>
              </div>
              <button onClick={() => setEditingSheet(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sheet Title</label>
                  <input
                    type="text"
                    value={editingSheet.title}
                    onChange={e => setEditingSheet({ ...editingSheet, title: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editingSheet.subject}
                    onChange={e => setEditingSheet({ ...editingSheet, subject: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-850 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* SHEET QUESTIONS SELECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions Inside Sheet ({editingSheet.questions.length})</label>
                </div>

                {editingSheet.questions.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-800/40 rounded-xl">
                    <p className="text-xs text-slate-500">No questions currently in this sheet. Select questions from the pool below to add!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {editingSheet.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="truncate flex-1 font-semibold text-slate-200">
                          {idx + 1}. {q.questionText}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Reorder questions (up)
                              if (idx > 0) {
                                const list = [...editingSheet.questions];
                                const temp = list[idx];
                                list[idx] = list[idx - 1];
                                list[idx - 1] = temp;
                                setEditingSheet({ ...editingSheet, questions: list });
                              }
                            }}
                            disabled={idx === 0}
                            className="p-1 hover:bg-slate-800 text-slate-400 disabled:opacity-30 rounded cursor-pointer"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => {
                              // Reorder questions (down)
                              if (idx < editingSheet.questions.length - 1) {
                                const list = [...editingSheet.questions];
                                const temp = list[idx];
                                list[idx] = list[idx + 1];
                                list[idx + 1] = temp;
                                setEditingSheet({ ...editingSheet, questions: list });
                              }
                            }}
                            disabled={idx === editingSheet.questions.length - 1}
                            className="p-1 hover:bg-slate-800 text-slate-400 disabled:opacity-30 rounded cursor-pointer"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => {
                              // Remove question from sheet
                              const list = editingSheet.questions.filter(item => item.id !== q.id);
                              setEditingSheet({ ...editingSheet, questions: list });
                            }}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ADD FROM QUESTION BANK POOL */}
              <div className="space-y-2 pt-2 border-t border-slate-800/40">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Available from Question Bank</span>
                {questionBank.filter(q => !editingSheet.questions.some(item => item.id === q.id)).length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">All bank questions are already in this sheet!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                    {questionBank
                      .filter(q => !editingSheet.questions.some(item => item.id === q.id))
                      .map(q => (
                        <div
                          key={q.id}
                          className="p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/20 text-[10px] flex items-center justify-between gap-2"
                        >
                          <span className="truncate flex-1 text-slate-300">{q.questionText}</span>
                          <button
                            onClick={() => {
                              setEditingSheet({ ...editingSheet, questions: [...editingSheet.questions, q] });
                            }}
                            className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded cursor-pointer shrink-0"
                          >
                            + Add Question
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-950/20">
              <button
                onClick={() => setEditingSheet(null)}
                className="text-xs px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateSheet(editingSheet.id, { title: editingSheet.title, subject: editingSheet.subject, questions: editingSheet.questions })}
                className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
              >
                Save Sheet Updates
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY: DELETE QUESTION */}
      {confirmDeleteQuestionId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-3xl border border-rose-500/20 p-6 space-y-4 shadow-2xl ${
            theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-slate-800"
          }`}>
            <h3 className="font-bold text-md text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Bank Question?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you absolutely sure you want to remove this question from your Question Bank? This will delete the item from the central database. Existing sheets with this question will still retain their copies.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteQuestionId(null)}
                className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteQuestion(confirmDeleteQuestionId);
                  setConfirmDeleteQuestionId(null);
                }}
                className="text-xs font-bold px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY: DELETE PRACTICE SHEET */}
      {confirmDeleteSheetId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-3xl border border-rose-500/20 p-6 space-y-4 shadow-2xl ${
            theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-slate-800"
          }`}>
            <h3 className="font-bold text-md text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Practice Sheet?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you absolutely sure you want to delete this Practice Sheet? This action is irreversible and will delete the sheet document, response logs, and student metrics.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteSheetId(null)}
                className="text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteSheet(confirmDeleteSheetId);
                  setConfirmDeleteSheetId(null);
                }}
                className="text-xs font-bold px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN 16:9 RENDERING STAGE SOLELY FOR CAPTURING PDF SLIDES (fixed size guarantees pixel perfect 16:9 960x540 rendering) */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden" style={{ width: "960px", height: "540px" }}>
        {presentationQuestions.length > 0 && (
          <div
            id="slide-canvas-preview"
            className="w-[960px] h-[540px] flex p-10 relative box-border"
            style={{
              backgroundImage: uploadedBg ? `url(${uploadedBg})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: uploadedBg 
                ? "transparent" 
                : slideTheme === "cbse2025" 
                  ? "#fffbeb" 
                  : slideTheme === "darkslate"
                    ? "#020617" 
                    : slideTheme === "techneon"
                      ? "#09090b" 
                      : slideTheme === "chalkboard"
                        ? "#0f2d1d" 
                        : "#ffffff"
            }}
          >
            {/* THEME OVERLAYS */}
            {slideTheme === "cbse2025" && !uploadedBg && (
              <div className="absolute inset-x-0 top-0 h-16 bg-red-800 border-b-4 border-amber-400 flex items-center justify-between px-8 z-10 box-border">
                <span className="text-white text-xs font-black tracking-widest uppercase">★ CENTRAL BOARD OF PRACTICE (CBSE 2025) ★</span>
                <span className="text-amber-300 text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded-md border border-amber-500/20">{watermarkText || "Co-Scholar Arena"}</span>
              </div>
            )}

            {slideTheme === "darkslate" && !uploadedBg && (
              <div className="absolute inset-5 border border-amber-500/15 rounded-2xl pointer-events-none" />
            )}

            <div className={`grid grid-cols-2 gap-10 w-full h-full box-border ${slideTheme === "cbse2025" ? "pt-14" : ""}`}>
              
              {/* LEFT COLUMN: QUESTION */}
              <div className="flex flex-col justify-between h-full box-border">
                <div className="my-auto">
                  <div
                    className={`p-6 rounded-2xl box-border ${
                      borderStyle === "glowing"
                        ? "border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] bg-indigo-500/5"
                        : borderStyle === "double"
                          ? "border-4 border-double border-slate-700 bg-slate-900/40"
                          : borderStyle === "solid"
                            ? "border-2 border-slate-900 dark:border-white bg-slate-950/20"
                            : borderStyle === "dashed"
                              ? "border-2 border-dashed border-white/40 bg-white/5"
                              : "bg-slate-900/10 dark:bg-slate-950/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        slideTheme === "cbse2025" ? "bg-red-800 text-white" : "bg-indigo-500/10 text-indigo-400"
                      }`}>
                        {presentationQuestions[activeSlideIndex]?.subject || "Assessment"}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/30 text-slate-400 border border-slate-800">
                        {presentationQuestions[activeSlideIndex]?.difficulty || "Medium"}
                      </span>
                    </div>

                    <p
                      className={`font-black leading-snug tracking-tight ${
                        slideTheme === "cbse2025"
                          ? "text-slate-900"
                          : slideTheme === "chalkboard"
                            ? "text-slate-100 font-mono"
                            : slideTheme === "classic"
                              ? "text-slate-800"
                              : "text-white"
                      }`}
                      style={{
                        fontSize: `${Math.max(12, Math.min(questionFontSize, presentationQuestions[activeSlideIndex]?.questionText.length > 120 ? 15 : questionFontSize))}px`
                      }}
                    >
                      Q. {presentationQuestions[activeSlideIndex]?.questionText}
                    </p>

                    {presentationQuestions[activeSlideIndex]?.options && presentationQuestions[activeSlideIndex]?.options!.length > 0 && (
                      <div className="mt-4 space-y-2.5">
                        {presentationQuestions[activeSlideIndex]?.options!.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          return (
                            <div
                              key={oIdx}
                              className={`px-3.5 py-2.5 rounded-xl text-[11px] font-bold border flex items-center gap-2.5 ${
                                slideTheme === "cbse2025"
                                  ? "bg-amber-100/50 border-amber-200 text-amber-900"
                                  : slideTheme === "chalkboard"
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-slate-900/60 border-slate-800 text-slate-300"
                              }`}
                            >
                              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                slideTheme === "cbse2025" ? "bg-red-800 text-white" : "bg-indigo-600 text-white"
                              }`}>
                                {letter}
                              </span>
                              <span>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                  <span>{watermarkText}</span>
                  <span>SLIDE PAGE {activeSlideIndex + 1} OF {presentationQuestions.length}</span>
                </div>
              </div>

              {/* RIGHT COLUMN: SOLUTION AREA */}
              <div className={`rounded-2xl border flex flex-col justify-between p-6 relative overflow-hidden h-full box-border ${
                slideTheme === "cbse2025"
                  ? "bg-white/75 border-amber-200"
                  : slideTheme === "chalkboard"
                    ? "bg-emerald-950/20 border-white/10"
                    : "bg-slate-900/30 border-slate-800"
              }`}>
                {solutionStyle === "ruled" && (
                  <div className="absolute inset-x-0 top-16 bottom-16 flex flex-col justify-between pointer-events-none opacity-25 dark:opacity-10 h-64">
                    {Array.from({ length: 10 }).map((_, lIdx) => (
                      <div key={lIdx} className="w-full border-b border-indigo-400 h-0" />
                    ))}
                  </div>
                )}

                {solutionStyle === "grid" && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.03]"
                    style={{
                      backgroundImage: "linear-gradient(to right, #6362f1 1px, transparent 1px), linear-gradient(to bottom, #6362f1 1px, transparent 1px)",
                      backgroundSize: "20px 20px"
                    }}
                  />
                )}

                {solutionStyle === "dotted" && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-10"
                    style={{
                      backgroundImage: "radial-gradient(#6362f1 1.5px, transparent 1.5px)",
                      backgroundSize: "20px 20px"
                    }}
                  />
                )}

                <div className="flex items-center justify-between border-b border-slate-800/10 dark:border-slate-800/40 pb-2 z-10">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    slideTheme === "cbse2025" ? "text-red-800" : "text-indigo-400"
                  }`}>
                    ✎ STUDENT SOLUTION / CALCULATIONS ARENA
                  </span>
                </div>

                <div className="my-auto text-center pointer-events-none z-10">
                  <p className="text-[11px] text-slate-500 font-bold italic">
                    [Provide ample physical writing canvas space here for solving formula workflows, diagrams, and model assessments]
                  </p>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-black pt-2 border-t border-slate-800/10 dark:border-slate-800/40 z-10">
                  <span>EVALUATION MARKS: ______</span>
                  <span>TEACHER SIGNATURE: ________________</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL: CREATE NEW PRACTICE SHEET */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/20 to-indigo-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">AI Practice Sheet Architect</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Automatic fallback to Gemini if Question Bank is insufficient</p>
                </div>
              </div>
              <button 
                onClick={() => !creatingSheet && setIsCreateOpen(false)}
                disabled={creatingSheet}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePracticeSheet} className="p-6 space-y-4">
              
              {sheetError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl">
                  ⚠️ {sheetError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Practice Sheet Title
                </label>
                <input
                  type="text"
                  required
                  disabled={creatingSheet}
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  placeholder="e.g. Physics Gravity Practice Set, History midterm prep"
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Subject */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Subject / Topic Area
                  </label>
                  {questionBank.length > 0 && (
                    <span className="text-[8px] text-indigo-400 font-extrabold uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      Bank Subjects Loaded
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={creatingSheet}
                  value={sheetSubject}
                  onChange={(e) => setSheetSubject(e.target.value)}
                  placeholder="e.g. Physics, World History (matches Bank questions automatically)"
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                  list="subjects-list"
                />
                <datalist id="subjects-list">
                  {Object.keys(subjectCounts).map((subj, idx) => (
                    <option key={idx} value={subj}>{subj} ({subjectCounts[subj]} saved questions)</option>
                  ))}
                </datalist>
              </div>

              {/* Count and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Count</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    disabled={creatingSheet}
                    value={sheetCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setSheetCount("");
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) {
                          setSheetCount(parsed);
                        }
                      }
                    }}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Difficulty</label>
                  <select
                    disabled={creatingSheet}
                    value={sheetDifficulty}
                    onChange={(e) => setSheetDifficulty(e.target.value as any)}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Special directives */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Gemini Prompt Directives (Optional)
                </label>
                <textarea
                  rows={2}
                  disabled={creatingSheet}
                  value={specialPrompt}
                  onChange={(e) => setSpecialPrompt(e.target.value)}
                  placeholder="e.g. Include 2 math MCQs about exponential curves, and short answer question explaining logarithm rules..."
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                  }`}
                />
              </div>

              {/* Loader animation */}
              {creatingSheet && (
                <div className="py-6 flex flex-col items-center justify-center space-y-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-purple-400 absolute top-3.5 left-3.5 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-indigo-400">Consulting database and crafting practice sheet...</p>
                    <p className="text-[10px] text-slate-400 italic">"Checking local Question Bank first. Calling Gemini to generate missing questions..."</p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={creatingSheet}
                  onClick={() => setIsCreateOpen(false)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSheet || !sheetTitle.trim() || !sheetSubject.trim()}
                  className="text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:scale-100 hover:scale-[1.02] shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {creatingSheet ? "Architecting..." : "Generate & Deploy Sheet"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
