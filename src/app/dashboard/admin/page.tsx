"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  FolderOpen,
  MessageSquare,
  BarChart3,
  Search,
  Loader2,
  ExternalLink,
  Shield,
  Crown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Mail,
  Calendar,
  Eye,
  Pencil,
  Check,
  X,
  Download,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";

type Tab = "overview" | "users" | "projects";

interface OverviewData {
  totalUsers: number;
  totalProjects: number;
  totalFeedback: number;
  totalComments: number;
  totalUpvotes: number;
  recentUsers: number;
  byRole: { owners: number; customers: number };
  byPlan: { free: number; pro: number; team: number };
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  createdAt: string;
  _count: {
    projects: number;
    feedbacks: number;
    comments: number;
    upvotes: number;
  };
}

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  isPublic: boolean;
  createdAt: string;
  owner: { id: string; name: string | null; email: string };
  _count: { feedbacks: number; roadmapItems: number; changelogs: number };
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
  projects: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    isPublic: boolean;
    createdAt: string;
    _count: { feedbacks: number; roadmapItems: number; changelogs: number };
  }[];
  feedbacks: {
    id: string;
    title: string;
    status: string;
    category: string;
    upvoteCount: number;
    createdAt: string;
    project: { name: string; slug: string };
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    feedback: { title: string };
  }[];
  entitlements: {
    fsLicenseId: string;
    fsPlanId: string;
    type: string;
    expiration: string | null;
    isCanceled: boolean;
    createdAt: string;
  }[];
  _count: {
    projects: number;
    feedbacks: number;
    comments: number;
    upvotes: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [editingField, setEditingField] = useState<"role" | "plan" | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (tab !== "overview") params.set("page", page.toString());

      const res = await fetch(`/api/admin?${params}`);
      if (res.status === 403) {
        router.push("/dashboard");
        toast.error("Access denied");
        return;
      }
      const data = await res.json();

      if (tab === "overview") setOverview(data.overview);
      if (tab === "users") {
        setUsers(data.users);
        setTotalPages(data.totalPages);
      }
      if (tab === "projects") {
        setProjects(data.projects);
        setTotalPages(data.totalPages);
      }
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [tab, search, dateFrom, dateTo, page, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openUserDetail = async (userId: string) => {
    setLoadingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data.user);
    } catch {
      toast.error("Failed to load user");
    } finally {
      setLoadingUser(false);
    }
  };

  const updateUser = async (userId: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        toast.success(`User ${field} updated to "${value}"`);
        // Refresh both user detail and list
        openUserDetail(userId);
        fetchData();
      }
    } catch {
      toast.error("Failed to update user");
    }
    setEditingField(null);
  };

  const planColors: Record<string, string> = {
    free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    team: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const roleColors: Record<string, string> = {
    owner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    customer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  const exportToCsv = () => {
    let dataToExport: any[] = [];
    let headers: string[] = [];
    let filename = "";

    if (tab === "users" && users.length > 0) {
      headers = ["ID", "Name", "Email", "Role", "Plan", "Projects", "Feedbacks", "Comments", "Joined"];
      dataToExport = users.map(u => [
        u.id, `"${(u.name || "").replace(/"/g, '""')}"`, u.email, u.role, u.plan,
        u._count.projects, u._count.feedbacks, u._count.comments, u.createdAt
      ]);
      filename = "featureflow_users.csv";
    } else if (tab === "projects" && projects.length > 0) {
      headers = ["ID", "Name", "Slug", "Owner Email", "Feedbacks", "Roadmap", "Changelogs", "Is Public", "Created At"];
      dataToExport = projects.map(p => [
        p.id, `"${p.name.replace(/"/g, '""')}"`, p.slug, p.owner.email,
        p._count.feedbacks, p._count.roadmapItems, p._count.changelogs, p.isPublic, p.createdAt
      ]);
      filename = "featureflow_projects.csv";
    } else {
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + dataToExport.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "projects", label: "Projects", icon: FolderOpen },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Super Admin</h1>
            <p className="text-muted-foreground text-sm">Manage all users, projects, and platform data</p>
          </div>
        </div>
        <Link
          href="/dashboard/admin/smtp"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-muted/50 text-sm font-medium transition-colors"
        >
          <Mail className="w-4 h-4" />
          SMTP Settings
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); setDateFrom(""); setDateTo(""); setSearchInput(""); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar & Export (for users and projects) */}
      {tab !== "overview" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={tab === "users" ? "Search by name or email..." : "Search by name or slug..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              title="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              title="To date"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Clear date filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={exportToCsv}
            disabled={(tab === "users" && users.length === 0) || (tab === "projects" && projects.length === 0)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ═══ Overview Tab ═══ */}
          {tab === "overview" && overview && (
            <div className="space-y-6">
              {/* Main stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
                {[
                  { label: "Total Users", value: overview.totalUsers, icon: Users, gradient: "from-blue-500 to-cyan-500" },
                  { label: "Projects", value: overview.totalProjects, icon: FolderOpen, gradient: "from-purple-500 to-pink-500" },
                  { label: "Feedbacks", value: overview.totalFeedback, icon: MessageSquare, gradient: "from-green-500 to-emerald-500" },
                  { label: "Comments", value: overview.totalComments, icon: MessageSquare, gradient: "from-orange-500 to-amber-500" },
                  { label: "Upvotes", value: overview.totalUpvotes, icon: ArrowUpRight, gradient: "from-red-500 to-rose-500" },
                ].map((stat) => (
                  <div key={stat.label} className="p-5 rounded-2xl border border-border bg-surface hover:shadow-lg transition-shadow">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Breakdown cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Recent signups */}
                <div className="p-5 rounded-2xl border border-border bg-surface">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Last 7 Days
                  </h3>
                  <p className="text-3xl font-bold text-primary">{overview.recentUsers}</p>
                  <p className="text-xs text-muted-foreground">new signups</p>
                </div>

                {/* By role */}
                <div className="p-5 rounded-2xl border border-border bg-surface">
                  <h3 className="font-semibold text-sm mb-3">By Role</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Owners</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors.owner}`}>{overview.byRole.owners}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Customers</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors.customer}`}>{overview.byRole.customers}</span>
                    </div>
                  </div>
                </div>

                {/* By plan */}
                <div className="p-5 rounded-2xl border border-border bg-surface">
                  <h3 className="font-semibold text-sm mb-3">By Plan</h3>
                  <div className="space-y-2">
                    {Object.entries(overview.byPlan).map(([plan, count]) => (
                      <div key={plan} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{plan}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColors[plan]}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Users Tab ═══ */}
          {tab === "users" && (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Plan</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Projects</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Feedbacks</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Comments</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Joined</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{u.name || "—"}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || ""}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColors[u.plan] || ""}`}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">{u._count.projects}</td>
                        <td className="px-5 py-3 text-center">{u._count.feedbacks}</td>
                        <td className="px-5 py-3 text-center">{u._count.comments}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => openUserDetail(u.id)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Projects Tab ═══ */}
          {tab === "projects" && (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Project</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Owner</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Feedbacks</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Roadmap</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Changelogs</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Created</th>
                      <th className="text-center px-5 py-3 font-medium text-muted-foreground">Public</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: p.primaryColor }}
                            >
                              <FolderOpen className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <a
                                href={`/p/${p.slug}/feedback`}
                                target="_blank"
                                className="text-xs text-primary hover:underline flex items-center gap-0.5"
                              >
                                /{p.slug} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openUserDetail(p.owner.id)}
                            className="text-left hover:text-primary transition-colors"
                          >
                            <p className="text-sm font-medium">{p.owner.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{p.owner.email}</p>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-center">{p._count.feedbacks}</td>
                        <td className="px-5 py-3 text-center">{p._count.roadmapItems}</td>
                        <td className="px-5 py-3 text-center">{p._count.changelogs}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {p.isPublic ? (
                            <span className="text-success">●</span>
                          ) : (
                            <span className="text-muted-foreground">○</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                          No projects found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ User Detail Drawer ═══ */}
      {(selectedUser || loadingUser) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedUser(null)}>
          <div
            className="w-full max-w-xl bg-surface h-full overflow-y-auto border-l border-border animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideInRight 0.3s ease-out" }}
          >
            {loadingUser ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : selectedUser ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold">
                      {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedUser.name || "No name"}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Role & Plan (editable) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div className="p-4 rounded-xl border border-border bg-background">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-medium">Role</span>
                      <button
                        onClick={() => { setEditingField("role"); setEditValue(selectedUser.role); }}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                    {editingField === "role" ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg border border-border bg-surface text-sm"
                        >
                          <option value="owner">owner</option>
                          <option value="customer">customer</option>
                        </select>
                        <button onClick={() => updateUser(selectedUser.id, "role", editValue)} className="p-1 rounded hover:bg-success/10 text-success">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingField(null)} className="p-1 rounded hover:bg-danger/10 text-danger">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[selectedUser.role]}`}>
                        {selectedUser.role}
                      </span>
                    )}
                  </div>

                  {/* Plan */}
                  <div className="p-4 rounded-xl border border-border bg-background">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-medium">Plan</span>
                      <button
                        onClick={() => { setEditingField("plan"); setEditValue(selectedUser.plan); }}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                    {editingField === "plan" ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg border border-border bg-surface text-sm"
                        >
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="team">team</option>
                        </select>
                        <button onClick={() => updateUser(selectedUser.id, "plan", editValue)} className="p-1 rounded hover:bg-success/10 text-success">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingField(null)} className="p-1 rounded hover:bg-danger/10 text-danger">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${planColors[selectedUser.plan]}`}>
                        {selectedUser.plan}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Projects", value: selectedUser._count.projects },
                    { label: "Feedbacks", value: selectedUser._count.feedbacks },
                    { label: "Comments", value: selectedUser._count.comments },
                    { label: "Upvotes", value: selectedUser._count.upvotes },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-3 rounded-xl bg-muted/50">
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Dates */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Joined: {format(new Date(selectedUser.createdAt), "PPP 'at' p")}</p>
                  <p>Last updated: {format(new Date(selectedUser.updatedAt), "PPP 'at' p")}</p>
                  {selectedUser.entitlements.length > 0 && (
                    <div className="space-y-1">
                      {selectedUser.entitlements.map((ent) => (
                        <p key={ent.fsLicenseId}>
                          License: {ent.type} — {ent.isCanceled ? "Canceled" : "Active"}
                          {ent.expiration &&
                            ` (expires ${format(new Date(ent.expiration), "PP")})`
                          }
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects */}
                {selectedUser.projects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Projects ({selectedUser.projects.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedUser.projects.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: p.primaryColor }} />
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">/{p.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{p._count.feedbacks} fb</span>
                            <span>{p._count.roadmapItems} rm</span>
                            <span>{p._count.changelogs} cl</span>
                            <a href={`/p/${p.slug}/feedback`} target="_blank" className="text-primary hover:text-primary-hover">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Feedbacks */}
                {selectedUser.feedbacks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Recent Feedbacks ({selectedUser.feedbacks.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedUser.feedbacks.map((fb) => (
                        <div key={fb.id} className="p-3 rounded-xl bg-muted/50">
                          <p className="text-sm font-medium mb-1">{fb.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`status-${fb.status} px-1.5 py-0.5 rounded-full text-[10px] font-medium`}>{fb.status}</span>
                            <span>{fb.project.name}</span>
                            <span>▲ {fb.upvoteCount}</span>
                            <span>{formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Comments */}
                {selectedUser.comments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Recent Comments ({selectedUser.comments.length})</h3>
                    <div className="space-y-2">
                      {selectedUser.comments.map((c) => (
                        <div key={c.id} className="p-3 rounded-xl bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">on &quot;{c.feedback.title}&quot;</p>
                          <p className="text-sm line-clamp-2">{c.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
