import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Inbox,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Trophy,
  Percent,
} from "lucide-react";
import {
  dealService,
  customerService,
  employeeService,
} from "../services/api.js";
import { Deal, DealStage, User } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Modal } from "../components/ui/Modal.js";
import { Input, Select } from "../components/ui/Input.js";
import { useAuth } from "../context/AuthContext.js";

const STAGES: DealStage[] = [
  "DISCOVERY",
  "QUALIFICATION",
  "NEEDS_ANALYSIS",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

const stageBadge: Record<DealStage, { variant: any; label: string }> = {
  DISCOVERY: { variant: "slate", label: "New" },
  QUALIFICATION: { variant: "blue", label: "Qualification" },
  NEEDS_ANALYSIS: { variant: "cyan", label: "Needs Analysis" },
  PROPOSAL: { variant: "cyan", label: "Proposal" },
  NEGOTIATION: { variant: "amber", label: "Negotiation" },
  CLOSED_WON: { variant: "green", label: "Closed Won" },
  CLOSED_LOST: { variant: "red", label: "Closed Lost" },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const emptyForm = {
  title: "",
  value: "",
  stage: "DISCOVERY" as DealStage,
  probability: "20",
  closingDate: "",
  customerId: "",
  assignedToId: "",
};

interface Metrics {
  totalDeals: number;
  totalPipelineValue: number;
  forecastRevenue: number;
  winRate: number;
  closedWonCount: number;
  closedWonValue: number;
}

export const DealsPage: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const canWrite = true;

  const [deals, setDeals] = useState<Deal[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [employees, setEmployees] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await dealService.getAll({
        stage: stageFilter || undefined,
      });
      setDeals(res.data.data.items);
      setMetrics(res.data.data.metrics);
    } catch (err: any) {
      setError(err?.message || "Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }, [stageFilter]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

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

  const filtered = deals.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.customer?.name || "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm({ ...emptyForm });
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditTarget(deal);
    setForm({
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      probability: String(deal.probability),
      closingDate: deal.closingDate ? deal.closingDate.slice(0, 10) : "",
      customerId: deal.customerId || "",
      assignedToId: deal.assignedToId || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.customerId) {
      setFormError("Title and associated customer are required.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const payload = {
        title: form.title,
        value: Number(form.value) || 0,
        stage: form.stage,
        probability: Number(form.probability) || 0,
        closingDate: form.closingDate || null,
        customerId: form.customerId,
        assignedToId: form.assignedToId || undefined,
      };
      if (editTarget) {
        await dealService.update(editTarget.id, payload);
      } else {
        await dealService.create(payload);
      }
      closeForm();
      await fetchDeals();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save deal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await dealService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await fetchDeals();
    } catch (err: any) {
      setError(err?.message || "Failed to delete deal.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const statCards = metrics
    ? [
        {
          label: "Pipeline Value",
          value: formatCurrency(metrics.totalPipelineValue),
          icon: Wallet,
          tint: "text-blue-300 bg-blue-500/10",
        },
        {
          label: "Forecast Revenue",
          value: formatCurrency(metrics.forecastRevenue),
          icon: TrendingUp,
          tint: "text-cyan-300 bg-cyan-500/10",
        },
        {
          label: "Win Rate",
          value: `${metrics.winRate}%`,
          icon: Percent,
          tint: "text-violet-300 bg-violet-500/10",
        },
        {
          label: "Closed Won",
          value: `${metrics.closedWonCount} · ${formatCurrency(metrics.closedWonValue)}`,
          icon: Trophy,
          tint: "text-emerald-300 bg-emerald-500/10",
        },
      ]
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Sales & Deals</h1>
          <p className="text-slate-400 text-sm">
            Track every deal from discovery to close.
          </p>
        </div>
        {canWrite && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            New Deal
          </Button>
        )}
      </div>

      {/* Pipeline summary */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, tint }) => (
            <div
              key={label}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4"
            >
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center ${tint}`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-lg font-semibold truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by deal title or customer"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 sm:w-56"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {stageBadge[s].label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading deals
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-16 px-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
            <Inbox size={22} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No deals yet</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {canWrite
              ? "Create your first deal to start tracking your pipeline."
              : "Deals will appear here once they are created."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((deal) => {
            const badge = stageBadge[deal.stage];
            return (
              <div
                key={deal.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{deal.title}</h3>
                  <Badge variant={badge.variant} size="sm">
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(deal.value)}
                </p>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Customer: {deal.customer?.name || "—"}</p>
                  <p>Owner: {deal.assignedTo?.name || "Unassigned"}</p>
                  <p>Probability: {deal.probability}%</p>
                  {deal.closingDate && (
                    <p>
                      Closing:{" "}
                      {new Date(deal.closingDate).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
                {canWrite && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEdit(deal)}
                    >
                      Edit
                    </Button>
                    {(isAdmin || isManager) && (
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => setDeleteTarget(deal)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editTarget ? "Edit Deal" : "New Deal"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editTarget ? "Save Changes" : "Create Deal"}
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
            label="Deal Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value (₹) *"
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <Input
              label="Probability (%)"
              type="number"
              min={0}
              max={100}
              value={form.probability}
              onChange={(e) =>
                setForm({ ...form, probability: e.target.value })
              }
            />
          </div>
          <Select
            label="Customer *"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            options={[
              { value: "", label: "Select a customer" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Stage"
              value={form.stage}
              onChange={(e) =>
                setForm({ ...form, stage: e.target.value as DealStage })
              }
              options={STAGES.map((s) => ({
                value: s,
                label: stageBadge[s].label,
              }))}
            />
            <Input
              label="Closing Date"
              type="date"
              value={form.closingDate}
              onChange={(e) =>
                setForm({ ...form, closingDate: e.target.value })
              }
            />
          </div>
          {(isAdmin || isManager) && employees.length > 0 && (
            <Select
              label="Assigned To"
              value={form.assignedToId}
              onChange={(e) =>
                setForm({ ...form, assignedToId: e.target.value })
              }
              options={[
                { value: "", label: "Assign to me" },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
            />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Deal"
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
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.title}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default DealsPage;
