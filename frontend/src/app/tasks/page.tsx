"use client";

import { PageLayout } from "@/components/PageLayout";
import { PageCard } from "@/components/PageCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError, formatDate, taskQueryParams } from "@/lib/api";
import { getUser, isSuperAdmin } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigneeEmail?: string | null;
  dueDate?: string | null;
  sortOrder: number;
};

const COLUMNS = [
  { id: "TODO", label: "To Do", color: "border-slate-200 bg-slate-50/50" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-200 bg-blue-50/50" },
  { id: "DONE", label: "Done", color: "border-green-200 bg-green-50/50" },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function TasksPage() {
  const user = getUser();
  const superAdmin = isSuperAdmin(user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterEmail, setFilterEmail] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeEmail: "",
    dueDate: "",
  });

  const loadTasks = useCallback(() => {
    const extra = superAdmin && filterEmail ? { assigneeEmail: filterEmail } : undefined;
    return apiFetch<Task[]>(`/api/tasks?${taskQueryParams(extra)}`)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [superAdmin, filterEmail]);

  useEffect(() => {
    loadTasks();
    if (superAdmin) {
      apiFetch<Array<{ id: string; name: string; email: string }>>("/api/employees")
        .then(setEmployees)
        .catch(() => {});
    }
  }, [loadTasks, superAdmin]);

  const tasksByColumn = (status: string) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.sortOrder - b.sortOrder);

  const moveTask = async (taskId: string, status: string, sortOrder = 0) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ status, sortOrder }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status, sortOrder } : t))
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to move task");
      loadTasks();
    }
  };

  const handleDrop = (status: string) => {
    if (!draggingId) return;
    const columnTasks = tasksByColumn(status);
    moveTask(draggingId, status, columnTasks.length);
    setDraggingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          assigneeEmail: form.assigneeEmail || user.email,
          createdById: user.id,
          dueDate: form.dueDate || null,
        }),
      });
      toast.success("Task created");
      setOpen(false);
      setForm({ title: "", description: "", priority: "MEDIUM", assigneeEmail: "", dueDate: "" });
      loadTasks();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create task");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  };

  return (
    <PageLayout
      title="Tasks"
      description={superAdmin ? "Manage all clinic tasks and assignments." : "Your assigned tasks and onboarding checklist."}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {superAdmin && (
            <Select value={filterEmail || "__all__"} onValueChange={(v) => setFilterEmail(v === "__all__" ? "" : v ?? "")}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All assignees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All assignees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {superAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="gap-2"><Plus className="h-4 w-4" /> New Task</Button>} />
              <DialogContent>
                <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v ?? "MEDIUM" })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={form.assigneeEmail || "__none__"} onValueChange={(v) => setForm({ ...form, assigneeEmail: v === "__none__" ? "" : v ?? "" })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.email}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-96 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <PageCard key={col.id} className={cn("min-h-[420px] border-2", col.color)}>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{col.label}</h3>
                <Badge variant="secondary">{tasksByColumn(col.id).length}</Badge>
              </div>
              <div className="space-y-3">
                {tasksByColumn(col.id).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "cursor-grab rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md",
                      draggingId === task.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM)}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground">Due {formatDate(task.dueDate)}</span>
                          )}
                          {superAdmin && task.assigneeEmail && (
                            <span className="text-[10px] text-primary">{task.assigneeEmail}</span>
                          )}
                        </div>
                        <div className="mt-2 flex gap-1">
                          {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                            <Button
                              key={c.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px]"
                              onClick={() => moveTask(task.id, c.id, tasksByColumn(c.id).length)}
                            >
                              → {c.label}
                            </Button>
                          ))}
                          {superAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="ml-auto text-destructive"
                              onClick={() => handleDelete(task.id)}
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tasksByColumn(col.id).length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">Drop tasks here</p>
                )}
              </div>
              </div>
            </PageCard>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
