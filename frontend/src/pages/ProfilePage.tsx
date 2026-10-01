import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  Mail,
  Phone,
  Building,
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Shield,
} from "lucide-react";
import { profileService } from "../services/api.js";
import { useAuth } from "../context/AuthContext.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { formatDistanceToNow } from "date-fns";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile Edit Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    department: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change Form State
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await profileService.get();
        const data = res.data.data;
        setProfile(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          department: data.department || "Sales",
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    setError("");
    setSuccess("");
    try {
      await profileService.update({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || undefined,
      });
      setSuccess("Profile updated successfully!");
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwError("All password fields are required.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    setSavingPw(true);
    setPwError("");
    setPwSuccess("");
    try {
      await profileService.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess("Password changed successfully!");
      setPwForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setPwError(err?.message || "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-blue-400" />
          My Profile
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage your personal information, department details, and account
          security.
        </p>
      </div>

      {/* User Summary Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20 shrink-0">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            profile?.name?.[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-lg font-bold text-white truncate">
              {profile?.name}
            </h2>
            <Badge variant="blue" size="sm">
              {profile?.role?.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            {profile?.email}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-500">
            <span>
              Department:{" "}
              <strong className="text-slate-300 font-medium">
                {profile?.department || "Sales"}
              </strong>
            </span>
            <span>
              Status:{" "}
              <strong className="text-emerald-400 font-medium">
                {profile?.status || "ACTIVE"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form & Password Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info Edit */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-blue-400" />
            Personal Details
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Update your display information.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Email Address (Cannot be changed)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="w-full bg-slate-800/40 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Department
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                placeholder="Sales / Enterprise"
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            <Button
              type="submit"
              isLoading={savingProfile}
              className="w-full mt-2"
            >
              Save Profile
            </Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Security & Password
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Change your CRM access password.
          </p>

          {pwError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {pwSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                New Password *
              </label>
              <input
                type="password"
                required
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, newPassword: e.target.value })
                }
                placeholder="Min. 8 characters"
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={pwForm.confirmPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, confirmPassword: e.target.value })
                }
                placeholder="Repeat new password"
                className="w-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              isLoading={savingPw}
              className="w-full mt-2"
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>

      {/* Recent Activities */}
      {profile?.activities && profile.activities.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            My Recent Activity
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Audit log of your recent CRM actions.
          </p>
          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {profile.activities.map((act: any) => (
              <div
                key={act.id}
                className="p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-300">
                    {act.action}
                  </span>
                  <p className="text-slate-400 mt-0.5">{act.details}</p>
                </div>
                <span className="text-slate-500 text-[11px] shrink-0">
                  {formatDistanceToNow(new Date(act.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
