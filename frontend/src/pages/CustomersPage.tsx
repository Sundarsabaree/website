import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Download,
  Upload,
  Filter,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { customerService, employeeService } from "../services/api.js";
import { Customer, User, CustomerStatus } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Modal } from "../components/ui/Modal.js";
import { useAuth } from "../context/AuthContext.js";
import { format } from "date-fns";

const statusBadge: Record<CustomerStatus, { variant: any; label: string }> = {
  ACTIVE: { variant: "green", label: "Active" },
  INACTIVE: { variant: "slate", label: "Inactive" },
  PROSPECT: { variant: "amber", label: "Prospect" },
};

const leadScoreBadge = (score?: string) => {
  if (!score) return { variant: "slate" as const, label: "Unscored" };
  if (score.includes("Hot")) return { variant: "red" as const, label: score };
  if (score.includes("Medium"))
    return { variant: "amber" as const, label: score };
  return { variant: "blue" as const, label: score };
};

const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail & E-commerce",
  "Logistics",
  "Media & Entertainment",
  "Education",
  "Real Estate",
  "General",
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  industry: "",
  budget: 0,
  interest: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  status: "ACTIVE" as CustomerStatus,
  assignedToId: "",
  notes: "",
};

export const CustomersPage: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<User[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [addModal, setAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [csvText, setCsvText] = useState("");

  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCustomers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const res = await customerService.getAll({
          search: search || undefined,
          status: statusFilter || undefined,
          sortBy,
          sortOrder,
          page,
          limit: 15,
        });
        setCustomers(res.data.data.items);
        setPagination(res.data.data.pagination);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, sortBy, sortOrder],
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  useEffect(() => {
    if (isAdmin || isManager) {
      employeeService
        .getAll()
        .then((r) => setEmployees(r.data.data))
        .catch(() => {});
    }
  }, [isAdmin, isManager]);

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.email) {
      setFormError("Name and email are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await customerService.create(form);
      setAddModal(false);
      setForm({ ...emptyForm });
      fetchCustomers(1);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || "Failed to create customer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editCustomer) return;
    if (!form.name || !form.email) {
      setFormError("Name and email are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await customerService.update(editCustomer.id, form);
      setEditCustomer(null);
      fetchCustomers(pagination.page);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || "Failed to update customer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await customerService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchCustomers(pagination.page);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] || "";
      });
      return obj;
    });
    try {
      const res = await customerService.importCsv(rows);
      alert(res.data.message);
      setImportModal(false);
      setCsvText("");
      fetchCustomers(1);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Import failed.");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Name",
      "Email",
      "Company",
      "Industry",
      "Budget",
      "Lead Score",
      "Status",
    ];
    const rows = customers.map((c) => [
      c.name,
      c.email,
      c.company || "",
      c.industry || "",
      c.budget,
      c.leadScore || "",
      c.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smartcrm-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      company: c.company || "",
      industry: c.industry || "",
      budget: c.budget,
      interest: c.interest || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      country: c.country || "India",
      status: c.status,
      assignedToId: c.assignedToId || "",
      notes: c.notes || "",
    });
    setEditCustomer(c);
    setFormError("");
  };

  const CustomerForm = () => (
    <div className="space-y-4">
      {formError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {formError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Full Name *
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Corp Contact"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Email *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@company.com"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Phone
          </label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 000 0000"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Company
          </label>
          <input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Acme Corporation"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Industry
          </label>
          <select
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Budget (₹)
          </label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) =>
              setForm({ ...form, budget: Number(e.target.value) })
            }
            placeholder="50000"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Interest / Product Need
          </label>
          <input
            value={form.interest}
            onChange={(e) => setForm({ ...form, interest: e.target.value })}
            placeholder="CRM Integration, Cloud Migration…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            City
          </label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Mumbai"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Country
          </label>
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            placeholder="India"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as CustomerStatus })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PROSPECT">Prospect</option>
          </select>
        </div>
        {(isAdmin || isManager) && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              Assigned To
            </label>
            <select
              value={form.assignedToId}
              onChange={(e) =>
                setForm({ ...form, assignedToId: e.target.value })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              <option value="">Assign to rep…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="col-span-2 space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Notes
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Internal notes about this customer…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">
            Customer Management
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {pagination.total} customers total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModal(true)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm({ ...emptyForm });
              setFormError("");
              setAddModal(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company…"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PROSPECT">Prospect</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {[
                  { key: "name", label: "Customer" },
                  { key: "company", label: "Company" },
                  { key: "budget", label: "Budget" },
                  { key: "leadScore", label: "Lead Score" },
                  { key: "status", label: "Status" },
                  { key: "assignedTo", label: "Assigned To" },
                  { key: "createdAt", label: "Added" },
                  { key: "actions", label: "" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() =>
                      col.key !== "actions" &&
                      col.key !== "assignedTo" &&
                      col.key !== "leadScore"
                        ? handleSort(col.key)
                        : undefined
                    }
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.key !== "actions" && col.key !== "assignedTo" ? "cursor-pointer hover:text-slate-200 transition-colors" : ""}`}
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span className="ml-1 text-blue-400">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-4 bg-slate-800 rounded animate-pulse"
                          style={{ width: `${50 + Math.random() * 40}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-4xl opacity-30">👥</div>
                      <p>No customers found. Add your first customer!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => {
                  const score = leadScoreBadge(c.leadScore);
                  const status = statusBadge[c.status];
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-slate-800/70 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-200">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          {c.company && (
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span>{c.company || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        ₹{c.budget.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={score.variant} size="sm">
                          {score.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {c.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                              {c.assignedTo.name?.[0]}
                            </div>
                            <span className="text-xs text-slate-400">
                              {c.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {format(new Date(c.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewCustomer(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {(isAdmin || isManager) && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Showing{" "}
              {Math.min(
                (pagination.page - 1) * pagination.limit + 1,
                pagination.total,
              )}
              –{Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchCustomers(pagination.page - 1)}
                disabled={pagination.page === 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Prev
              </Button>
              <span className="text-xs text-slate-400 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchCustomers(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        title="Add New Customer"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} isLoading={saving}>
              Add Customer
            </Button>
          </>
        }
      >
        <CustomerForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        title="Edit Customer"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        <CustomerForm />
      </Modal>

      {/* View Customer Modal */}
      <Modal
        isOpen={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        title="Customer Details"
        size="lg"
      >
        {viewCustomer && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {viewCustomer.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-white">
                  {viewCustomer.name}
                </h3>
                <p className="text-slate-400 text-sm">
                  {viewCustomer.company || "No company"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={statusBadge[viewCustomer.status].variant}
                    size="sm"
                  >
                    {statusBadge[viewCustomer.status].label}
                  </Badge>
                  {viewCustomer.leadScore && (
                    <Badge
                      variant={leadScoreBadge(viewCustomer.leadScore).variant}
                      size="sm"
                    >
                      {viewCustomer.leadScore}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-800/60 rounded-xl p-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-300 truncate">
                  {viewCustomer.email}
                </span>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-300">
                  {viewCustomer.phone || "No phone"}
                </span>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-0.5">Industry</p>
                <p className="text-slate-300">{viewCustomer.industry || "—"}</p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-0.5">Budget</p>
                <p className="text-slate-300 font-semibold">
                  ₹{viewCustomer.budget.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-0.5">Location</p>
                <p className="text-slate-300">
                  {[viewCustomer.city, viewCustomer.state, viewCustomer.country]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-0.5">Assigned To</p>
                <p className="text-slate-300">
                  {viewCustomer.assignedTo?.name || "Unassigned"}
                </p>
              </div>
            </div>
            {viewCustomer.interest && (
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1">
                  Interest / Product Need
                </p>
                <p className="text-slate-300 text-sm">
                  {viewCustomer.interest}
                </p>
              </div>
            )}
            {viewCustomer.notes && (
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-slate-500 text-xs mb-1">Notes</p>
                <p className="text-slate-300 text-sm">{viewCustomer.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Customer"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-slate-300 text-sm">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
          This will also remove all associated leads, deals, and tasks.
        </p>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Import Customers from CSV"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setImportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCsv}>Import</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Paste CSV data below. Required columns:{" "}
            <code className="text-blue-400">name, email</code>. Optional:{" "}
            <code className="text-slate-400">
              phone, company, industry, budget, interest, city, country, status
            </code>
          </p>
          <textarea
            rows={10}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`name,email,company,budget\n"John Doe","john@example.com","Acme Corp",50000`}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono"
          />
        </div>
      </Modal>
    </div>
  );
};
