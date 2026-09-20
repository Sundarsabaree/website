import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Target,
  TrendingUp,
  CheckSquare,
  Calendar,
  UserCog,
  BarChart3,
  Bell,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { useNotifications } from "../../context/NotificationContext.js";
import type { Role } from "../../types/index.js";

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
}

/**
 * Every role gets a distinct sidebar: different item sets, and different
 * labels for Sales Executives ("My X") to reflect that their views are
 * scoped to their own work. Keep this in sync with the route table in
 * App.tsx and with each page's own role-based data scoping.
 */
function getNavItemsForRole(role: Role | undefined): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/customers", icon: Users, label: "Customers" },
        { to: "/leads", icon: Target, label: "Leads Pipeline" },
        { to: "/sales", icon: TrendingUp, label: "Sales & Deals" },
        { to: "/tasks", icon: CheckSquare, label: "Tasks" },
        { to: "/calendar", icon: Calendar, label: "Calendar" },
        { to: "/employees", icon: UserCog, label: "Employees" },
        { to: "/reports", icon: BarChart3, label: "Reports" },
        { to: "/notifications", icon: Bell, label: "Notifications" },
      ];
    case "MANAGER":
      return [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/customers", icon: Users, label: "Customers" },
        { to: "/leads", icon: Target, label: "Leads" },
        { to: "/sales", icon: TrendingUp, label: "Sales" },
        { to: "/tasks", icon: CheckSquare, label: "Tasks" },
        { to: "/calendar", icon: Calendar, label: "Calendar" },
        { to: "/employees", icon: UserCog, label: "Employees" },
        { to: "/reports", icon: BarChart3, label: "Reports" },
        { to: "/notifications", icon: Bell, label: "Notifications" },
      ];
    case "SALES_EXECUTIVE":
      return [
        { to: "/dashboard", icon: LayoutDashboard, label: "My Dashboard" },
        { to: "/customers", icon: Users, label: "My Customers" },
        { to: "/leads", icon: Target, label: "My Leads" },
        { to: "/sales", icon: TrendingUp, label: "My Deals" },
        { to: "/tasks", icon: CheckSquare, label: "My Tasks" },
        { to: "/calendar", icon: Calendar, label: "Calendar" },
        { to: "/notifications", icon: Bell, label: "Notifications" },
      ];
    case "VIEWER":
      return [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/customers", icon: Users, label: "Customers" },
        { to: "/reports", icon: BarChart3, label: "Reports" },
        { to: "/notifications", icon: Bell, label: "Notifications" },
      ];
    default:
      return [];
  }
}

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const visibleItems = getNavItemsForRole(user?.role);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-slate-950 border-r border-slate-800/60 shrink-0 z-20"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="font-heading font-bold text-white text-base leading-tight whitespace-nowrap">
                  Smart CRM
                </p>
                <p className="text-[10px] text-slate-500 whitespace-nowrap">
                  Enterprise Edition
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-30 shadow-md"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isNotif = item.to === "/notifications";

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                  ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative shrink-0">
                      <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                      {isNotif && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                          className={`text-sm font-medium whitespace-nowrap ${isActive ? "text-blue-400" : ""}`}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-slate-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700 shadow-xl z-50">
                        {item.label}
                        {isNotif && unreadCount > 0 && (
                          <span className="ml-1 text-red-400">
                            ({unreadCount})
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Settings: company-wide settings are Admin-only (Manager, Sales
            and Viewer sidebars never show this per the role spec). */}
        {isAdmin && (
          <>
            <div className="my-4 mx-4 border-t border-slate-800/60" />
            <div className="px-2 space-y-0.5">
              <NavLink
                to="/settings"
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                  ${isActive ? "bg-blue-600/15 text-blue-400 border border-blue-500/25" : "text-slate-400 hover:text-white hover:bg-slate-800/60"}
                `}
              >
                {({ isActive }) => (
                  <>
                    <Settings className="w-[18px] h-[18px] shrink-0" />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`text-sm font-medium whitespace-nowrap ${isActive ? "text-blue-400" : ""}`}
                        >
                          Settings
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 text-slate-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700 shadow-xl z-50">
                        Settings
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          </>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-slate-800/60 p-2 shrink-0">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-all group"
          onClick={() => !collapsed && setProfileOpen(!profileOpen)}
        >
          <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate capitalize">
                  {user?.role?.replace("_", " ")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <ChevronDown
              className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${profileOpen ? "rotate-180" : ""}`}
            />
          )}
        </div>

        {/* Profile dropdown when expanded */}
        <AnimatePresence>
          {profileOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};
