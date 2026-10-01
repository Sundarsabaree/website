import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
  X,
  Plus,
  Users,
  Target,
  TrendingUp,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.js";
import { useTheme } from "../../context/ThemeContext.js";
import { useNotifications } from "../../context/NotificationContext.js";
import { format } from "date-fns";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/leads": "Lead Pipeline",
  "/sales": "Sales & Deals",
  "/tasks": "Task Management",
  "/calendar": "Calendar",
  "/employees": "Employees",
  "/reports": "Reports & Analytics",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "My Profile",
};

export const Topbar: React.FC = () => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  const pageTitle = pageTitles[location.pathname] || "Smart CRM";

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (
        quickCreateRef.current &&
        !quickCreateRef.current.contains(e.target as Node)
      ) {
        setQuickCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const notifTypeIcon: Record<string, string> = {
    CUSTOMER: "👥",
    TASK: "✅",
    DEAL: "💰",
    MEETING: "📅",
    SYSTEM: "🔔",
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="h-16 glass-nav flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-20 shrink-0 border-b border-slate-800/80">
      {/* Page Title & Breadcrumb */}
      <div className="flex-1 min-w-0 pr-2">
        <h1 className="text-base sm:text-lg font-heading font-bold text-white truncate">
          {pageTitle}
        </h1>
        <p className="text-[11px] text-slate-500 hidden sm:block">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Prominent Global Search Bar */}
      <form
        onSubmit={handleSearch}
        className="relative hidden md:block w-72 lg:w-96"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search CRM (Customers, leads, deals)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Quick Create Button */}
      <div className="relative" ref={quickCreateRef}>
        <button
          onClick={() => {
            setQuickCreateOpen(!quickCreateOpen);
            setNotifOpen(false);
            setProfileOpen(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
          title="Quick Create"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>

        <AnimatePresence>
          {quickCreateOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 glass-dropdown rounded-2xl overflow-hidden z-50 p-1.5"
            >
              <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Create
              </div>
              <button
                onClick={() => {
                  navigate("/customers");
                  setQuickCreateOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <Users className="w-4 h-4 text-blue-400" />
                New Customer
              </button>
              <button
                onClick={() => {
                  navigate("/leads");
                  setQuickCreateOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <Target className="w-4 h-4 text-cyan-400" />
                New Lead
              </button>
              <button
                onClick={() => {
                  navigate("/sales");
                  setQuickCreateOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                New Deal
              </button>
              <button
                onClick={() => {
                  navigate("/tasks");
                  setQuickCreateOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <CheckSquare className="w-4 h-4 text-purple-400" />
                New Task
              </button>
              <button
                onClick={() => {
                  navigate("/calendar");
                  setQuickCreateOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                Schedule Meeting
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          <Sun className="w-[18px] h-[18px]" />
        ) : (
          <Moon className="w-[18px] h-[18px]" />
        )}
      </button>

      {/* Notifications dropdown */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setNotifOpen(!notifOpen);
            setProfileOpen(false);
            setQuickCreateOpen(false);
          }}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 glass-dropdown rounded-2xl overflow-hidden z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
                <h3 className="font-semibold text-sm text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 hover:bg-slate-800/40 cursor-pointer transition-colors ${!n.isRead ? "bg-blue-500/5" : ""}`}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                        setNotifOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base shrink-0 mt-0.5">
                          {notifTypeIcon[n.type] || "🔔"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${n.isRead ? "text-slate-400" : "text-slate-200"}`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2.5 border-t border-slate-700/60 bg-slate-950/40 text-center">
                <button
                  onClick={() => {
                    navigate("/notifications");
                    setNotifOpen(false);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Profile Card */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setProfileOpen(!profileOpen);
            setNotifOpen(false);
            setQuickCreateOpen(false);
          }}
          className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-800/80 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
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
              <span className="text-white text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden sm:block text-left min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
              {user?.name}
            </p>
            <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 glass-dropdown rounded-2xl overflow-hidden z-50 shadow-2xl p-1"
            >
              <div className="px-3.5 py-3 border-b border-slate-800">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {user?.role?.replace("_", " ")}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Topbar;
