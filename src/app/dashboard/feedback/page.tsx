"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Filter, ChevronUp, Loader2, Search, Download, EyeOff, Eye, Trash2 } from "lucide-react";
import StatusBadge, { CategoryBadge } from "@/components/StatusBadge";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface Feedback {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  upvoteCount: number;
  authorName: string | null;
  createdAt: string;
  isHidden?: boolean;
  author: { id: string; name: string | null; avatarUrl: string | null } | null;
  board: { name: string; slug: string } | null;
  _count: { comments: number; upvotes: number };
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function FeedbackPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProjects(data.projects || []);
        const saved = localStorage.getItem("featureflow-last-project");
        const proj = data.projects?.find((p: Project) => p.slug === saved);
        if (proj) {
          setSelectedProject(proj.slug);
        } else if (data.projects?.length > 0) {
          setSelectedProject(data.projects[0].slug);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem("featureflow-last-project", selectedProject);
    }
  }, [selectedProject]);

  const fetchFeedbacks = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (sort) params.set("sort", sort);

    const res = await fetch(`/api/projects/${selectedProject}/feedback?${params}`);
    const data = await res.json();
    setFeedbacks(data.feedbacks || []);
    setLoading(false);
  }, [selectedProject, statusFilter, categoryFilter, sort]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const updateFeedbackStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(`Status updated to ${status.replace("_", " ")}`);
        fetchFeedbacks();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback({ ...selectedFeedback, status });
        }
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const hideFeedback = async (id: string, currentHidden: boolean) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !currentHidden }),
      });
      if (res.ok) {
        toast.success(!currentHidden ? "Feedback hidden from public" : "Feedback visible again");
        fetchFeedbacks();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback({ ...selectedFeedback, isHidden: !currentHidden });
        }
      }
    } catch {
      toast.error("Failed to update feedback");
    }
  };

  const deleteFeedback = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Feedback deleted");
        fetchFeedbacks();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback(null);
        }
      } else {
        toast.error("Failed to delete feedback");
      }
    } catch {
      toast.error("Failed to delete feedback");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const filteredFeedbacks = feedbacks.filter(
    (fb) =>
      !search ||
      fb.title.toLowerCase().includes(search.toLowerCase()) ||
      fb.description.toLowerCase().includes(search.toLowerCase())
  );

  const exportToCsv = () => {
    if (!filteredFeedbacks.length) return;
    const headers = ["ID", "Title", "Description", "Status", "Category", "Upvotes", "Author", "Created At"];
    const rows = filteredFeedbacks.map(fb => [
      fb.id,
      `"${fb.title.replace(/"/g, '""')}"`,
      `"${fb.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      fb.status,
      fb.category,
      fb.upvoteCount,
      `"${(fb.author?.name || fb.authorName || "Anonymous").replace(/"/g, '""')}"`,
      fb.createdAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `feedback_export_${selectedProject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statuses = ["open", "under_review", "planned", "in_progress", "completed", "closed"];
  const categories = ["feature", "bug", "improvement", "question"];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-1">Manage feedback from your customers</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCsv}
            disabled={filteredFeedbacks.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          
          {projects.length > 1 && (
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_voted">Most voted</option>
        </select>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-surface text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
          <p className="text-muted-foreground text-sm">
            Share your public feedback page to start collecting input from customers.
          </p>
          {selectedProject && (
            <p className="text-sm text-primary mt-4 font-mono">
              /p/{selectedProject}/feedback
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredFeedbacks.map((fb) => (
            <div key={fb.id}>
              <button
                onClick={() => setSelectedFeedback(selectedFeedback?.id === fb.id ? null : fb)}
                className={`
                  w-full text-left flex items-start gap-4 p-4 border
                  transition-all duration-200
                  ${
                    selectedFeedback?.id === fb.id
                      ? "border-primary bg-primary/5 shadow-md rounded-t-xl rounded-b-none"
                      : "border-border bg-surface hover:border-primary/30 hover:bg-surface-hover rounded-xl"
                  }
                `}
              >
                <div className="flex flex-col items-center px-2 py-1.5 rounded-lg bg-muted min-w-[44px]">
                  <ChevronUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-bold">{fb.upvoteCount}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold mb-1 truncate">{fb.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {fb.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={fb.status} size="sm" />
                    <CategoryBadge category={fb.category} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}
                    </span>
                    {fb._count.comments > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {fb._count.comments}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Inline detail panel – appears directly below the clicked feedback */}
              {selectedFeedback?.id === fb.id && (
                <div className="p-6 rounded-b-xl border border-t-0 border-primary bg-surface animate-slide-down">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-2">{selectedFeedback.title}</h3>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={selectedFeedback.status} />
                        <CategoryBadge category={selectedFeedback.category} />
                        {selectedFeedback.isHidden && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" /> Hidden
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Moderate actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => hideFeedback(selectedFeedback.id, selectedFeedback.isHidden ?? false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedFeedback.isHidden
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={selectedFeedback.isHidden ? "Unhide feedback" : "Hide from public"}
                      >
                        {selectedFeedback.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {selectedFeedback.isHidden ? "Unhide" : "Hide"}
                      </button>
                      {confirmDelete === selectedFeedback.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-danger">Are you sure?</span>
                          <button
                            onClick={() => deleteFeedback(selectedFeedback.id)}
                            disabled={deletingId === selectedFeedback.id}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-danger text-white hover:bg-danger/90 transition-all flex items-center gap-1"
                          >
                            {deletingId === selectedFeedback.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(selectedFeedback.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-all"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {selectedFeedback.description}
                  </p>

                  <div className="text-xs text-muted-foreground mb-6">
                    <p>By: {selectedFeedback.author?.name || selectedFeedback.authorName || "Anonymous"}</p>
                    <p>{formatDistanceToNow(new Date(selectedFeedback.createdAt), { addSuffix: true })}</p>
                  </div>

                  {/* Status changer */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Update Status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {statuses.map((s) => (
                        <button
                          key={s}
                          onClick={() => updateFeedbackStatus(selectedFeedback.id, s)}
                          disabled={updatingStatus || selectedFeedback.status === s}
                          className={`
                            px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                            ${
                              selectedFeedback.status === s
                                ? "ring-2 ring-primary opacity-100"
                                : "opacity-60 hover:opacity-100"
                            }
                            status-${s}
                            disabled:cursor-not-allowed
                          `}
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
