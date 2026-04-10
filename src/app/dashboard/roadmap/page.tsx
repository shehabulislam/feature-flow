"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2, GripVertical, Trash2, X, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  quarter: string | null;
  position: number;
  eta: string | null;
}

interface Project {
  slug: string;
  name: string;
}

const columnConfig = {
  planned: { title: "🎯 Planned", color: "border-t-blue-400" },
  in_progress: { title: "🚧 In Progress", color: "border-t-amber-400" },
  completed: { title: "✅ Completed", color: "border-t-emerald-400" },
};

export default function RoadmapPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState("planned");
  const [newQuarter, setNewQuarter] = useState("");
  const [saving, setSaving] = useState(false);

  // Remember last selected project
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
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
      });
  }, []);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem("featureflow-last-project", selectedProject);
    }
  }, [selectedProject]);

  const fetchItems = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${selectedProject}/roadmap`);
    const data = await res.json();
    setItems(data.roadmapItems || []);
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async () => {
    if (!newTitle) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          status: newStatus,
          quarter: newQuarter || null,
        }),
      });
      if (res.ok) {
        toast.success("Roadmap item added");
        setShowModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewQuarter("");
        fetchItems();
      }
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const updateItemStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/roadmap/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this roadmap item?")) return;
    try {
      const res = await fetch(`/api/roadmap/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item deleted");
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const moveItem = async (id: string, status: string, direction: "up" | "down") => {
    const columnItems = items
      .filter((i) => i.status === status)
      .sort((a, b) => a.position - b.position);
    
    const idx = columnItems.findIndex((i) => i.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === columnItems.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updatedItems = [...columnItems];
    [updatedItems[idx], updatedItems[swapIdx]] = [updatedItems[swapIdx], updatedItems[idx]];

    // Optimistic update
    const reordered = updatedItems.map((item, i) => ({ ...item, position: i }));
    setItems((prev) =>
      prev.map((item) => {
        const updated = reordered.find((r) => r.id === item.id);
        return updated ? { ...item, position: updated.position } : item;
      })
    );

    // Save to server
    try {
      await fetch(`/api/roadmap/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((item) => ({
            id: item.id,
            position: item.position,
            status: item.status,
          })),
        }),
      });
    } catch {
      toast.error("Failed to reorder");
      fetchItems();
    }
  };

  const getColumnItems = (status: string) =>
    items.filter((i) => i.status === status).sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Roadmap</h1>
          <p className="text-muted-foreground mt-1">Plan and track your product development</p>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(columnConfig).map(([status, config]) => {
            const colItems = getColumnItems(status);
            return (
              <div key={status} className={`rounded-2xl border border-border bg-surface border-t-4 ${config.color}`}>
                <div className="p-4 border-b border-border">
                  <h3 className="font-bold">{config.title}</h3>
                  <span className="text-sm text-muted-foreground">
                    {colItems.length} items
                  </span>
                </div>
                <div className="p-3 space-y-3 min-h-[200px]">
                  {colItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="group p-4 rounded-xl border border-border bg-background hover:border-primary/30 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                          <button
                            onClick={() => moveItem(item.id, status, "up")}
                            disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground transition-colors"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveItem(item.id, status, "down")}
                            disabled={idx === colItems.length - 1}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-20 text-muted-foreground transition-colors"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {item.description}
                            </p>
                          )}
                          {item.quarter && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              {item.quarter}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Quick status change */}
                      <div className="flex gap-1 mt-3 pt-2 border-t border-border/50">
                        {Object.keys(columnConfig)
                          .filter((s) => s !== status)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => updateItemStatus(item.id, s)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              → {s.replace("_", " ")}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                  {colItems.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground/50">
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-bold">Add roadmap item</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dark mode support"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Details about this item..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Quarter</label>
                  <input
                    type="text"
                    value={newQuarter}
                    onChange={(e) => setNewQuarter(e.target.value)}
                    placeholder="e.g. Q2 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addItem}
                disabled={saving || !newTitle}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
