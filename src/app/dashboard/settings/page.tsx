"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, Check, ExternalLink, Code2, Globe, Palette, Image as ImageIcon, Link as LinkIcon, Box, Code, MessageSquare, EyeOff, Settings2, Layers, Puzzle, FolderOpen, Plus } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { isSuperAdmin } from "@/lib/superadmin";
import Link from "next/link";

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  primaryColor: string;
  isPublic: boolean;
  logoUrl: string | null;
  customDomain: string | null;
  customCss: string | null;
  hideAppName: boolean;
  feedbackNameRequired: boolean;
  feedbackEmailRequired: boolean;
}

type PageType = "feedback" | "roadmap" | "changelog";
type TabType = "general" | "appearance" | "integrations" | "advanced";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#1d4ed8", "#4f46e5", "#7c3aed", "#0f172a",
];

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "advanced", label: "Advanced", icon: Code2 },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [copied, setCopied] = useState("");
  const [embedPage, setEmbedPage] = useState<PageType>("feedback");
  const [savingColor, setSavingColor] = useState(false);
  const [savingAdvanced, setSavingAdvanced] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [hideAppName, setHideAppName] = useState(false);
  const [feedbackNameRequired, setFeedbackNameRequired] = useState(true);
  const [feedbackEmailRequired, setFeedbackEmailRequired] = useState(true);
  const [customButtonText, setCustomButtonText] = useState("Feedback");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        const projs = data.projects || [];
        setProjects(projs);
        const saved = localStorage.getItem("featureflow-last-project");
        const proj = projs.find((p: Project) => p.slug === saved);
        if (proj) {
          applySelection(proj);
        } else if (projs.length > 0) {
          applySelection(projs[0]);
        }
        setLoading(false);
      });
  }, []);

  const applySelection = (proj: Project) => {
    setSelected(proj);
    setLogoUrl(proj.logoUrl || "");
    setCustomDomain(proj.customDomain || "");
    setCustomCss(proj.customCss || "");
    setHideAppName(proj.hideAppName || false);
    setFeedbackNameRequired(proj.feedbackNameRequired ?? true);
    setFeedbackEmailRequired(proj.feedbackEmailRequired ?? true);
  };

  const changeSelected = (slug: string) => {
    const proj = projects.find((p) => p.slug === slug);
    if (proj) {
      applySelection(proj);
      localStorage.setItem("featureflow-last-project", slug);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(""), 2000);
  };

  const updateColor = async (color: string) => {
    if (!selected) return;
    setSavingColor(true);
    try {
      const res = await fetch(`/api/projects/${selected.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor: color }),
      });
      if (res.ok) {
        setSelected({ ...selected, primaryColor: color });
        setProjects((prev) =>
          prev.map((p) => (p.slug === selected.slug ? { ...p, primaryColor: color } : p))
        );
        toast.success("Theme color updated!");
      }
    } catch {
      toast.error("Failed to update color");
    } finally {
      setSavingColor(false);
    }
  };

  const saveAdvancedSettings = async () => {
    if (!selected) return;
    setSavingAdvanced(true);
    try {
      const res = await fetch(`/api/projects/${selected.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: logoUrl || null,
          customDomain: customDomain || null,
          customCss: customCss || null,
          hideAppName,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelected(updated.project);
        setProjects((prev) =>
          prev.map((p) => (p.slug === selected.slug ? updated.project : p))
        );
        toast.success("Settings saved successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred. Try again.");
    } finally {
      setSavingAdvanced(false);
    }
  };

  const saveFeedbackSettings = async () => {
    if (!selected) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/projects/${selected.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackNameRequired, feedbackEmailRequired }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelected(updated.project);
        setProjects((prev) =>
          prev.map((p) => (p.slug === selected.slug ? updated.project : p))
        );
        toast.success("Feedback settings saved!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred. Try again.");
    } finally {
      setSavingFeedback(false);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <FolderOpen className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-3">No projects yet</h1>
        <p className="text-muted-foreground mb-6">
          Create your first project to configure settings.
        </p>
        <Link
          href="/dashboard/new-project"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </Link>
      </div>
    );
  }

  const publicPages = [
    { label: "Feedback Board", path: `/p/${selected.slug}/feedback`, description: "Collect and vote on ideas" },
    { label: "Roadmap", path: `/p/${selected.slug}/roadmap`, description: "Show your product plans" },
    { label: "Changelog", path: `/p/${selected.slug}/changelog`, description: "Share product updates" },
  ];

  const embedPageUrl = `${baseUrl}/p/${selected.slug}/${embedPage}`;
  const pageLabels: Record<PageType, string> = {
    feedback: "Feedback Board",
    roadmap: "Roadmap",
    changelog: "Changelog",
  };

  const isOwnerOrSuper = (session?.user as any)?.role === "owner" || isSuperAdmin(session?.user?.email);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your project and integration options</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface">
          <label htmlFor="projectSelect" className="text-sm font-medium shrink-0">Project:</label>
          <select
            id="projectSelect"
            value={selected.slug}
            onChange={(e) => changeSelected(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════ GENERAL TAB ═══════ */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Feedback Form Settings */}
          <div className="p-6 rounded-2xl border border-border bg-surface space-y-5">
            <div>
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Feedback Form Settings
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which fields are required when customers submit feedback.
              </p>
            </div>

            <label className="flex items-center justify-between p-4 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">Require name</p>
                <p className="text-xs text-muted-foreground">Customers must enter their name when submitting feedback</p>
              </div>
              <input
                type="checkbox"
                checked={feedbackNameRequired}
                onChange={(e) => setFeedbackNameRequired(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">Require email</p>
                <p className="text-xs text-muted-foreground">Customers must enter their email when submitting feedback</p>
              </div>
              <input
                type="checkbox"
                checked={feedbackEmailRequired}
                onChange={(e) => setFeedbackEmailRequired(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <div className="flex justify-end">
              <button
                onClick={saveFeedbackSettings}
                disabled={savingFeedback}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                {savingFeedback && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Feedback Settings
              </button>
            </div>
          </div>

          {/* Public Pages */}
          <div className="p-6 rounded-2xl border border-border bg-surface">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Public Pages
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              These pages are publicly accessible — no login required for visitors.
            </p>
            <div className="space-y-3">
              {publicPages.map((page) => (
                <div key={page.path} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{page.label}</p>
                    <p className="text-xs text-muted-foreground mb-0.5">{page.description}</p>
                    <p className="text-xs text-primary font-mono">{baseUrl}{page.path}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(`${baseUrl}${page.path}`, page.label)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Copy URL"
                    >
                      {copied === page.label ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <a
                      href={page.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ APPEARANCE TAB ═══════ */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          {/* Brand & Domain */}
          <div className="p-6 rounded-2xl border border-border bg-surface space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Box className="w-5 h-5 text-primary" />
                Brand & Domain
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your logo and connect a custom domain.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" /> Logo URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <label className="flex items-center justify-between p-4 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Hide app name</p>
                    <p className="text-xs text-muted-foreground">Show only the logo on public pages (top-left corner)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hideAppName}
                  onChange={(e) => setHideAppName(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>

              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-muted-foreground" /> Custom Domain
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="feedback.yourdomain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Point a CNAME record to <code className="bg-muted px-1 rounded">cname.vercel-dns.com</code>.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={saveAdvancedSettings}
                  disabled={savingAdvanced}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  {savingAdvanced && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Theme Color */}
          <div className="p-6 rounded-2xl border border-border bg-surface">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Palette className="w-5 h-5 text-pink-500" />
              Project Accent Color
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the accent color for your public pages.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl border-2 border-border shadow-inner"
                style={{ backgroundColor: selected.primaryColor }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Primary Color</p>
                <p className="text-xs text-muted-foreground font-mono">{selected.primaryColor}</p>
              </div>
              {savingColor && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </div>

            <div className="grid grid-cols-10 gap-2 mb-4">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                    selected.primaryColor === color
                      ? "border-foreground scale-110 shadow-lg"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Custom:</label>
              <input
                type="color"
                value={selected.primaryColor}
                onChange={(e) => updateColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={selected.primaryColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    updateColor(val);
                  }
                }}
                placeholder="#6366f1"
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ INTEGRATIONS TAB ═══════ */}
      {activeTab === "integrations" && (
        <div className="p-6 rounded-2xl border border-border bg-surface">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-secondary" />
            Embed on Your Website
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Multiple ways to add FeatureFlow to your own website.
          </p>

          {/* Page selector tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 mb-6 w-fit">
            {(["feedback", "roadmap", "changelog"] as PageType[]).map((page) => (
              <button
                key={page}
                onClick={() => setEmbedPage(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  embedPage === page
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pageLabels[page]}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {/* Method 1: Inline Embed (iframe) */}
            <div className="p-4 rounded-xl border border-border bg-background">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">1</div>
                <div>
                  <h3 className="text-sm font-semibold">Inline Embed (iframe)</h3>
                  <p className="text-xs text-muted-foreground">
                    Embed the {pageLabels[embedPage].toLowerCase()} directly into any page.
                  </p>
                </div>
              </div>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto">
{`<iframe
  src="${embedPageUrl}"
  style="width:100%;height:600px;border:none;border-radius:12px;"
  title="${pageLabels[embedPage]}"
></iframe>`}
                </pre>
                <button
                  onClick={() => copyToClipboard(`<iframe src="${embedPageUrl}" style="width:100%;height:600px;border:none;border-radius:12px;" title="${pageLabels[embedPage]}"></iframe>`, "iframe")}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-border hover:bg-muted transition-colors"
                >
                  {copied === "iframe" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Method 2: Popup Widget */}
            <div className="p-4 rounded-xl border border-border bg-background">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold shrink-0">2</div>
                <div>
                  <h3 className="text-sm font-semibold">Popup Widget (Floating Button)</h3>
                  <p className="text-xs text-muted-foreground">
                    Adds a floating button that opens the {pageLabels[embedPage].toLowerCase()} in a popup overlay when clicked.
                  </p>
                </div>
              </div>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto">
{`<script
  src="${baseUrl}/widget.js"
  data-project="${selected.slug}"
  data-page="${embedPage}"
  data-mode="popup"
  data-position="bottom-right"
  data-color="${selected.primaryColor}"
></script>`}
                </pre>
                <button
                  onClick={() => copyToClipboard(`<script src="${baseUrl}/widget.js" data-project="${selected.slug}" data-page="${embedPage}" data-mode="popup" data-position="bottom-right" data-color="${selected.primaryColor}"></script>`, "popup")}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-border hover:bg-muted transition-colors"
                >
                  {copied === "popup" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Method 3: Custom Button Trigger */}
            <div className="p-4 rounded-xl border border-border bg-background">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-sm font-bold shrink-0">3</div>
                <div>
                  <h3 className="text-sm font-semibold">Custom Button Trigger</h3>
                  <p className="text-xs text-muted-foreground">
                    Attach the popup to your own button instead of using the floating button.
                  </p>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Custom button text:</label>
                <input
                  type="text"
                  value={customButtonText}
                  onChange={(e) => setCustomButtonText(e.target.value)}
                  placeholder="Feedback"
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto">
{`<!-- Your custom button -->
<button id="my-feedback-btn">${customButtonText}</button>

<script
  src="${baseUrl}/widget.js"
  data-project="${selected.slug}"
  data-page="${embedPage}"
  data-mode="popup"
  data-trigger="#my-feedback-btn"
  data-color="${selected.primaryColor}"
></script>`}
                </pre>
                <button
                  onClick={() => copyToClipboard(`<button id="my-feedback-btn">${customButtonText}</button>\n<script src="${baseUrl}/widget.js" data-project="${selected.slug}" data-page="${embedPage}" data-mode="popup" data-trigger="#my-feedback-btn" data-color="${selected.primaryColor}"></script>`, "custom-btn")}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-border hover:bg-muted transition-colors"
                >
                  {copied === "custom-btn" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Method 4: Inline Widget */}
            <div className="p-4 rounded-xl border border-border bg-background">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-bold shrink-0">4</div>
                <div>
                  <h3 className="text-sm font-semibold">Inline Widget (Script tag)</h3>
                  <p className="text-xs text-muted-foreground">
                    Place this script inside any div on your site and it renders seamlessly inline.
                  </p>
                </div>
              </div>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto">
{`<div id="featureflow"></div>
<script
  src="${baseUrl}/widget.js"
  data-project="${selected.slug}"
  data-page="${embedPage}"
  data-mode="inline"
></script>`}
                </pre>
                <button
                  onClick={() => copyToClipboard(`<div id="featureflow"></div>\n<script src="${baseUrl}/widget.js" data-project="${selected.slug}" data-page="${embedPage}" data-mode="inline"></script>`, "inline")}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-border hover:bg-muted transition-colors"
                >
                  {copied === "inline" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Method 5: Direct Link */}
            <div className="p-4 rounded-xl border border-border bg-background">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm font-bold shrink-0">5</div>
                <div>
                  <h3 className="text-sm font-semibold">Direct Link / Reverse Proxy</h3>
                  <p className="text-xs text-muted-foreground">
                    Link directly from your nav, or proxy from your own domain (e.g., feedback.yourdomain.com).
                  </p>
                </div>
              </div>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto">
{`<!-- Simple link -->
<a href="${embedPageUrl}">${pageLabels[embedPage]}</a>

<!-- Nginx reverse proxy -->
location /${embedPage} {
  proxy_pass ${embedPageUrl};
  proxy_set_header Host $host;
}

<!-- Vercel rewrites (vercel.json) -->
{
  "rewrites": [{
    "source": "/${embedPage}/:path*",
    "destination": "${baseUrl}/p/${selected.slug}/${embedPage}/:path*"
  }]
}`}
                </pre>
                <button
                  onClick={() => copyToClipboard(embedPageUrl, "link")}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface border border-border hover:bg-muted transition-colors"
                >
                  {copied === "link" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ADVANCED TAB ═══════ */}
      {activeTab === "advanced" && (
        <div className="space-y-6">
          {isOwnerOrSuper ? (
            <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Code className="w-5 h-5 text-muted-foreground" />
                  Custom CSS
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Inject custom CSS to override styles on your public pages.
                </p>
              </div>
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder={":root { \n  --radius: 0px; \n}"}
                rows={8}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              />
              <div className="flex justify-end">
                <button
                  onClick={saveAdvancedSettings}
                  disabled={savingAdvanced}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  {savingAdvanced && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save CSS
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-border bg-surface text-center">
              <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">Owner access required</h3>
              <p className="text-sm text-muted-foreground">Advanced settings are only available to project owners.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
