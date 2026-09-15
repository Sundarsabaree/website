import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
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
  "/employees": "Employee Management",
  "/reports": "Reports & Analytics",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "My Profile",
};

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="h-16 glass-nav flex items-center px-6 gap-4 sticky top-0 z-10 shrink-0">
      {/* Page Title */}
      <div className="flex-1">
        <h1 className="text-lg font-heading font-bold text-white">
          {pageTitle}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 overflow-hidden"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(
                      `/customers?search=${encodeURIComponent(searchQuery)}`,
                    );
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <Search className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </motion.button>
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

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setNotifOpen(!notifOpen);
            setProfileOpen(false);
          }}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg">
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
              className="absolute right-0 top-full mt-2 w-80 glass-dropdown rounded-2xl overflow-hidden z-50"
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
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors ${!n.isRead ? "bg-blue-500/5" : ""}`}
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
                            className={`text-sm font-medium truncate ${n.isRead ? "text-slate-400" : "text-slate-200"}`}
                          >
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
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
              <div className="p-3 border-t border-slate-700/60">
                <button
                  onClick={() => {
                    navigate("/notifications");
                    setNotifOpen(false);
                  }}
                  className="w-full py-2 text-xs text-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setProfileOpen(!profileOpen);
            setNotifOpen(false);
          }}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-800 transition-all group"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
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
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-200 leading-none">
              {user?.name?.split(" ")[0]}
            </p>
            <p className="text-[11px] text-slate-500 capitalize mt-0.5">
              {user?.role?.toLowerCase().replace("_", " ")}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 glass-dropdown rounded-2xl overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-slate-700/60">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all text-sm"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all text-sm"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-slate-700/60 my-1" />
                <button
                  onClick={logout}
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
    </header>
  );
};
