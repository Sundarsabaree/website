import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Inbox,
  AlertTriangle,
  Target,
  Phone,
  Mail,
  Building2,
  Calendar,
  DollarSign,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import {
  leadService,
  customerService,
  employeeService,
} from "../services/api.js";
import { Lead, LeadStage, Priority, User } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Modal } from "../components/ui/Modal.js";
import { Input, Select, TextArea } from "../components/ui/Input.js";
import { useAuth } from "../context/AuthContext.js";

const STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const stageBadge: Record<LeadStage, { variant: any; label: string }> = {
  NEW: { variant: "slate", label: "New" },
  CONTACTED: { variant: "blue", label: "Contacted" },
  QUALIFIED: { variant: "purple", label: "Qualified" },
  PROPOSAL: { variant: "cyan", label: "Proposal" },
  NEGOTIATION: { variant: "amber", label: "Negotiation" },
  WON: { variant: "green", label: "Converted" },
  LOST: { variant: "red", label: "Lost" },
};

const priorityBadge: Record<Priority, { variant: any; label: string }> = {
  LOW: { variant: "cyan", label: "Low" },
  MEDIUM: { variant: "amber", label: "Medium" },
  HIGH: { variant: "red", label: "High" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const emptyForm = {
  title: "",
  contactName: "",
  email: "",
  phone: "",
  company: "",
  value: "",
  stage: "NEW" as LeadStage,
  priority: "MEDIUM" as Priority,
  notes: "",
  followUpDate: "",
  assignedToId: "",
  customerId: "",
};

export const LeadsPage: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const canWrite = true;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [employees, setEmployees] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await leadService.getAll({
        stage: stageFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      });
      setLeads(res.data.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [stageFilter, priorityFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

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

  const openAdd = () => {
    setForm({ ...emptyForm });
    setFormError("");
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditTarget(lead);
    setForm({
      title: lead.title,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone || "",
      company: lead.company || "",
      value: lead.value ? String(lead.value) : "",
      stage: lead.stage,
      priority: lead.priority,
      notes: lead.notes || "",
      followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : "",
      assignedToId: lead.assignedToId || "",
      customerId: lead.customerId || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.contactName.trim() || !form.email.trim()) {
      setFormError("Title, Contact Name, and valid Email are required.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const payload = {
        title: form.title,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        value: Number(form.value) || 0,
        stage: form.stage,
        priority: form.priority,
        notes: form.notes || undefined,
        followUpDate: form.followUpDate || null,
        assignedToId: form.assignedToId || undefined,
        customerId: form.customerId || undefined,
      };

      if (editTarget) {
        await leadService.update(editTarget.id, payload);
      } else {
        await leadService.create(payload);
      }
      closeForm();
      await fetchLeads();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save lead.");
    } finally {
      setSaving(false);
    }
  };

  const quickStageChange = async (lead: Lead, stage: LeadStage) => {
    try {
      await leadService.update(lead.id, { stage });
      await fetchLeads();
    } catch (err: any) {
      setError(err?.message || "Failed to update lead stage.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await leadService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await fetchLeads();
    } catch (err: any) {
      setError(err?.message || "Failed to delete lead.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // Funnel stats
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const activeCount = leads.filter(
    (l) => l.stage !== "WON" && l.stage !== "LOST",
  ).length;
  const wonCount = leads.filter((l) => l.stage === "WON").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-400" />
            Lead Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track, qualify and convert sales prospects across your pipeline.
          </p>
        </div>
        {canWrite && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Add Lead
          </Button>
        )}
      </div>

      {/* Metrics overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium">Total Leads</p>
          <p className="text-2xl font-heading font-bold text-white mt-1">
            {leads.length}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium">Active Pipeline</p>
          <p className="text-2xl font-heading font-bold text-cyan-400 mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium">Pipeline Value</p>
          <p className="text-2xl font-heading font-bold text-blue-400 mt-1">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium">Converted (Won)</p>
          <p className="text-2xl font-heading font-bold text-emerald-400 mt-1">
            {wonCount}
          </p>
        </div>
      </div>

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
            placeholder="Search by title, contact, company, email..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-48"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {stageBadge[s].label}
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

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading leads...
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-20 px-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Inbox size={24} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            No leads found
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {canWrite
              ? "Create your first lead to start filling your sales pipeline."
              : "Leads assigned to you will appear here."}
          </p>
          {canWrite && (
            <Button
              className="mt-4"
              onClick={openAdd}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Lead
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Contact & Company
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Follow-Up
                  </th>
                  {canWrite && (
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((lead) => {
                  const sBadge = stageBadge[lead.stage] || {
                    variant: "slate",
                    label: lead.stage,
                  };
                  const pBadge = priorityBadge[lead.priority] || {
                    variant: "slate",
                    label: lead.priority,
                  };

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {lead.title}
                        </p>
                        {lead.notes && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {lead.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-200 font-medium">
                            {lead.contactName}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {lead.email}
                            </span>
                            {lead.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                {lead.company}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-blue-400">
                        {lead.value ? formatCurrency(lead.value) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {canWrite ? (
                          <select
                            value={lead.stage}
                            onChange={(e) =>
                              quickStageChange(
                                lead,
                                e.target.value as LeadStage,
                              )
                            }
                            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {STAGES.map((st) => (
                              <option key={st} value={st}>
                                {stageBadge[st].label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={sBadge.variant} size="sm">
                            {sBadge.label}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={pBadge.variant} size="sm">
                          {pBadge.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-300 text-xs">
                        {lead.assignedTo?.name || "Unassigned"}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {lead.followUpDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(lead.followUpDate).toLocaleDateString(
                              "en-IN",
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {canWrite && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(lead)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                              title="Edit lead"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(lead)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editTarget ? "Edit Lead" : "New Lead"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editTarget ? "Save Changes" : "Create Lead"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Lead Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Enterprise Cloud Migration"
              autoFocus
            />
            <Input
              label="Contact Person *"
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@company.com"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Acme Corp"
            />
            <Input
              label="Estimated Value (₹)"
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="50000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Stage"
              value={form.stage}
              onChange={(e) =>
                setForm({ ...form, stage: e.target.value as LeadStage })
              }
              options={STAGES.map((s) => ({
                value: s,
                label: stageBadge[s].label,
              }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as Priority })
              }
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
              ]}
            />
            <Input
              label="Follow-Up Date"
              type="date"
              value={form.followUpDate}
              onChange={(e) =>
                setForm({ ...form, followUpDate: e.target.value })
              }
            />
          </div>

          {(isAdmin || isManager) && employees.length > 0 && (
            <Select
              label="Assign Owner"
              value={form.assignedToId}
              onChange={(e) =>
                setForm({ ...form, assignedToId: e.target.value })
              }
              options={[
                { value: "", label: "Assign to me" },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.name} (${e.role})`,
                })),
              ]}
            />
          )}

          <TextArea
            label="Notes & Requirements"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Add any notes about this prospect's requirements..."
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Lead"
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
          Are you sure you want to delete lead{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.title}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default LeadsPage;
