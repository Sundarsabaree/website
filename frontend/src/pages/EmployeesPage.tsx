import React, { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Users,
  Target,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  UserCheck,
  Eye,
  EyeOff,
  MoreVertical,
  ShieldCheck,
  Building,
  Key,
} from "lucide-react";
import { employeeService } from "../services/api.js";
import { User, Role } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Modal } from "../components/ui/Modal.js";
import { useAuth } from "../context/AuthContext.js";
import { format } from "date-fns";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES_EXECUTIVE: "Sales Executive",
};

const roleBadgeVariant = (role: Role): any => {
  switch (role) {
    case "ADMIN":
      return "purple";
    case "MANAGER":
      return "blue";
    case "SALES_EXECUTIVE":
      return "cyan";
    default:
      return "slate";
  }
};

const statusBadgeVariant = (status?: string): any => {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "green";
    case "ON_LEAVE":
      return "amber";
    case "INACTIVE":
      return "red";
    default:
      return "slate";
  }
};

const assignableRoles = (requesterRole?: Role): Role[] => {
  if (requesterRole === "ADMIN") return ["MANAGER", "SALES_EXECUTIVE"];
  if (requesterRole === "MANAGER") return ["SALES_EXECUTIVE"];
  return [];
};

const canManageTarget = (
  requesterRole: Role | undefined,
  target: User,
): boolean => {
  if (!requesterRole) return false;
  if (target.role === "ADMIN") return false;
  if (requesterRole === "ADMIN") return true;
  if (requesterRole === "MANAGER") return target.role === "SALES_EXECUTIVE";
  return false;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "SALES_EXECUTIVE" as Role,
  phone: "",
  department: "Sales",
  status: "ACTIVE",
};

