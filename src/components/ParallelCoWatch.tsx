import React, { useState, useEffect, useRef } from "react";
import { SharedStream, AppStore, LiveRoom, getSafeHtmlSnippet } from "../types";
import { 
  Tv, 
  Plus, 
  Trash2, 
  LayoutGrid, 
  Maximize2, 
  Columns, 
  ExternalLink, 
  Code, 
  Youtube, 
  Globe, 
  BookOpen, 
  Sparkles, 
  Eye, 
  Clock, 
  PlusCircle, 
  Layers, 
  Check, 
  X,
  Share2,
  FileText,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Copy,
  Send,
  Users,
  Key,
  MessageSquare,
  HelpCircle
} from "lucide-react";

interface ParallelCoWatchProps {
  store: AppStore;
  onUpdateStore: (updatedFields: Partial<AppStore>) => Promise<void>;
  currentUser: any;
  theme: "light" | "dark";
}

export default function ParallelCoWatch({ store, onUpdateStore, currentUser, theme }: ParallelCoWatchProps) {
  const streams = store.sharedStreams || [];
  const liveRooms = store.liveRooms || [];
  
  // Watch Modes: "standard" (normal co-watch) or "live_call" (voice/video calls arena)
  const [watchMode, setWatchMode] = useState<"standard" | "live_call">("standard");

  // UI States for standard Co-Watch
  const [layoutMode, setLayoutMode] = useState<"grid" | "split" | "single">("grid");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  
  // Add Form States
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"youtube" | "iframe" | "html_snippet">("youtube");
  const [newContentValue, setNewContentValue] = useState("");
  const [newCategory, setNewCategory] = useState("Lectures");
  const [errorMessage, setErrorMessage] = useState("");

  // Gemini AI Generator States
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [isGeneratingSnippet, setIsGeneratingSnippet] = useState(false);
  const [geminiError, setGeminiError] = useState("");

  // Live Study Room Lobby States
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomTitleInput, setRoomTitleInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomStreamId, setRoomStreamId] = useState("");
  const [roomCreateError, setRoomCreateError] = useState("");

  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");

  // Current active live room details
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const activeRoom = liveRooms.find(r => r.id === currentRoomId);

  // Active room sidebar tab inside call: "call" or "chat"
  const [roomSidebarTab, setRoomSidebarTab] = useState<"call" | "chat">("call");
  const [chatInput, setChatInput] = useState("");

  // Web camera / microphone media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Quick notes state saved in localStorage for user's convenience
  const [localNotes, setLocalNotes] = useState(() => {
    return localStorage.getItem("cowatch_notes") || "";
  });

  useEffect(() => {
    localStorage.setItem("cowatch_notes", localNotes);
  }, [localNotes]);

  // Handle preset seed on first boot if list is empty
  useEffect(() => {
    if (streams.length === 0) {
      const presets: SharedStream[] = [
        {
          id: "preset-1",
          title: "MIT 18.06 Linear Algebra - Lecture 1: Geometry of Linear Equations",
          type: "youtube",
          contentValue: "https://www.youtube.com/watch?v=ZK3O402wf1c",
          category: "Lectures",
          addedBy: "system",
          addedByFullName: "AI Registrar",
          createdAt: new Date().toISOString(),
          activeWatchers: []
        },
        {
          id: "preset-2",
          title: "Physics Sandbox: Gravitational Body Simulation",
          type: "html_snippet",
          contentValue: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
    canvas { background: #1e293b; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    h3 { margin: 5px 0; font-size: 14px; text-transform: uppercase; color: #818cf8; letter-spacing: 1px; }
    p { margin: 2px 0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h3>Gravitational Orbit Arena</h3>
  <p>Click inside the canvas to launch new space particles!</p>
  <canvas id="orbitCanvas" width="450" height="230"></canvas>
  <script>
    const canvas = document.getElementById("orbitCanvas");
    const ctx = canvas.getContext("2d");
    const sun = { x: 225, y: 115, mass: 8000, radius: 10 };
    const particles = [
      { x: 225, y: 50, vx: 10, vy: 0, r: 4, color: '#38bdf8' },
      { x: 225, y: 180, vx: -8, vy: 0, r: 5, color: '#f43f5e' }
    ];

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - sun.x;
      const dy = y - sun.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // approximate stable orbit velocity vector
      const v = Math.sqrt(6000 / dist);
      particles.push({
        x: x,
        y: y,
        vx: -dy / dist * v,
        vy: dx / dist * v,
        r: 3 + Math.random() * 4,
        color: 'hsl(' + Math.random() * 360 + ', 80%, 65%)'
      });
    });

    function step() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Sun
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI*2);
      ctx.fillStyle = "#fbbf24";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#fbbf24";
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = sun.x - p.x;
        const dy = sun.y - p.y;
        const distSq = dx*dx + dy*dy;
        const dist = Math.sqrt(distSq);
        
        if (dist > sun.radius + 2) {
          const force = sun.mass / distSq;
          p.vx += (dx / dist) * force * 0.1;
          p.vy += (dy / dist) * force * 0.1;
        }

        p.x += p.vx * 0.5;
        p.y += p.vy * 0.5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      requestAnimationFrame(step);
    }
    step();
  </script>
</body>
</html>`,
          category: "Study Tools",
          addedBy: "system",
          addedByFullName: "Physics Lab Assistant",
          createdAt: new Date().toISOString(),
          activeWatchers: []
        },
        {
          id: "preset-3",
          title: "Wikipedia: Peer-to-Peer Networks Resource File",
          type: "iframe",
          contentValue: "https://en.m.wikipedia.org/wiki/Peer-to-peer",
          category: "Reference",
          addedBy: "system",
          addedByFullName: "Academic Dean",
          createdAt: new Date().toISOString(),
          activeWatchers: []
        }
      ];
      onUpdateStore({ sharedStreams: presets });
    }
  }, [streams]);

  // Handle local camera & microphone streams when entering/leaving active live call room
  useEffect(() => {
    let activeMediaStream: MediaStream | null = null;
    
    async function startMedia() {
      if (currentRoomId) {
        try {
          activeMediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
            audio: true
          });
          setLocalStream(activeMediaStream);
          setMediaError(null);
          
          // Apply initial track values
          activeMediaStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
          });
          activeMediaStream.getVideoTracks().forEach(track => {
            track.enabled = !isCameraOff;
          });
        } catch (err: any) {
          console.warn("Could not capture webcam/microphone:", err);
          setMediaError("Camera/microphone is blocked, in use, or unsupported in this iframe. Joining with audio-only status or digital avatar fallback.");
        }
      } else {
        if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
          setLocalStream(null);
        }
      }
    }
    
    startMedia();
    
    return () => {
      if (activeMediaStream) {
        activeMediaStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [currentRoomId]);

  // Bind local stream to video element when ready
  useEffect(() => {
    if (localVideoRef.current && localStream && !isCameraOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff, currentRoomId]);

  // Parse Youtube Video URL to Embed URL
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    if (url.includes("youtube.com/embed/")) {
      return url;
    }
    return `https://www.youtube.com/embed/${url}`; // fallback
  };

  // Categories for Co-Watch Standard Arena
  const categories = ["All", "Lectures", "Reference", "Study Tools", "Other"];

  // Filter streams for Standard Arena
  const filteredStreams = streams.filter(s => {
    if (selectedCategoryId === "All") return true;
    return s.category?.toLowerCase() === selectedCategoryId.toLowerCase();
  });

  // Handle adding new stream manually
  const handleAddStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!newTitle.trim()) {
      setErrorMessage("Please specify a descriptive title.");
      return;
    }
    if (!newContentValue.trim()) {
      setErrorMessage("Source URL, link, or HTML code is required.");
      return;
    }

    let processedContentValue = newContentValue.trim();

    if (newType === "iframe") {
      if (!processedContentValue.startsWith("http://") && !processedContentValue.startsWith("https://")) {
        processedContentValue = "https://" + processedContentValue;
      }
    }

    const newStream: SharedStream = {
      id: "stream_" + Date.now(),
      title: newTitle.trim(),
      type: newType,
      contentValue: processedContentValue,
      category: newCategory,
      addedBy: currentUser ? currentUser.username : "anonymous",
      addedByFullName: currentUser ? currentUser.fullName : "Anonymous Scholar",
      createdAt: new Date().toISOString(),
      activeWatchers: []
    };

    onUpdateStore({ sharedStreams: [...streams, newStream] });

    // Reset Form
    setNewTitle("");
    setNewContentValue("");
    setIsAddOpen(false);
  };

  // Handle Gemini Educational Snippet Generation
  const handleGenerateSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiPrompt.trim()) return;
    
    setIsGeneratingSnippet(true);
    setGeminiError("");

    try {
      const response = await fetch("/api/ai/generate-snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: geminiPrompt.trim(),
          username: currentUser?.username || "anonymous",
          fullName: currentUser?.fullName || "Anonymous Scholar"
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate educational widget.");
      }

      // Update local store state with the new stream & store returned by server
      if (data.store) {
        await onUpdateStore(data.store);
      } else if (data.stream) {
        await onUpdateStore({ sharedStreams: [...streams, data.stream] });
      }

      // Select newly added AI stream as focus or open category
      setSelectedCategoryId("All");
      setGeminiPrompt("");
      setIsGeminiOpen(false);
    } catch (err: any) {
      console.error("Gemini Snippet Maker failed:", err);
      setGeminiError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGeneratingSnippet(false);
    }
  };

  // Remove shared stream
  const handleRemoveStream = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this shared lecture/iframe?")) return;
    const updated = streams.filter(s => s.id !== id);
    onUpdateStore({ sharedStreams: updated });
    if (activeStreamId === id) {
      setActiveStreamId(null);
    }
  };

  // Toggle dynamic Watcher state
  const handleToggleWatcher = (streamId: string) => {
    if (!currentUser) return;
    const updated = streams.map(s => {
      const watchers = s.activeWatchers || [];
      const isWatching = watchers.includes(currentUser.username);
      let nextWatchers = [...watchers];
      
      if (s.id === streamId) {
        if (isWatching) {
          nextWatchers = nextWatchers.filter(u => u !== currentUser.username);
        } else {
          nextWatchers.push(currentUser.username);
        }
      } else {
        // Stop watching other streams to keep active state clean
        nextWatchers = nextWatchers.filter(u => u !== currentUser.username);
      }
      return { ...s, activeWatchers: nextWatchers };
    });

    onUpdateStore({ sharedStreams: updated });
  };

  // --- LIVE CALL ROOM METHODS ---

  // Handle creating a live call room
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomCreateError("");

    if (!currentUser) {
      setRoomCreateError("Please log in first to create a study room.");
      return;
    }
    if (!roomTitleInput.trim()) {
      setRoomCreateError("Please specify a study room title.");
      return;
    }

    const code = roomCodeInput.trim() 
      ? roomCodeInput.trim().toUpperCase() 
      : "ROOM-" + Math.floor(1000 + Math.random() * 9000);

    // Verify room code uniqueness
    const isCodeTaken = liveRooms.some(r => r.code.toUpperCase() === code);
    if (isCodeTaken) {
      setRoomCreateError(`Code "${code}" is already active. Please enter a different room code.`);
      return;
    }

    const targetStreamId = roomStreamId || (streams.length > 0 ? streams[0].id : null);
    const selectedStream = streams.find(s => s.id === targetStreamId);

    const newRoom: LiveRoom = {
      id: "room_" + Date.now(),
      code: code,
      title: roomTitleInput.trim(),
      streamId: targetStreamId,
      streamTitle: selectedStream?.title || "Welcome Screen",
      streamType: selectedStream?.type || "html_snippet",
      streamValue: selectedStream?.contentValue || "<h2>Welcome to Study Arena</h2>",
      createdByName: currentUser.fullName,
      createdByUsername: currentUser.username,
      createdAt: new Date().toISOString(),
      participants: [
        {
          username: currentUser.username,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl,
          joinedAt: new Date().toISOString(),
          isMuted: false,
          isCameraOff: false
        }
      ],
      messages: [
        {
          id: "sys_" + Date.now(),
          sender: "system",
          senderName: "Study Bot",
          text: `🎥 Call session created by ${currentUser.fullName}! Share the Room Code with friends so they can join you.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    // Clean up current user from any other rooms they might be listed in
    const cleanedRooms = liveRooms.map(room => ({
      ...room,
      participants: room.participants.filter(p => p.username !== currentUser.username)
    }));

    await onUpdateStore({ liveRooms: [...cleanedRooms, newRoom] });

    // Transition into the active room
    setCurrentRoomId(newRoom.id);
    setIsCreateRoomOpen(false);
    setRoomTitleInput("");
    setRoomCodeInput("");
    setRoomStreamId("");
    setIsMuted(false);
    setIsCameraOff(false);
  };

  // Join a live call room by Code or ID
  const handleJoinCallRoom = async (roomCode: string) => {
    if (!currentUser) {
      alert("Please log in first to join active call rooms.");
      return;
    }
    setJoinCodeError("");
    if (!roomCode.trim()) {
      setJoinCodeError("Please specify a room code to join.");
      return;
    }

    const targetRoom = liveRooms.find(
      r => r.code.toUpperCase() === roomCode.trim().toUpperCase() || r.id === roomCode.trim()
    );

    if (!targetRoom) {
      setJoinCodeError("No active room found with that code. Make sure the code is correct.");
      return;
    }

    // Prepare participants list
    const alreadyIn = targetRoom.participants.some(p => p.username === currentUser.username);
    let nextParticipants = [...targetRoom.participants];
    
    if (!alreadyIn) {
      nextParticipants.push({
        username: currentUser.username,
        fullName: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl,
        joinedAt: new Date().toISOString(),
        isMuted: false,
        isCameraOff: false
      });
    }

    // Update global state, removing user from other rooms
    const updatedRooms = liveRooms.map(room => {
      if (room.id === targetRoom.id) {
        const nextMsgs = [
          ...(room.messages || []),
          {
            id: "sys_" + Date.now(),
            sender: "system",
            senderName: "Study Bot",
            text: `${currentUser.fullName} joined the live call!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        return { ...room, participants: nextParticipants, messages: nextMsgs };
      }
      return {
        ...room,
        participants: room.participants.filter(p => p.username !== currentUser.username)
      };
    });

    setCurrentRoomId(targetRoom.id);
    setIsMuted(false);
    setIsCameraOff(false);
    setJoinCodeInput("");
    setJoinCodeError("");

    await onUpdateStore({ liveRooms: updatedRooms });
  };

  // Exit current call room
  const handleLeaveCallRoom = async () => {
    if (!currentUser || !currentRoomId) return;

    const updatedRooms = liveRooms.map(room => {
      if (room.id === currentRoomId) {
        const nextMsgs = [
          ...(room.messages || []),
          {
            id: "sys_" + Date.now(),
            sender: "system",
            senderName: "Study Bot",
            text: `${currentUser.fullName} left the call.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        return {
          ...room,
          participants: room.participants.filter(p => p.username !== currentUser.username),
          messages: nextMsgs
        };
      }
      return room;
    });

    // Stop local video tracking
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }

    setCurrentRoomId(null);
    setIsMuted(false);
    setIsCameraOff(false);

    await onUpdateStore({ liveRooms: updatedRooms });
  };

  // Toggle user's mute state inside current room
  const handleToggleMute = async () => {
    if (!currentRoomId || !currentUser) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (localStream) {
      localStream.getAudioTracks().forEach(t => {
        t.enabled = !nextMute;
      });
    }

    const updated = liveRooms.map(room => {
      if (room.id === currentRoomId) {
        const nextParts = room.participants.map(p => {
          if (p.username === currentUser.username) {
            return { ...p, isMuted: nextMute };
          }
          return p;
        });
        return { ...room, participants: nextParts };
      }
      return room;
    });

    await onUpdateStore({ liveRooms: updated });
  };

  // Toggle user's video state inside current room
  const handleToggleCamera = async () => {
    if (!currentRoomId || !currentUser) return;
    const nextCam = !isCameraOff;
    setIsCameraOff(nextCam);

    if (localStream) {
      localStream.getVideoTracks().forEach(t => {
        t.enabled = !nextCam;
      });
    }

    const updated = liveRooms.map(room => {
      if (room.id === currentRoomId) {
        const nextParts = room.participants.map(p => {
          if (p.username === currentUser.username) {
            return { ...p, isCameraOff: nextCam };
          }
          return p;
        });
        return { ...room, participants: nextParts };
      }
      return room;
    });

    await onUpdateStore({ liveRooms: updated });
  };

  // Dynamically change the study topic / stream for everyone inside the room
  const handleRoomChangeStream = async (streamId: string) => {
    if (!currentRoomId || !streamId) return;
    const selectedStream = streams.find(s => s.id === streamId);
    if (!selectedStream) return;

    const updated = liveRooms.map(room => {
      if (room.id === currentRoomId) {
        const nextMsgs = [
          ...(room.messages || []),
          {
            id: "sys_change_" + Date.now(),
            sender: "system",
            senderName: "Study Bot",
            text: `${currentUser?.fullName || "Peer"} changed the shared topic stream to: "${selectedStream.title}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
        return {
          ...room,
          streamId: streamId,
          streamTitle: selectedStream.title,
          streamType: selectedStream.type,
          streamValue: selectedStream.contentValue,
          messages: nextMsgs
        };
      }
      return room;
    });

    await onUpdateStore({ liveRooms: updated });
  };

  // Send message inside the call room chat
  const handleSendRoomChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser || !currentRoomId) return;

    const newMessage = {
      id: "msg_" + Date.now(),
      sender: currentUser.username,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatarUrl,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = liveRooms.map(room => {
      if (room.id === currentRoomId) {
        return {
          ...room,
          messages: [...(room.messages || []), newMessage]
        };
      }
      return room;
    });

    setChatInput("");
    await onUpdateStore({ liveRooms: updated });
  };

  // Helper to copy Room Code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Room Code "${code}" copied to clipboard! Share it with your classmates.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="parallel_watch_workspace">
      
      {/* HEADER BANNER */}
      <div className={`p-6 rounded-3xl border transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"} shadow-xs`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xs shrink-0">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-md sm:text-lg font-bold tracking-tight flex items-center gap-2">
                Co-Watching & Live Study Arena
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase animate-pulse">
                  Voice & Video Active
                </span>
              </h2>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Watch YouTube lectures, run interactive sandboxed HTML widgets, or join full voice/video call rooms to study in real-time with your peers.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setIsGeminiOpen(true)}
              className="flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-violet-200" />
              Generate with Gemini
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className={`flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${
                theme === "dark" 
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Stream/Widget
            </button>
          </div>
        </div>

        {/* WORKSPACE SUB-TAB CONTROLS */}
        <div className="flex items-center gap-1.5 mt-5 bg-slate-950/10 dark:bg-slate-950/40 p-1.5 rounded-2xl max-w-sm">
          <button
            onClick={() => { setWatchMode("standard"); }}
            disabled={!!currentRoomId}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              watchMode === "standard"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 disabled:opacity-40"
            }`}
            title={currentRoomId ? "Leave active call to change arena modes" : "Normal co-watch workspace grid"}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Co-Watch Grid
          </button>
          
          <button
            onClick={() => { setWatchMode("live_call"); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              watchMode === "live_call" || currentRoomId
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Live Call Rooms
            {liveRooms.some(r => r.participants.length > 0) && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* RENDER CURRENT WATCH MODE PANEL */}

      {watchMode === "standard" && !currentRoomId ? (
        /* STANDARD CO-WATCH GRID AREA */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: SHARED WEBSITES, LECTURES & WIDGETS */}
          <div className="lg:col-span-8 space-y-4 flex flex-col">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Selector */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryId(cat)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      selectedCategoryId === cat
                        ? "bg-indigo-600 text-white"
                        : theme === "dark"
                          ? "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Layout selectors */}
              <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-950/10 dark:bg-slate-950/40 p-1 rounded-xl">
                <button
                  onClick={() => setLayoutMode("grid")}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    layoutMode === "grid" 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Grid Screen Layout"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                
                <button
                  onClick={() => setLayoutMode("split")}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    layoutMode === "split" 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Split Screen Layout"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split</span>
                </button>

                <button
                  onClick={() => setLayoutMode("single")}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    layoutMode === "single" 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Single Focus Layout"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Single</span>
                </button>
              </div>
            </div>

            {filteredStreams.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl border ${theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-100 text-slate-500"}`}>
                <Tv className="w-10 h-10 mx-auto text-slate-500/50 mb-3 animate-pulse" />
                <p className="font-bold text-sm">No shared streams or lecture embeds found</p>
                <p className="text-xs text-slate-400 mt-1">Add a new YouTube URL or Custom HTML widget to get started!</p>
              </div>
            ) : (
              <div className={`grid gap-5 ${
                layoutMode === "grid" 
                  ? "grid-cols-1 md:grid-cols-2" 
                  : layoutMode === "split" 
                    ? "grid-cols-1 md:grid-cols-2" 
                    : "grid-cols-1"
              }`}>
                {filteredStreams.map(stream => {
                  const isWatching = currentUser && (stream.activeWatchers || []).includes(currentUser.username);
                  const watchersCount = (stream.activeWatchers || []).length;
                  
                  return (
                    <div 
                      key={stream.id}
                      className={`flex flex-col rounded-2xl border overflow-hidden shadow-xs group transition-all duration-300 ${
                        theme === "dark" 
                          ? "bg-slate-900 border-slate-800 focus-within:border-indigo-500" 
                          : "bg-white border-slate-150 focus-within:border-indigo-500"
                      } ${isWatching ? "ring-2 ring-indigo-500/60" : ""}`}
                    >
                      {/* Video Player Display */}
                      <div className="relative w-full aspect-video bg-black overflow-hidden">
                        {stream.type === "youtube" ? (
                          <iframe
                            src={`${getYoutubeEmbedUrl(stream.contentValue)}?autoplay=0&mute=0`}
                            title={stream.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : stream.type === "html_snippet" ? (
                          <iframe
                            srcDoc={getSafeHtmlSnippet(stream.contentValue)}
                            title={stream.title}
                            className="w-full h-full border-0 bg-slate-950"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        ) : (
                          <iframe
                            src={stream.contentValue}
                            title={stream.title}
                            className="w-full h-full border-0 bg-white"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        )}

                        {/* Stream badge overlays */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-bold text-white uppercase border border-slate-800">
                          {stream.type === "youtube" ? (
                            <Youtube className="w-3 h-3 text-red-500 shrink-0" />
                          ) : stream.type === "html_snippet" ? (
                            <Code className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <Globe className="w-3 h-3 text-blue-400 shrink-0" />
                          )}
                          <span>{stream.type === "html_snippet" ? "Custom Snippet" : stream.type}</span>
                        </div>

                        {watchersCount > 0 && (
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-bold text-emerald-400">
                            <Eye className="w-3 h-3 shrink-0" />
                            <span>{watchersCount} watching</span>
                          </div>
                        )}
                      </div>

                      {/* Info & buttons */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                            }`}>
                              {stream.category || "General"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Added by {stream.addedByFullName}
                            </span>
                          </div>

                          <h3 className={`text-xs font-bold mt-2 leading-snug line-clamp-2 ${
                            theme === "dark" ? "text-slate-100" : "text-slate-800"
                          }`}>
                            {stream.title}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            onClick={() => handleToggleWatcher(stream.id)}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              isWatching
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : theme === "dark"
                                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isWatching ? "Leave Session" : "Join Watching"}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {stream.type === "iframe" && (
                              <a
                                href={stream.contentValue}
                                target="_blank"
                                rel="noreferrer"
                                className={`p-1.5 rounded-lg border transition-all ${
                                  theme === "dark" ? "bg-slate-850 border-slate-750 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                                }`}
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={(e) => handleRemoveStream(stream.id, e)}
                              className="p-1.5 rounded-lg border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
                              title="Delete shared stream"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: INTEGRATED STUDY NOTES & ACTIVE WATCHERS */}
          <div className="lg:col-span-4 space-y-5">
            {/* PERSONAL STUDY NOTEPAD */}
            <div className={`p-4 rounded-3xl border flex flex-col h-[320px] transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
            } shadow-xs`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-bold text-xs tracking-tight">Lecture Notepad</h3>
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                  Auto-Saved
                </span>
              </div>

              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Jot down formulas, ideas, timestamps, or equations here while watching lectures side-by-side..."
                className={`flex-1 text-xs p-3 mt-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                  theme === "dark" 
                    ? "bg-slate-950 border-slate-850 text-slate-200 placeholder-slate-600 focus:border-indigo-500" 
                    : "bg-slate-50 border-slate-150 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                }`}
              />
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium mt-2 px-1">
                <span>Stored in browser local cache</span>
                <span>{localNotes.length} chars</span>
              </div>
            </div>

            {/* LIVE ACTIVE WATCHERS SUMMARY */}
            <div className={`p-5 rounded-3xl border transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
            } shadow-xs`}>
              <h3 className="font-bold text-xs border-b pb-3 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Active Watching Sessions</span>
                <span className="text-[10px] text-emerald-500 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Live Sync
                </span>
              </h3>

              <div className="space-y-3 mt-3.5 max-h-[220px] overflow-y-auto pr-1">
                {streams.some(s => (s.activeWatchers || []).length > 0) ? (
                  streams
                    .filter(s => (s.activeWatchers || []).length > 0)
                    .map(s => (
                      <div key={s.id} className="text-xs p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="font-bold text-[10px] text-indigo-400 truncate">
                          🎬 {s.title}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {(s.activeWatchers || []).map(watcher => {
                            const userObj = store.accounts?.find(a => a.username === watcher);
                            return (
                              <span 
                                key={watcher}
                                className={`text-[8px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                {userObj?.fullName || watcher}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <Eye className="w-5 h-5 mx-auto text-slate-500/40 mb-1.5" />
                    <p className="font-bold text-[10px] text-slate-500">No active watchers.</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Click "Join Watching" below a lecture to start!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (watchMode === "live_call" || currentRoomId) && !currentRoomId ? (
        /* LIVE STUDY ROOM LOBBY (WHEN NOT ACTIVE IN A CALL) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LOBBY LEFT CARD: JOIN VIA CODE */}
            <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
            } shadow-xs flex flex-col justify-between`}>
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 bg-emerald-600 rounded-xl text-white">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Enter Room Code</h3>
                    <p className="text-[11px] text-slate-400">Classmate shared a key? Join their call instantly</p>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value);
                      setJoinCodeError("");
                    }}
                    placeholder="e.g. CALC-3912, PHYS-20"
                    className={`w-full text-sm p-3.5 font-bold font-mono tracking-widest text-center uppercase rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-800 text-emerald-400 placeholder-slate-700" 
                        : "bg-slate-50 border-slate-200 text-emerald-600 placeholder-slate-400"
                    }`}
                  />
                  {joinCodeError && (
                    <p className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                      ⚠️ {joinCodeError}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleJoinCallRoom(joinCodeInput)}
                className="w-full mt-6 text-xs font-bold py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Join Live Call Arena
              </button>
            </div>

            {/* LOBBY RIGHT CARD: LAUNCH NEW ROOM BANNER */}
            <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
            } shadow-xs flex flex-col justify-between`}>
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Create Live Room</h3>
                    <p className="text-[11px] text-slate-400">Launch a private room with voice, video, and co-sync widgets</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mt-4">
                  Start a study block, select a chemistry element puzzle, a trigonometry unit circle, or an MIT lecture video, and generate a secure code. Classmates can speak, share camera streams, and chat.
                </p>
              </div>

              <button
                onClick={() => {
                  setRoomTitleInput("");
                  setRoomCodeInput("");
                  setRoomStreamId(streams.length > 0 ? streams[0].id : "");
                  setRoomCreateError("");
                  setIsCreateRoomOpen(true);
                }}
                className="w-full mt-6 text-xs font-bold py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Tv className="w-4 h-4" />
                Launch Call Room
              </button>
            </div>

          </div>

          {/* ACTIVE CALL ROOMS LIST */}
          <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-150"
          } shadow-xs`}>
            <h3 className="font-bold text-xs border-b pb-3 border-slate-150 dark:border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Active Classmate Rooms Online ({liveRooms.filter(r => r.participants.length > 0).length})
              </span>
              <span className="text-[9px] font-bold text-slate-400">Auto-Refreshes</span>
            </h3>

            {liveRooms.filter(r => r.participants.length > 0).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-500/30 mb-3" />
                <p className="font-bold text-xs text-slate-500">No call rooms currently active.</p>
                <p className="text-[11px] text-slate-400 mt-1">Start a Call Room above and invite classmates to study with you!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {liveRooms.filter(r => r.participants.length > 0).map(room => (
                  <div
                    key={room.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-850 hover:border-slate-750" 
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md tracking-wider font-mono uppercase">
                          Code: {room.code}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {room.participants.length} online
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 dark:text-slate-100 mt-2 truncate">
                        {room.title}
                      </h4>

                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        Host: {room.createdByName}
                      </p>

                      <div className="mt-3 py-1.5 px-2.5 rounded-lg bg-indigo-500/5 text-[9px] text-indigo-300 border border-indigo-500/5 flex items-center gap-1.5">
                        <Tv className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">Watching: <b>{room.streamTitle || "Interactive Board"}</b></span>
                      </div>

                      {/* Participant avatars */}
                      <div className="flex items-center gap-1 mt-3 flex-wrap">
                        {room.participants.map(p => (
                          <div 
                            key={p.username} 
                            className="w-5 h-5 rounded-md bg-slate-800 text-[8px] flex items-center justify-center font-bold text-slate-200 border border-slate-700 uppercase"
                            title={`${p.fullName} (${p.username})`}
                          >
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full rounded-md object-cover" />
                            ) : (
                              p.fullName.substring(0, 2)
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/5 flex items-center gap-2">
                      <button
                        onClick={() => handleJoinCallRoom(room.code)}
                        className="flex-1 text-[10px] font-bold py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Join Call Room
                      </button>
                      <button
                        onClick={() => handleCopyCode(room.code)}
                        className={`p-2 rounded-lg border transition-colors ${
                          theme === "dark" ? "border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                        title="Copy Room Code"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SPECIAL PAGE: ACTIVE VOICE & VIDEO CALL STUDY ROOM */
        <div className="space-y-4 animate-scaleUp">
          
          {/* HEADER BAR FOR ACTIVE ROOM */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-950 border border-indigo-950/40 text-white shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-600 rounded-xl animate-pulse text-white shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold tracking-tight">{activeRoom?.title}</h3>
                  <span className="text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                    CODE: {activeRoom?.code}
                    <button 
                      onClick={() => activeRoom && handleCopyCode(activeRoom.code)} 
                      className="hover:text-white transition-colors"
                      title="Copy Code"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Live study call connected. Share the room code for classmates to enter.
                </p>
              </div>
            </div>

            <button
              onClick={handleLeaveCallRoom}
              className="text-xs font-bold px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              Leave Call Room
            </button>
          </div>

          {/* ACTIVE CALL WORKSPACE SPLIT LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT PANEL: SHARED SCREEN / LECTURE / WIDGET */}
            <div className="lg:col-span-7 flex flex-col space-y-3.5">
              
              {/* CURRENT ACTIVE STUDIED IFRAME */}
              <div className="relative w-full aspect-video bg-black rounded-3xl border border-indigo-950/30 overflow-hidden shadow-lg group">
                {activeRoom?.streamId ? (
                  <>
                    {activeRoom.streamType === "youtube" ? (
                      <iframe
                        src={`${getYoutubeEmbedUrl(activeRoom.streamValue || "")}?autoplay=1&mute=0`}
                        title={activeRoom.streamTitle}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : activeRoom.streamType === "html_snippet" ? (
                      <iframe
                        srcDoc={getSafeHtmlSnippet(activeRoom.streamValue || "")}
                        title={activeRoom.streamTitle}
                        className="w-full h-full border-0 bg-slate-950"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <iframe
                        src={activeRoom.streamValue}
                        title={activeRoom.streamTitle}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 bg-slate-950">
                    <Tv className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
                    <p className="font-bold text-sm">No lecture has been synchronized yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Select a video or study tool from the dropdown below to show everyone!</p>
                  </div>
                )}

                {/* OVERLAYS */}
                <div className="absolute top-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-bold text-indigo-400 uppercase border border-indigo-950/20">
                  🎥 Active Lecture Broadcast
                </div>
              </div>

              {/* CO-SYNC TOPIC CONTROLLER PANEL */}
              <div className={`p-4 rounded-2xl border transition-colors ${
                theme === "dark" ? "bg-slate-950 border-slate-850 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
              }`}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Synchronized Topic Controller
                </label>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={activeRoom?.streamId || ""}
                    onChange={(e) => handleRoomChangeStream(e.target.value)}
                    className={`flex-1 text-xs p-2.5 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                      theme === "dark" 
                        ? "bg-slate-900 border-slate-800 text-slate-100" 
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="" disabled>-- Select Stream / Custom Tool --</option>
                    {streams.map(stream => (
                      <option key={stream.id} value={stream.id}>
                        {stream.type === "youtube" ? "🎥 " : stream.type === "html_snippet" ? "🛠️ " : "📖 "}
                        {stream.title}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New widget
                  </button>
                </div>
                <p className="text-[10px] text-indigo-400/90 mt-1.5 font-medium leading-relaxed">
                  💡 Switching streams here automatically updates the board for <b>all classmates</b> currently inside this live study room!
                </p>
              </div>

              {/* QUICK ROOM SCRATCHPAD NOTES */}
              <div className={`p-4 rounded-2xl border transition-colors ${
                theme === "dark" ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personal Live Notes</span>
                  <span className="text-[9px] text-slate-400">Jot thoughts down as you speak</span>
                </div>
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Record group formulas, important dates, or math solutions here..."
                  className={`w-full h-24 text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                    theme === "dark" 
                      ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-indigo-500" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                  }`}
                />
              </div>

            </div>

            {/* RIGHT PANEL: CALL MEDIA GRID & PERSISTENT CHAT */}
            <div className={`lg:col-span-5 rounded-3xl border flex flex-col h-[580px] overflow-hidden ${
              theme === "dark" ? "bg-slate-950 border-slate-850 text-white" : "bg-white border-slate-150 text-slate-800"
            } shadow-xl`}>
              
              {/* TAB SWITCHER */}
              <div className="flex border-b border-slate-100 dark:border-slate-850 bg-slate-900/10">
                <button
                  onClick={() => setRoomSidebarTab("call")}
                  className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                    roomSidebarTab === "call"
                      ? "border-indigo-600 text-indigo-400 bg-slate-950/20"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Live Call Grid ({activeRoom?.participants.length || 0})
                </button>

                <button
                  onClick={() => setRoomSidebarTab("chat")}
                  className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                    roomSidebarTab === "chat"
                      ? "border-indigo-600 text-indigo-400 bg-slate-950/20"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Room Chat
                  {activeRoom?.messages && activeRoom.messages.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[8px] bg-indigo-600 text-white font-bold">
                      {activeRoom.messages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB CONTENT: CALL GRID */}
              {roomSidebarTab === "call" ? (
                <div className="flex-1 flex flex-col justify-between p-4 space-y-4">
                  
                  {/* MEDIA ERROR OR CAMERA BLOCKED WARNING */}
                  {mediaError && (
                    <div className="p-2.5 text-[9px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-start gap-2 leading-normal">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{mediaError}</span>
                    </div>
                  )}

                  {/* WEBCAM GRID */}
                  <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto max-h-[380px] pr-1">
                    
                    {/* Render active participants */}
                    {activeRoom?.participants.map(participant => {
                      const isMe = participant.username === currentUser?.username;
                      const hasActiveVideo = isMe ? (localStream && !isCameraOff) : !participant.isCameraOff;
                      
                      return (
                        <div
                          key={participant.username}
                          className={`relative aspect-video rounded-2xl border overflow-hidden flex flex-col items-center justify-center bg-slate-950 ${
                            isMe ? "border-indigo-500 ring-1 ring-indigo-500/20" : "border-slate-850"
                          }`}
                        >
                          {/* Real Video playback for local current user */}
                          {isMe && hasActiveVideo ? (
                            <video
                              ref={localVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="absolute inset-0 w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            /* Simulated webcam overlay / Avatar for others or if camera off */
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center p-3">
                              {/* Glowing voice ripple indicator */}
                              {!participant.isMuted && (
                                <div className="absolute w-12 h-12 bg-indigo-500/15 rounded-full animate-ping" />
                              )}
                              
                              <div className={`w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center uppercase shadow-lg border-2 ${
                                !participant.isMuted ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-800"
                              } ${
                                isMe ? "bg-indigo-600 text-white" : "bg-slate-850 text-slate-300"
                              }`}>
                                {participant.avatarUrl ? (
                                  <img src={participant.avatarUrl} alt={participant.fullName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  participant.fullName.substring(0, 2)
                                )}
                              </div>
                              
                              {/* Audio level pulsing wave mock */}
                              {!participant.isMuted && (
                                <div className="flex items-center gap-1.5 mt-2.5">
                                  <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                  <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                  <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                                  <span className="text-[7px] text-emerald-400 uppercase font-extrabold tracking-wider animate-pulse">Speaking</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* OVERLAYS */}
                          <div className="absolute bottom-2 left-2 z-10 bg-black/75 px-2 py-0.5 rounded-lg text-[8px] font-bold text-white tracking-wide flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isMe ? "bg-indigo-400" : "bg-slate-400"}`} />
                            {participant.fullName} {isMe && "(You)"}
                          </div>

                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                            {participant.isMuted && (
                              <div className="p-1 bg-red-600/90 rounded-md text-white border border-red-500/25 shadow-sm" title="Muted">
                                <MicOff className="w-2.5 h-2.5" />
                              </div>
                            )}
                            {participant.isCameraOff && (
                              <div className="p-1 bg-red-600/90 rounded-md text-white border border-red-500/25 shadow-sm" title="Video Off">
                                <VideoOff className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CONTROLS AREA */}
                  <div className="p-3 bg-slate-900/40 rounded-2xl border border-slate-850/60 flex items-center justify-around">
                    
                    {/* Microphone Toggle */}
                    <button
                      onClick={handleToggleMute}
                      className={`p-3.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isMuted 
                          ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/10" 
                          : "bg-slate-800 hover:bg-slate-700 text-emerald-400"
                      }`}
                      title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span className="text-[8px] font-bold uppercase">{isMuted ? "Muted" : "Unmute"}</span>
                    </button>

                    {/* Camera Toggle */}
                    <button
                      onClick={handleToggleCamera}
                      className={`p-3.5 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isCameraOff 
                          ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/10" 
                          : "bg-slate-800 hover:bg-slate-700 text-indigo-400"
                      }`}
                      title={isCameraOff ? "Turn Video On" : "Turn Video Off"}
                    >
                      {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      <span className="text-[8px] font-bold uppercase">{isCameraOff ? "Video Off" : "Video"}</span>
                    </button>

                  </div>

                </div>
              ) : (
                /* TAB CONTENT: ROOM CHAT */
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  
                  {/* MESSAGE HISTORY */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px] pr-1">
                    {(!activeRoom?.messages || activeRoom.messages.length === 0) ? (
                      <div className="text-center py-12 text-slate-500">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                        <p className="font-bold text-xs">No study notes shared yet.</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Type below to sync real-time comments with call members!</p>
                      </div>
                    ) : (
                      activeRoom.messages.map(msg => {
                        const isSystem = msg.sender === "system";
                        const isMe = msg.sender === currentUser?.username;
                        
                        if (isSystem) {
                          return (
                            <div key={msg.id} className="text-center">
                              <span className="inline-block text-[9px] px-3 py-1 bg-indigo-500/10 text-indigo-400/90 font-bold rounded-lg border border-indigo-950/20 max-w-xs leading-normal">
                                📢 {msg.text}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={msg.id} 
                            className={`flex items-start gap-2 max-w-[85%] ${
                              isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                            }`}
                          >
                            <div className="w-6 h-6 rounded-md bg-slate-800 text-[9px] font-bold flex items-center justify-center uppercase shrink-0">
                              {msg.senderAvatar ? (
                                <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full rounded-md object-cover" />
                              ) : (
                                msg.senderName.substring(0, 2)
                              )}
                            </div>
                            
                            <div className="space-y-0.5">
                              <div className={`text-[8px] font-bold text-slate-400 ${isMe ? "text-right" : ""}`}>
                                {msg.senderName} • {msg.timestamp}
                              </div>
                              <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                                isMe 
                                  ? "bg-indigo-600 text-white rounded-tr-none" 
                                  : "bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none"
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* INPUT FORM */}
                  <form onSubmit={handleSendRoomChatMessage} className="p-3 border-t border-slate-100 dark:border-slate-850 flex items-center gap-2 bg-slate-900/10">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Comment on formula or text..."
                      className={`flex-1 text-xs p-2.5 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                        theme === "dark" 
                          ? "bg-slate-950 border-slate-850 text-slate-100 placeholder-slate-600 focus:border-indigo-500" 
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* POPUP MODAL: MANUAL ADD SHARED STREAM / IFRAME */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                  <Tv className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm tracking-tight">Share New Lecture or Iframe Embed</h3>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStreamSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Stream or Widget Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. MIT Calculus - Lecture 1, or Scientific Calculator widget"
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category Tag
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-800 text-slate-100" 
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="Lectures">🎥 Lectures</option>
                    <option value="Reference">📖 Reference</option>
                    <option value="Study Tools">🛠️ Study Tools</option>
                    <option value="Other">📎 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Embed Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-800 text-slate-100" 
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <option value="youtube">YouTube Video</option>
                    <option value="iframe">External Website Iframe</option>
                    <option value="html_snippet">Custom HTML/JS Snippet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {newType === "youtube" ? "YouTube Video URL or ID" : newType === "iframe" ? "HTTPS Website URL" : "Raw HTML Code / Widget Snippet"}
                </label>
                
                {newType === "html_snippet" ? (
                  <textarea
                    required
                    rows={6}
                    value={newContentValue}
                    onChange={(e) => setNewContentValue(e.target.value)}
                    placeholder="<!DOCTYPE html><html><body>... (Injected with Tailwind)"
                    className={`w-full text-xs p-3 font-mono rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-700" 
                        : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={newContentValue}
                    onChange={(e) => setNewContentValue(e.target.value)}
                    placeholder={newType === "youtube" ? "https://www.youtube.com/watch?v=..." : "e.g. en.wikipedia.org/wiki/Main_Page"}
                    className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                        : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                )}

                <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-normal">
                  {newType === "youtube" && "Accepts standard video links, short links, or exact 11-char IDs."}
                  {newType === "iframe" && "Some sites block framing via headers. Check if standard HTTPS references render."}
                  {newType === "html_snippet" && "Enables dynamic, responsive widgets styled with Tailwind CSS, sandboxed safely."}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Share Widget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: GEMINI AI GENERATOR */}
      {isGeminiOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/20 to-indigo-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">AI Study Snippet Generator</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Powered by Gemini 3.5 Flash</p>
                </div>
              </div>
              <button 
                onClick={() => !isGeneratingSnippet && setIsGeminiOpen(false)}
                disabled={isGeneratingSnippet}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateSnippet} className="p-6 space-y-4">
              {geminiError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl">
                  ⚠️ {geminiError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Describe what kind of tool you want to build:
                </label>
                <textarea
                  required
                  rows={4}
                  disabled={isGeneratingSnippet}
                  value={geminiPrompt}
                  onChange={(e) => setGeminiPrompt(e.target.value)}
                  placeholder="e.g. Periodic table chemistry puzzle, fraction visualizer with circle slices, history timeline of ancient Rome, SAT Vocabulary Flashcards..."
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              {!isGeneratingSnippet && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    💡 High-Powered Preset Ideas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "🧪 Chem Elements Guide", prompt: "An interactive Periodic Table with detail cards for Hydrogen, Helium, Lithium, Carbon, Oxygen, and interactive elemental grouping games" },
                      { label: "📐 Trigonometry Unit Circle", prompt: "Interactive trigonometry unit circle showing sine/cosine wave heights dynamically as a slider rotates a vector" },
                      { label: "📊 Statistics Histograms", prompt: "A customized student grade histogram maker where you input 5 scores and it graphs them live on canvas" },
                      { label: "🕰️ Rome History Timeline", prompt: "Interactive sliding timeline of key events in ancient Roman history, with quiz cards" },
                      { label: "🎴 Spanish Flashcards Game", prompt: "Gamified Spanish-English conversational vocabulary matching cards deck with audio simulation and correct answers check" }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGeminiPrompt(preset.prompt)}
                        className={`text-[9px] font-medium px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          theme === "dark" 
                            ? "bg-slate-950/50 border-slate-800 hover:bg-slate-850 text-slate-300" 
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isGeneratingSnippet && (
                <div className="py-6 flex flex-col items-center justify-center space-y-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-purple-400 absolute top-3.5 left-3.5 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-indigo-400">Gemini is engineering your tool...</p>
                    <p className="text-[10px] text-slate-400 italic">"Injecting Tailwind CSS, styling elements, and embedding state management..."</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isGeneratingSnippet}
                  onClick={() => setIsGeminiOpen(false)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingSnippet || !geminiPrompt.trim()}
                  className="text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingSnippet ? "Generating..." : "Generate & Deploy Widget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: LAUNCH NEW STUDY ROOM */}
      {isCreateRoomOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-800"
          }`}>
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm tracking-tight">Launch Live Call Study Room</h3>
              </div>
              <button 
                onClick={() => setIsCreateRoomOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="p-6 space-y-4">
              {roomCreateError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl">
                  {roomCreateError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Study Room Title
                </label>
                <input
                  type="text"
                  required
                  value={roomTitleInput}
                  onChange={(e) => setRoomTitleInput(e.target.value)}
                  placeholder="e.g. Calculus Midterm Study Block, Chemistry Lab Group"
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Custom Room Code (Optional)
                </label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="e.g. MATH-402 (leave blank to auto-generate)"
                  className={`w-full text-xs p-3 font-mono rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 uppercase ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Study Topic / Lecture Stream
                </label>
                <select
                  value={roomStreamId}
                  onChange={(e) => setRoomStreamId(e.target.value)}
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-100" 
                      : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="" disabled>-- Select Stream / Custom Widget --</option>
                  {streams.map(stream => (
                    <option key={stream.id} value={stream.id}>
                      {stream.type === "youtube" ? "🎥 " : stream.type === "html_snippet" ? "🛠️ " : "📖 "}
                      {stream.title}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                  You can change this topic live inside the room at any time, and it updates for all call members instantly.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateRoomOpen(false)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Launch Room & Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
