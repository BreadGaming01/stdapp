import React, { useState, useEffect } from "react";
import { PublicResourceItem, getSafeHtmlSnippet } from "../types";
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  PlusCircle, 
  Megaphone, 
  BookOpen, 
  Code, 
  Heart, 
  Share2, 
  Send, 
  Layers, 
  Eye, 
  FileText, 
  Search,
  Globe,
  Radio
} from "lucide-react";

interface PublicResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  theme?: "light" | "dark";
}

export default function PublicResourcesModal({
  isOpen,
  onClose,
  currentUser,
  theme = "dark"
}: PublicResourcesModalProps) {
  const [resources, setResources] = useState<PublicResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "post">("browse");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Post form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<any>("Announcement");
  const [newDescription, setNewDescription] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [newButtonUrl, setNewButtonUrl] = useState("");
  const [newHtmlSnippet, setNewHtmlSnippet] = useState("");
  const [newAuthorName, setNewAuthorName] = useState(currentUser?.fullName || "Class 10 Scholar");
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPublicResources();
    }
  }, [isOpen]);

  const fetchPublicResources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/public-resources");
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
      }
    } catch (e) {
      console.error("Failed to load public resources:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      alert("Please provide both a Title and Description for your public post.");
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const payload = {
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim(),
        url: newUrl.trim() || undefined,
        actionButtonLabel: newButtonLabel.trim() || undefined,
        actionButtonUrl: newButtonUrl.trim() || undefined,
        htmlSnippet: newHtmlSnippet.trim() || undefined,
        authorName: newAuthorName.trim() || "Class 10 Scholar",
        tags: ["Class 10", "CBSE", newCategory]
      };

      const res = await fetch("/api/public-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || [data.resource, ...resources]);
        setSubmitSuccess(true);
        // Clear form
        setNewTitle("");
        setNewDescription("");
        setNewUrl("");
        setNewButtonLabel("");
        setNewButtonUrl("");
        setNewHtmlSnippet("");
        setShowHtmlPreview(false);
        setTimeout(() => {
          setActiveTab("browse");
          setSubmitSuccess(false);
        }, 1500);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to publish public post.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error publishing post: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    "all",
    "CBSE Official",
    "Maths Formulas",
    "Science Notes",
    "SST Mindmaps",
    "Interactive Widget",
    "Announcement",
    "Study Tool"
  ];

  const filteredResources = resources.filter(item => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchAuthor = item.authorName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn" id="public_resources_modal">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  Public Study Resources &amp; Community Blog
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Direct Guest Access (No Login Required)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse verified CBSE links, formula handbooks, interactive HTML widgets, or post your own announcements freely.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold shrink-0 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab("browse")}
            className={`pb-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === "browse"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse Resources &amp; Blog ({resources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("post")}
            className={`pb-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === "post"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ Free Public Post / Share Link &amp; Snippet</span>
          </button>
        </div>

        {/* CONTENT VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {activeTab === "browse" ? (
            <div className="flex flex-col gap-5">
              {/* FILTER & SEARCH */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resources, formulas, sample papers, or contributors..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap transition ${
                        selectedCategory === cat
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {cat === "all" ? "All" : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIST OF RESOURCES */}
              {isLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Loading latest verified resources &amp; announcements from MongoDB...
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No resources found in this category</p>
                  <p className="text-[11px] text-slate-500 mt-1">Be the first to share one using the "Free Public Post" tab!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredResources.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-xs hover:border-indigo-400/50 transition-all flex flex-col gap-3"
                    >
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.category === "CBSE Official"
                              ? "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20"
                              : item.category === "Maths Formulas"
                              ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
                              : item.category === "Science Notes"
                              ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20"
                              : item.category === "Interactive Widget"
                              ? "bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20"
                              : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {item.category}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            By <strong className="text-slate-600 dark:text-slate-300">{item.authorName}</strong>
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Optional HTML Snippet Renderer */}
                      {item.htmlSnippet && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                          <div className="px-3 py-1.5 bg-slate-900 text-[10px] font-mono text-slate-400 flex items-center justify-between border-b border-slate-800">
                            <span className="flex items-center gap-1.5">
                              <Code className="w-3 h-3 text-indigo-400" />
                              Interactive Component / HTML Snippet
                            </span>
                            <span className="text-emerald-400">Live Preview</span>
                          </div>
                          <div className="p-1">
                            <iframe
                              srcDoc={getSafeHtmlSnippet(item.htmlSnippet)}
                              title={item.title}
                              className="w-full min-h-[140px] max-h-[300px] border-none rounded-lg"
                              sandbox="allow-scripts allow-forms"
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Links & Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Visit Resource Link</span>
                          </a>
                        )}

                        {item.actionButtonLabel && (
                          <a
                            href={item.actionButtonUrl || item.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <span>{item.actionButtonLabel}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CREATE FREE PUBLIC POST FORM */
            <form onSubmit={handleSubmitPost} className="flex flex-col gap-4 max-w-2xl mx-auto py-2">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>
                  <strong>Anyone can post freely!</strong> Share valuable CBSE study notes, formula sheets, useful links, interactive HTML widgets, or announcements with the entire Class 10th community.
                </span>
              </div>

              {submitSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-fadeIn">
                  🎉 Post published successfully to MongoDB and community channel!
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Complete Chapter 8 Trigonometry Formulas & Proofs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category & Contributor Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CBSE Official">CBSE Official</option>
                    <option value="Maths Formulas">Maths Formulas</option>
                    <option value="Science Notes">Science Notes</option>
                    <option value="SST Mindmaps">SST Mindmaps</option>
                    <option value="Interactive Widget">Interactive Widget</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Study Tool">Study Tool</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name / Display Alias
                  </label>
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    placeholder="e.g., Aman (Class 10 Topper)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Study Advice / Content *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain what this resource contains, key tips, or highlights..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Optional Hyperlink & Action Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hyperlink URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com/notes.pdf"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={newButtonLabel}
                    onChange={(e) => setNewButtonLabel(e.target.value)}
                    placeholder="e.g., Download Notes PDF"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Optional HTML Snippet */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Custom HTML / Interactive Widget Snippet (Optional)
                  </label>
                  {newHtmlSnippet.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                      className="text-[11px] font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showHtmlPreview ? "Hide Preview" : "Live Preview"}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={newHtmlSnippet}
                  onChange={(e) => setNewHtmlSnippet(e.target.value)}
                  placeholder="<div class='p-4 bg-slate-900 text-white rounded-xl'>...</div>"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />

                {showHtmlPreview && newHtmlSnippet.trim() && (
                  <div className="mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block mb-1">Preview:</span>
                    <iframe
                      srcDoc={getSafeHtmlSnippet(newHtmlSnippet)}
                      title="Preview"
                      className="w-full min-h-[120px] max-h-[200px] border-none rounded"
                      sandbox="allow-scripts allow-forms"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Publishing to MongoDB...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publish to Public Community Channel</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
