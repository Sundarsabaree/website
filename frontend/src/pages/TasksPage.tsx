import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Inbox,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckSquare,
  Users,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import {
  taskService,
  customerService,
  employeeService,
} from "../services/api.js";
import { Task, TaskStatus, Priority, User } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Modal } from "../components/ui/Modal.js";
import { Input, Select, TextArea } from "../components/ui/Input.js";
import { useAuth } from "../context/AuthContext.js";
import { format } from "date-fns";

const STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const statusBadge: Record<TaskStatus, { variant: any; label: string }> = {
  PENDING: { variant: "slate", label: "Pending" },
  IN_PROGRESS: { variant: "blue", label: "In Progress" },
  COMPLETED: { variant: "green", label: "Completed" },
};

const priorityBadge: Record<Priority, { variant: any; label: string }> = {
  LOW: { variant: "cyan", label: "Low" },
  MEDIUM: { variant: "amber", label: "Medium" },
  HIGH: { variant: "red", label: "High" },
};

const emptyForm = {
  title: "",
  description: "",
  dueDate: "",
  priority: "MEDIUM" as Priority,
  status: "PENDING" as TaskStatus,
  assignedToId: "",
  customerId: "",
};

export const TasksPage: React.FC = () => {
  const { user, isAdmin, isManager, isSales } = useAuth();
  const canWrite = true;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [employees, setEmployees] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  // Forms State
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await taskService.getAll({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setTasks(res.data.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    customerService
      .getAll({ limit: 200 })
      .then((r) => setCustomers(r.data.data.items || []))
      .catch(() => {});

    if (isAdmin || isManager) {
      employeeService
        .getAll()
        .then((r) => setEmployees(r.data.data || []))
        .catch(() => {});
    }
  }, [isAdmin, isManager]);

  const filtered = tasks.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.assignedTo?.name || "").toLowerCase().includes(q) ||
      (t.createdBy?.name || "").toLowerCase().includes(q) ||
      (t.customer?.name || "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm({ ...emptyForm });
    setFormError("");
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditTarget(task);
    setForm({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      priority: task.priority,
      status: task.status,
      assignedToId: task.assignedToId || "",
      customerId: task.customerId || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        dueDate: form.dueDate || null,
        priority: form.priority,
        status: form.status,
        assignedToId: form.assignedToId || undefined,
        customerId: form.customerId || undefined,
      };
      if (editTarget) {
        await taskService.update(editTarget.id, payload);
      } else {
        await taskService.create(payload);
      }
      closeForm();
      setSuccessMsg(
        editTarget
          ? "Task updated successfully."
          : "Task created successfully.",
      );
      setTimeout(() => setSuccessMsg(""), 4000);
      await fetchTasks();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const quickStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      await taskService.update(task.id, { status });
      setSuccessMsg(`Task status updated to ${statusBadge[status].label}.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchTasks();
    } catch (err: any) {
      setError(err?.message || "Failed to update task status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await taskService.delete(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMsg("Task deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchTasks();
    } catch (err: any) {
      setError(err?.message || "Failed to delete task.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // Filter assignable employees for task creation/delegation
  // For Manager delegating: ONLY Sales Executives
  const salesExecsList = employees.filter(
    (e) => e.role === "SALES_EXECUTIVE" && e.status === "ACTIVE",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-400" />
            {isSales ? "My Tasks" : "Tasks & Delegations"}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isAdmin && "Company-wide task assignment and execution oversight."}
            {isManager && "Manage team assignments for your Sales Executives."}
            {isSales &&
              "Track your assigned deliverables and update task progress."}
          </p>
        </div>
        {canWrite && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Add Task
          </Button>
        )}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title, description, assignee, customer..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-48"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusBadge[s].label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-40"
        >
          <option value="">All Priorities</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading tasks...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-20 px-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Inbox size={24} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            No tasks found
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {canWrite
              ? "Add a task or assign work to your sales team."
              : "Tasks will appear here once assigned."}
          </p>
          {canWrite && (
            <Button
              className="mt-4"
              onClick={openAdd}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Task
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden">
          {filtered.map((task) => {
            const sBadge = statusBadge[task.status];
            const pBadge = priorityBadge[task.priority];

            return (
              <div
                key={task.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Title & Badges */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3
                      className={`text-base font-semibold ${
                        task.status === "COMPLETED"
                          ? "line-through text-slate-500"
                          : "text-white group-hover:text-blue-400 transition-colors"
                      }`}
                    >
                      {task.title}
                    </h3>
                    <Badge variant={pBadge.variant} size="sm">
                      {pBadge.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Assignment Chain Meta Details */}
                  <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-400 flex-wrap pt-1">
                    {/* Due Date */}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <CalendarIcon size={13} className="text-slate-500" />
                        Due:{" "}
                        {new Date(task.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    )}

                    {/* Created By (Admin/Creator) */}
                    {task.createdBy?.name && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500">Created by:</span>
                        <strong className="text-slate-300 font-medium">
                          {task.createdBy.name}
                        </strong>
                      </span>
                    )}

                    {/* Current Assignee (Sales Exec / Assignee) */}
                    <span className="flex items-center gap-1">
                      <span className="text-slate-500">Current Assignee:</span>
                      <strong className="text-blue-300 font-medium flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-blue-400" />
                        {task.assignedTo?.name || "Unassigned"}
                      </strong>
                    </span>

                    {/* Related Customer */}
                    {task.customer?.name && (
                      <span className="text-slate-500">
                        Customer:{" "}
                        <span className="text-slate-300">
                          {task.customer.name}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions & Status Control */}
                <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                  {/* Quick status selector */}
                  {canWrite ? (
                    <select
                      value={task.status}
                      onChange={(e) =>
                        quickStatusChange(task, e.target.value as TaskStatus)
                      }
                      className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusBadge[s].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={sBadge.variant} size="sm">
                      {sBadge.label}
                    </Badge>
                  )}

                  {/* Edit Button */}
                  {canWrite && (
                    <button
                      onClick={() => openEdit(task)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button (Admin / Creator) */}
                  {(isAdmin ||
                    (isManager && task.createdById === user?.id)) && (
                    <button
                      onClick={() => setDeleteTarget(task)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT MODAL ================= */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editTarget ? "Edit Task" : "Add Task"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editTarget ? "Save Changes" : "Create Task"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-3 py-2 text-sm">
              {formError}
            </div>
          )}
          <Input
            label="Task Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Follow up with ABC Customer"
            autoFocus
          />
          <TextArea
            label="Description & Deliverables"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Provide context and deliverables for this task..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as Priority })
              }
              options={[
                { value: "LOW", label: "Low Priority" },
                { value: "MEDIUM", label: "Medium Priority" },
                { value: "HIGH", label: "High Priority" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as TaskStatus })
              }
              options={STATUSES.map((s) => ({
                value: s,
                label: statusBadge[s].label,
              }))}
            />
            <Select
              label="Related Customer"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              options={[
                { value: "", label: "None / General" },
                ...customers.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          {/* Role-based Assignee Selector */}
          {isAdmin && employees.length > 0 && (
            <Select
              label="Assign Task (Admin can assign to Managers or Sales Executives)"
              value={form.assignedToId}
              onChange={(e) =>
                setForm({ ...form, assignedToId: e.target.value })
              }
              options={[
                { value: "", label: "Assign to me (Admin)" },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.name} (${e.role.replace("_", " ")})`,
                })),
              ]}
            />
          )}

          {isManager && (
            <Select
              label="Assign Task (Manager can assign to Sales Executives)"
              value={form.assignedToId}
              onChange={(e) =>
                setForm({ ...form, assignedToId: e.target.value })
              }
              options={[
                { value: "", label: "Assign to myself (Manager)" },
                ...salesExecsList.map((e) => ({
                  value: e.id,
                  label: `${e.name} (Sales Executive)`,
                })),
              ]}
            />
          )}
        </div>
      </Modal>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Task"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={saving} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete task{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.title}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default TasksPage;
