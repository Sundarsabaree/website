import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  Building,
  Users,
  Bell,
  Moon,
  Sun,
  Key,
  Globe,
  CheckCircle2,
  Lock,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";

export default function SettingsPage() {
  const { user, isAdmin, isManager, isSales } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [savedNote, setSavedNote] = useState("");
  const [dealAlerts, setDealAlerts] = useState(true);
  const [taskDigest, setTaskDigest] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("smartcrm_notification_preferences") || "{}",
      ) as { dealAlerts?: boolean; taskDigest?: boolean };
      if (typeof saved.dealAlerts === "boolean")
        setDealAlerts(saved.dealAlerts);
      if (typeof saved.taskDigest === "boolean")
        setTaskDigest(saved.taskDigest);
    } catch {
      // Ignore malformed local preferences and use the defaults.
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem(
      "smartcrm_notification_preferences",
      JSON.stringify({ dealAlerts, taskDigest }),
    );
    setSavedNote("Preferences saved successfully.");
    setTimeout(() => setSavedNote(""), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-400" />
          Settings & Preferences
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Configure your workspace preferences and account configuration.
        </p>
      </div>

      {savedNote && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNote}</span>
        </div>
      )}

      {/* Role Summary Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Active Role:
          </span>
          <Badge
            variant={isAdmin ? "purple" : isManager ? "blue" : "cyan"}
            size="sm"
          >
            {user?.role?.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* ADMIN EXCLUSIVE: Organization & User Management Settings */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-400" />
              Organization Configuration (Admin Only)
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              CRM enterprise parameters and company-level defaults.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80">
                <span className="text-slate-400 block mb-1">Company Name</span>
                <span className="font-semibold text-white text-sm">
                  Smart CRM Enterprise
                </span>
              </div>
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80">
                <span className="text-slate-400 block mb-1">
                  Default Currency
                </span>
                <span className="font-semibold text-emerald-400 text-sm">
                  INR (₹) - Indian Rupee
                </span>
              </div>
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80">
                <span className="text-slate-400 block mb-1">Timezone</span>
                <span className="font-semibold text-white text-sm">
                  Asia/Kolkata (IST +05:30)
                </span>
              </div>
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80">
                <span className="text-slate-400 block mb-1">
                  Authentication Mode
                </span>
                <span className="font-semibold text-blue-400 text-sm">
                  JWT with Refresh Rotation
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Manage all CRM team accounts and permissions
              </span>
              <Link
                to="/employees"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                Go to Employees Management
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Security & Access Control (Admin Only)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enforced backend role-based access security policies.
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>API-level Role Enforcement</span>
                <span className="text-emerald-400 font-semibold">
                  Active (Strict)
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Sales Executive Customer Scoping</span>
                <span className="text-emerald-400 font-semibold">
                  Assigned Only
                </span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>Manager Employee Management</span>
                <span className="text-emerald-400 font-semibold">
                  Sales Executives Only
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER EXCLUSIVE SETTINGS */}
      {isManager && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Team Management (Manager)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Manage your team's Sales Executive accounts and review performance.
          </p>
          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">
                Sales Executive Management
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Create and manage accounts for Sales Executives reporting to
                you.
              </p>
            </div>
            <Link to="/employees">
              <Button size="sm">Manage Team</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ALL USERS: Appearance & Preferences */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-cyan-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            Appearance Settings
          </h3>
          <p className="text-xs text-slate-400">
            Customize visual theme preferences for your workspace.
          </p>
          <div className="mt-4 flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700">
            <div>
              <p className="text-xs font-semibold text-white">Dark Theme</p>
              <p className="text-[11px] text-slate-400">
                Enterprise dark mode with high contrast
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <h3 className="text-base font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            Notifications & System Alerts
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Control which CRM alerts and email digests you receive.
          </p>
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/60 transition-colors">
              <input
                type="checkbox"
                checked={dealAlerts}
                onChange={(e) => setDealAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Deal & Lead Updates
                </span>
                <span className="text-[11px] text-slate-400">
                  Instant in-app alerts when deals change stage or leads are
                  assigned
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/60 transition-colors">
              <input
                type="checkbox"
                checked={taskDigest}
                onChange={(e) => setTaskDigest(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Task Due Date Reminders
                </span>
                <span className="text-[11px] text-slate-400">
                  Reminders for upcoming task deadlines and meetings
                </span>
              </div>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
            <Button size="sm" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </div>
        </div>

        {/* Quick Link to Profile */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">
              Personal Profile & Password
            </p>
            <p className="text-[11px] text-slate-400">
              Update your name, phone, department, or change password
            </p>
          </div>
          <Link to="/profile">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
