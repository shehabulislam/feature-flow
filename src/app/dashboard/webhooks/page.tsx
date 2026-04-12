"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Webhook,
  Plus,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  ChevronDown,
  AlertCircle,
  Send,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import toast from "react-hot-toast";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: string | null;
  enabled: boolean;
  content: string | null;
  eventType: string;
  createdAt: string;
}

interface Project {
  id: string;
  slug: string;
  name: string;
}

const EVENT_TYPES = [
  { value: "feedback.created", label: "Feedback Created" },
  { value: "feedback.updated", label: "Feedback Updated" },
  { value: "comment.created", label: "Comment Created" },
  { value: "upvote.created", label: "Upvote Created" },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH"];

const EMPTY_FORM = {
  name: "",
  url: "",
  method: "POST",
  headers: "",
  enabled: true,
  content: "",
  eventType: "feedback.created",
};

export default function WebhooksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        const projs = data.projects || [];
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedSlug(projs[0].slug);
        }
        setLoading(false);
      });
  }, []);

  // Load webhooks when project changes
  const fetchWebhooks = useCallback(async () => {
    if (!selectedSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${selectedSlug}/webhooks`);
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch {
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [selectedSlug]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (wh: WebhookItem) => {
    setEditingId(wh.id);
    setForm({
      name: wh.name,
      url: wh.url,
      method: wh.method,
      headers: wh.headers || "",
      enabled: wh.enabled,
      content: wh.content || "",
      eventType: wh.eventType,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.url) {
      toast.error("Name and URL are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/projects/${selectedSlug}/webhooks/${editingId}`
        : `/api/projects/${selectedSlug}/webhooks`;

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          method: form.method,
          headers: form.headers || null,
          enabled: form.enabled,
          content: form.content || null,
          eventType: form.eventType,
        }),
      });

      if (res.ok) {
        toast.success(editingId ? "Webhook updated!" : "Webhook created!");
        setShowForm(false);
        fetchWebhooks();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save webhook");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      const res = await fetch(
        `/api/projects/${selectedSlug}/webhooks/${id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Webhook deleted");
        fetchWebhooks();
      }
    } catch {
      toast.error("Failed to delete webhook");
    }
  };

  const toggleEnabled = async (wh: WebhookItem) => {
    try {
      const res = await fetch(
        `/api/projects/${selectedSlug}/webhooks/${wh.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !wh.enabled }),
        }
      );
      if (res.ok) {
        toast.success(wh.enabled ? "Webhook disabled" : "Webhook enabled");
        fetchWebhooks();
      }
    } catch {
      toast.error("Failed to toggle webhook");
    }
  };

  const testWebhook = async (wh: WebhookItem) => {
    setTestingId(wh.id);
    try {
      const testPayload = {
        id: "test_" + Date.now(),
        title: "Test Feedback",
        description: "This is a test webhook delivery from FeatureFlow.",
        status: "open",
        category: "feature",
        authorName: "FeatureFlow Bot",
        authorEmail: "test@featureflow.dev",
        projectSlug: selectedSlug,
        projectName: projects.find((p) => p.slug === selectedSlug)?.name || "",
        createdAt: new Date().toISOString(),
      };

      let customHeaders: Record<string, string> = {};
      if (wh.headers) {
        try {
          customHeaders = JSON.parse(wh.headers);
        } catch {
          // ignore
        }
      }

      let body: string;
      if (wh.content) {
        body = wh.content.replace(
          /\{\{(\w+(?:\.\w+)*)\}\}/g,
          (_m: string, key: string) => {
            return (testPayload as Record<string, unknown>)[key] !== undefined
              ? String((testPayload as Record<string, unknown>)[key])
              : "";
          }
        );
      } else {
        body = JSON.stringify({
          event: wh.eventType,
          data: testPayload,
          timestamp: new Date().toISOString(),
        });
      }

      const fetchOptions: RequestInit = {
        method: wh.method,
        headers: {
          "Content-Type": "application/json",
          ...customHeaders,
        },
      };
      if (wh.method !== "GET") {
        fetchOptions.body = body;
      }

      await fetch(wh.url, fetchOptions);
      toast.success("Test payload sent!");
    } catch {
      toast.error("Test delivery failed — check the URL and CORS settings");
    } finally {
      setTestingId(null);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">No projects yet</h1>
        <p className="text-muted-foreground">
          Create a project first to manage webhooks.
        </p>
      </div>
    );
  }

  const eventLabel = (t: string) =>
    EVENT_TYPES.find((e) => e.value === t)?.label || t;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="w-7 h-7 text-primary" />
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Send HTTP requests when events happen in your project
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface">
          <label className="text-sm font-medium">Select Project:</label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add webhook button */}
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-surface text-center">
          <Webhook className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create a webhook to get notified when events happen.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`p-5 rounded-2xl border bg-surface transition-all ${wh.enabled
                  ? "border-border hover:border-primary/30"
                  : "border-border/50 opacity-60"
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold truncate">{wh.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${wh.method === "POST"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : wh.method === "PUT"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : wh.method === "PATCH"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                    >
                      {wh.method}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                      {eventLabel(wh.eventType)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {wh.url}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Test */}
                  <button
                    onClick={() => testWebhook(wh)}
                    disabled={testingId === wh.id}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Send test"
                  >
                    {testingId === wh.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleEnabled(wh)}
                    className={`p-2 rounded-lg hover:bg-muted transition-colors ${wh.enabled ? "text-success" : "text-muted-foreground"
                      }`}
                    title={wh.enabled ? "Disable" : "Enable"}
                  >
                    {wh.enabled ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(wh)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="p-2 rounded-lg hover:bg-danger/10 transition-colors text-muted-foreground hover:text-danger"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Create / Edit Modal ═══ */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Webhook" : "New Webhook"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Slack Notification"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  URL <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) =>
                    setForm({ ...form, url: e.target.value })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Method + Event Type in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Method
                  </label>
                  <div className="relative">
                    <select
                      value={form.method}
                      onChange={(e) =>
                        setForm({ ...form, method: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {HTTP_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Event Type
                  </label>
                  <div className="relative">
                    <select
                      value={form.eventType}
                      onChange={(e) =>
                        setForm({ ...form, eventType: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {EVENT_TYPES.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Headers */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Headers{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (JSON object)
                  </span>
                </label>
                <textarea
                  value={form.headers}
                  onChange={(e) =>
                    setForm({ ...form, headers: e.target.value })
                  }
                  placeholder={'{\n  "Authorization": "Bearer YOUR_TOKEN"\n}'}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </div>

              {/* Content / Body template */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Body Content{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional — leave blank for default JSON payload)
                  </span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  placeholder={
                    '{"text": "New feedback: {{title}} by {{authorName}}"}'
                  }
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
                <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">
                        Available template variables:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "{{id}}",
                          "{{title}}",
                          "{{description}}",
                          "{{status}}",
                          "{{category}}",
                          "{{authorName}}",
                          "{{authorEmail}}",
                          "{{projectSlug}}",
                          "{{projectName}}",
                          "{{createdAt}}",
                        ].map((v) => (
                          <code
                            key={v}
                            className="px-1.5 py-0.5 rounded bg-muted text-foreground/70"
                          >
                            {v}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm font-medium">Enabled</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, enabled: !form.enabled })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.enabled ? "bg-primary" : "bg-border"
                    }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${form.enabled ? "left-0.5" : "left-0.5"
                      }`}
                    style={{
                      transform: form.enabled
                        ? "translateX(22px)"
                        : "translateX(2px)",
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
