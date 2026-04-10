"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ChevronUp,
  MessageSquare,
  Filter,
  Send,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import StatusBadge, { CategoryBadge } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface Feedback {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  upvoteCount: number;
  authorName: string | null;
  createdAt: string;
  author: { id: string; name: string | null } | null;
  board: { name: string; slug: string } | null;
  _count: { comments: number; upvotes: number };
}

interface Comment {
  id: string;
  content: string;
  isOfficial: boolean;
  authorName: string | null;
  createdAt: string;
  author: { id: string; name: string | null } | null;
}

export default function PublicFeedbackPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("most_voted");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("feature");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [nameRequired, setNameRequired] = useState(true);
  const [emailRequired, setEmailRequired] = useState(true);

  // Restore saved user info from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("featureflow-user");
    if (saved) {
      try {
        const { name, email } = JSON.parse(saved);
        if (name) { setFormName(name); setCommentName(name); }
        if (email) { setFormEmail(email); setCommentEmail(email); }
      } catch { /* ignore */ }
    }
    // Fetch project config
    fetch(`/api/projects/${slug}/config`)
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setNameRequired(data.config.feedbackNameRequired ?? true);
          setEmailRequired(data.config.feedbackEmailRequired ?? true);
        }
      })
      .catch(() => { /* ignore */ });
  }, [slug]);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/projects/${slug}/feedback?${params}`);
    const data = await res.json();
    setFeedbacks(data.feedbacks || []);
    setLoading(false);
  }, [slug, sort, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const fetchComments = async (feedbackId: string) => {
    setLoadingComments(true);
    const res = await fetch(`/api/feedback/${feedbackId}/comments`);
    const data = await res.json();
    setComments(data.comments || []);
    setLoadingComments(false);
  };

  const selectFeedback = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    fetchComments(id);
  };

  const handleUpvote = async (feedbackId: string) => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/upvote`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((fb) =>
            fb.id === feedbackId ? { ...fb, upvoteCount: data.upvoteCount } : fb
          )
        );
        setUpvotedIds((prev) => {
          const next = new Set(prev);
          if (data.upvoted) next.add(feedbackId);
          else next.delete(feedbackId);
          return next;
        });
      }
    } catch {
      toast.error("Failed to upvote");
    }
  };

  const submitFeedback = async () => {
    if (!formTitle || !formDesc) {
      toast.error("Please fill in title and description");
      return;
    }
    if (nameRequired && !formName) {
      toast.error("Please enter your name");
      return;
    }
    if (emailRequired && !formEmail) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          category: formCategory,
          authorName: formName,
          authorEmail: formEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Feedback submitted! Thank you 🎉");
        // Save user info for future submissions
        localStorage.setItem("featureflow-user", JSON.stringify({ name: formName, email: formEmail }));
        setShowForm(false);
        setFormTitle("");
        setFormDesc("");
        fetchFeedbacks();

        // Auto sign-in the created customer account
        if (data.autoSignIn && data.customerEmail) {
          // Silently sign in - this sets the session cookie
          await signIn("credentials", {
            email: data.customerEmail,
            redirect: false,
          }).catch(() => { /* silent fail is ok */ });
        }
      } else {
        toast.error(data.error || "Failed to submit");
      }
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!newComment || !selectedId) {
      toast.error("Please enter a comment");
      return;
    }
    if (nameRequired && !commentName) {
      toast.error("Please enter your name");
      return;
    }
    if (emailRequired && !commentEmail) {
      toast.error("Please enter your email");
      return;
    }
    try {
      const res = await fetch(`/api/feedback/${selectedId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          authorName: commentName,
          authorEmail: commentEmail,
        }),
      });
      if (res.ok) {
        // Save user info for future use
        localStorage.setItem("featureflow-user", JSON.stringify({ name: commentName, email: commentEmail }));
        setNewComment("");
        fetchComments(selectedId);
        toast.success("Comment posted!");
      }
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const selectedFeedback = feedbacks.find((fb) => fb.id === selectedId);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Feedback Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Share your ideas and vote on features you want to see
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Submit Feedback
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="most_voted">Most Voted</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All types</option>
          <option value="feature">Feature</option>
          <option value="bug">Bug</option>
          <option value="improvement">Improvement</option>
          <option value="question">Question</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="p-16 rounded-2xl border border-dashed border-border bg-surface text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Be the first to share an idea or report a bug!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Submit Feedback
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr,360px] gap-6">
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                onClick={() => selectFeedback(fb.id)}
                className={`
                  flex items-start gap-4 p-4 rounded-xl border cursor-pointer
                  transition-all duration-200
                  ${
                    selectedId === fb.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-surface hover:border-primary/30"
                  }
                `}
              >
                {/* Upvote */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpvote(fb.id);
                  }}
                  className={`
                    flex flex-col items-center px-2 py-1.5 rounded-xl min-w-[48px]
                    transition-all duration-200
                    ${
                      upvotedIds.has(fb.id)
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "bg-muted hover:bg-primary-light hover:text-primary-dark"
                    }
                  `}
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-sm font-bold">{fb.upvoteCount}</span>
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold mb-1">{fb.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {fb.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={fb.status} size="sm" />
                    <CategoryBadge category={fb.category} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      by {fb.author?.name || fb.authorName || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}
                    </span>
                    {fb._count.comments > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {fb._count.comments}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail / Comments */}
          {selectedFeedback && (
            <div className="sticky top-24 self-start space-y-4 animate-slide-down">
              <div className="p-5 rounded-2xl border border-border bg-surface">
                <h3 className="font-bold mb-2">{selectedFeedback.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={selectedFeedback.status} />
                  <CategoryBadge category={selectedFeedback.category} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedFeedback.description}
                </p>
              </div>

              {/* Comments */}
              <div className="p-5 rounded-2xl border border-border bg-surface">
                <h4 className="font-semibold text-sm mb-4">
                  Comments ({comments.length})
                </h4>
                {loadingComments ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />
                ) : (
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl text-sm ${
                          c.isOfficial
                            ? "bg-primary/5 border border-primary/20"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">
                            {c.author?.name || c.authorName || "Anonymous"}
                          </span>
                          {c.isOfficial && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold">
                              TEAM
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{c.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No comments yet
                      </p>
                    )}
                  </div>
                )}

                {/* Add comment - with optional name and email */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {(nameRequired || commentName) && (
                    <input
                      type="text"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      placeholder={nameRequired ? "Your name *" : "Your name"}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    )}
                    {(emailRequired || commentEmail) && (
                    <input
                      type="email"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      placeholder={emailRequired ? "Your email *" : "Your email"}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={submitComment}
                      disabled={!newComment || (nameRequired && !commentName) || (emailRequired && !commentEmail)}
                      className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit feedback modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-bold">Submit Feedback</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(nameRequired || formName) && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your name {nameRequired && <span className="text-danger">*</span>}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                )}
                {(emailRequired || formEmail) && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email {emailRequired && <span className="text-danger">*</span>}</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Title <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Add dark mode support"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="improvement">Improvement</option>
                  <option value="question">Question</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description <span className="text-danger">*</span></label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe your idea or issue in detail..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                An account will be created automatically so you can track your feedback.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={submitting || !formTitle || !formDesc || (nameRequired && !formName) || (emailRequired && !formEmail)}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