export const EmployeesPage: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const canAdd = isAdmin || isManager;
  const roleOptions = assignableRoles(user?.role);

  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [addModal, setAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [viewTarget, setViewTarget] = useState<User | null>(null);

  const [form, setForm] = useState({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedSalesExecutiveIds, setSelectedSalesExecutiveIds] = useState<
    string[]
  >([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Action Menu dropdown state for table rows
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await employeeService.getAll({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      // Exclude logged-in user from the list
      const list = (res.data.data || []).filter((e: User) => e.id !== user?.id);
      setEmployees(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, user?.id]);

  useEffect(() => {
    const t = setTimeout(() => fetchEmployees(), 250);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  // Close menus on window click
  useEffect(() => {
    const handleOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, []);

  const openAdd = () => {
    setForm({
      ...emptyForm,
      role: isManager ? "SALES_EXECUTIVE" : roleOptions[0] || "SALES_EXECUTIVE",
    });
    setFormError("");
    setTeamSearch("");
    setSelectedSalesExecutiveIds([]);
    setShowPassword(false);
    setAddModal(true);
  };

  const openEdit = (emp: User) => {
    setForm({
      name: emp.name,
      email: emp.email,
      password: "",
      confirmPassword: "",
      role: emp.role,
      phone: emp.phone || "",
      department: emp.department || "Sales",
      status: emp.status || "ACTIVE",
    });
    setFormError("");
    setTeamSearch("");
    setSelectedSalesExecutiveIds(
      emp.role === "MANAGER"
        ? employees
            .filter(
              (candidate) =>
                candidate.role === "SALES_EXECUTIVE" &&
                candidate.managerId === emp.id,
            )
            .map((candidate) => candidate.id)
        : [],
    );
    setShowPassword(false);
    setEditEmployee(emp);
  };

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Full name and email address are required.");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setFormError("Password is required and must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await employeeService.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: isManager ? "SALES_EXECUTIVE" : form.role,
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || "Sales",
        status: form.status,
        salesExecutiveIds:
          form.role === "MANAGER" ? selectedSalesExecutiveIds : undefined,
      });
      setAddModal(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editEmployee) return;
    if (!form.name.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload: any = {
        name: form.name.trim(),
        role: isManager ? "SALES_EXECUTIVE" : form.role,
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || "Sales",
        status: form.status,
      };
      if (form.password) payload.password = form.password;

      await employeeService.update(editEmployee.id, payload);
      if (form.role === "MANAGER") {
        await employeeService.updateTeam(
          editEmployee.id,
          selectedSalesExecutiveIds,
        );
      }
      setEditEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err?.message || "Failed to update employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await employeeService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete employee.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered employees for local status
  const displayedEmployees = employees.filter((emp) => {
    if (statusFilter && emp.status !== statusFilter) return false;
    return true;
  });

  const teamCandidates = employees.filter(
    (emp) =>
      emp.role === "SALES_EXECUTIVE" &&
      `${emp.name} ${emp.email}`
        .toLowerCase()
        .includes(teamSearch.toLowerCase()),
  );
  const showTeamAssignment =
    isAdmin &&
    form.role === "MANAGER" &&
    (!editEmployee || editEmployee.role === "MANAGER");
  const allVisibleTeamCandidatesSelected =
    teamCandidates.length > 0 &&
    teamCandidates.every((candidate) =>
      selectedSalesExecutiveIds.includes(candidate.id),
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Employees
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage users, roles and team access across your CRM workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmployees}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          {canAdd && (
            <Button
              size="sm"
              onClick={openAdd}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name, email, department..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Role Filter — only show applicable roles based on requester */}
        {isAdmin && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-44"
          >
            <option value="">All Roles</option>
            <option value="MANAGER">Manager</option>
            <option value="SALES_EXECUTIVE">Sales Executive</option>
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-40"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Workload
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {error ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-red-400">
                      <AlertTriangle className="w-8 h-8 opacity-60" />
                      <p className="text-sm">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchEmployees}
                        className="mt-1"
                      >
                        Try again
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/40">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-5 bg-slate-800/60 rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">
                        No team members found
                      </p>
                      <p className="text-xs text-slate-600">
                        {canAdd
                          ? "Add a new employee to start building your sales team."
                          : "No permitted employees found under your account."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((emp) => {
                  const canManage = canManageTarget(user?.role, emp);
                  const isMenuOpen = activeMenuId === emp.id;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                            {emp.avatar ? (
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                className="w-full h-full object-cover rounded-xl"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              emp.name[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-200 font-semibold truncate">
                              {emp.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              {emp.email}
                              {emp.phone && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  {emp.phone}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={roleBadgeVariant(emp.role)} size="sm">
                          {ROLE_LABELS[emp.role] || emp.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {emp.department || "Sales"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={statusBadgeVariant(emp.status)}
                          size="sm"
                        >
                          {(emp.status || "ACTIVE").replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-300 text-xs">
                        <div className="flex items-center gap-3">
                          <span
                            title="Assigned Customers"
                            className="flex items-center gap-1 text-slate-400"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            {emp._count?.assignedCustomers ?? 0}
                          </span>
                          <span
                            title="Assigned Leads"
                            className="flex items-center gap-1 text-slate-400"
                          >
                            <Target className="w-3.5 h-3.5 text-cyan-400" />
                            {emp._count?.assignedLeads ?? 0}
                          </span>
                          <span
                            title="Assigned Deals"
                            className="flex items-center gap-1 text-slate-400"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            {emp._count?.assignedDeals ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {emp.createdAt
                          ? format(new Date(emp.createdAt), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : emp.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Compact Action Menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-36 glass-dropdown rounded-xl shadow-xl z-20 py-1 border border-slate-700/80 text-left"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setViewTarget(emp);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                View Details
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEdit(emp);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteError("");
                                      setDeleteTarget(emp);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD / EDIT MODAL (KEYBOARD FRIENDLY & SPACIOUS) ================= */}
      <Modal
        isOpen={addModal || !!editEmployee}
        onClose={() => {
          setAddModal(false);
          setEditEmployee(null);
        }}
        title={
          editEmployee
            ? `Edit Employee — ${editEmployee.name}`
            : "Add New Employee"
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setAddModal(false);
                setEditEmployee(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={editEmployee ? handleUpdate : handleAdd}
              isLoading={saving}
            >
              {editEmployee ? "Save Changes" : "Create Employee"}
            </Button>
          </>
        }
      >
        <form
          onSubmit={editEmployee ? handleUpdate : handleAdd}
          className="space-y-6"
          noValidate
        >
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Personal Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Personal Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  tabIndex={1}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  tabIndex={2}
                  disabled={!!editEmployee}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="sarah@company.com"
                  className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  tabIndex={3}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Account & Role Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Account & Role
            </h4>

            {/* Segmented / Radio role selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Assigned Role <span className="text-red-400">*</span>
              </label>

              {isManager ? (
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-cyan-400 font-medium flex items-center gap-2">
                  <Badge variant="cyan" size="sm">
                    Sales Executive
                  </Badge>
                  <span className="text-xs text-slate-400">
                    (Managers can only create and manage Sales Executives)
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((r) => {
                    const isSelected = form.role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, role: r })}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10"
                            : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <span>{ROLE_LABELS[r]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Department
                </label>
                <input
                  type="text"
                  tabIndex={4}
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder="Sales / Enterprise"
                  className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Account Status
                </label>
                <select
                  tabIndex={5}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            {showTeamAssignment && (
              <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Assign Sales Executives
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Select existing Sales Executive accounts for this Manager.
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-cyan-300">
                    {selectedSalesExecutiveIds.length} selected
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="search"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Search Sales Executives"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 border-b border-slate-800 pb-2 text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={allVisibleTeamCandidatesSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSalesExecutiveIds((current) => [
                          ...new Set([
                            ...current,
                            ...teamCandidates.map((candidate) => candidate.id),
                          ]),
                        ]);
                      } else {
                        const visibleIds = new Set(
                          teamCandidates.map((candidate) => candidate.id),
                        );
                        setSelectedSalesExecutiveIds((current) =>
                          current.filter((id) => !visibleIds.has(id)),
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  Select All
                </label>
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {teamCandidates.length === 0 ? (
                    <p className="py-3 text-xs text-slate-500">
                      No Sales Executives match this search.
                    </p>
                  ) : (
                    teamCandidates.map((candidate) => (
                      <label
                        key={candidate.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800/70"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSalesExecutiveIds.includes(
                            candidate.id,
                          )}
                          onChange={(e) =>
                            setSelectedSalesExecutiveIds((current) =>
                              e.target.checked
                                ? [...new Set([...current, candidate.id])]
                                : current.filter((id) => id !== candidate.id),
                            )
                          }
                          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {candidate.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {candidate.email}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  {editEmployee ? "New Password (optional)" : "Password *"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    tabIndex={6}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder={
                      editEmployee ? "Leave blank to keep" : "Min. 6 characters"
                    }
                    className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  {editEmployee ? "Confirm New Password" : "Confirm Password *"}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  tabIndex={7}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  placeholder="Repeat password"
                  className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ================= VIEW DETAILS MODAL ================= */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="Employee Details"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setViewTarget(null)}>
            Close
          </Button>
        }
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl border border-slate-700">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-lg font-bold text-white shrink-0">
                {viewTarget.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-base truncate">
                  {viewTarget.name}
                </h3>
                <p className="text-xs text-slate-400">{viewTarget.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={roleBadgeVariant(viewTarget.role)} size="sm">
                    {ROLE_LABELS[viewTarget.role]}
                  </Badge>
                  <Badge
                    variant={statusBadgeVariant(viewTarget.status)}
                    size="sm"
                  >
                    {viewTarget.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Department</span>
                <span className="font-medium text-slate-200">
                  {viewTarget.department || "Sales"}
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Phone</span>
                <span className="font-medium text-slate-200">
                  {viewTarget.phone || "—"}
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">
                  Customers Assigned
                </span>
                <span className="font-semibold text-blue-400">
                  {viewTarget._count?.assignedCustomers ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">
                  Deals Assigned
                </span>
                <span className="font-semibold text-emerald-400">
                  {viewTarget._count?.assignedDeals ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Employee"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleting}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {deleteError}
            </div>
          )}
          <p className="text-slate-300 text-sm">
            Are you sure you want to delete{" "}
            <strong className="text-white">{deleteTarget?.name}</strong>? All
            associated records will remain but their user access will be
            revoked.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
