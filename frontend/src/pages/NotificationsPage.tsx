import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Loader2,
  Inbox,
} from "lucide-react";
import { notificationService } from "../services/api.js";
import { NotificationItem, NotificationType } from "../types/index.js";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../components/ui/Button.js";

const typeIcon: Record<NotificationType, { icon: string; bg: string }> = {
  CUSTOMER: { icon: "👥", bg: "bg-blue-500/10 text-blue-400" },
  TASK: { icon: "✅", bg: "bg-purple-500/10 text-purple-400" },
  DEAL: { icon: "💰", bg: "bg-emerald-500/10 text-emerald-400" },
  MEETING: { icon: "📅", bg: "bg-amber-500/10 text-amber-400" },
  SYSTEM: { icon: "🔔", bg: "bg-slate-500/10 text-slate-400" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await notificationService.getAll();
      const data = res.data.data;
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      setError(
        err?.message || "Unable to load notifications. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const wasUnread = notifications.find((n) => n.id === id && !n.isRead);
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      setDeleting(null);
    } finally {
      setDeleting(null);
    }
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-blue-600 text-white rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Your alerts, updates and reminders
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            Mark all read
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading notifications
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-20 px-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            All caught up!
          </h3>
          <p className="text-slate-400 text-sm">
            No notifications at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unread */}
          {unread.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Unread · {unread.length}
              </p>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800/60">
                <AnimatePresence>
                  {unread.map((n, i) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      index={i}
                      onMarkRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      deleting={deleting === n.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Read */}
          {read.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Earlier · {read.length}
              </p>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 opacity-75">
                <AnimatePresence>
                  {read.map((n, i) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      index={i}
                      onMarkRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      deleting={deleting === n.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  n: NotificationItem;
  index: number;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function NotifRow({ n, index, onMarkRead, onDelete, deleting }: RowProps) {
  const meta = typeIcon[n.type] || typeIcon.SYSTEM;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ delay: index * 0.04 }}
      className={`flex items-start gap-4 p-4 ${!n.isRead ? "bg-blue-500/5" : ""}`}
    >
      {/* Unread indicator */}
      <div className="pt-1.5 shrink-0">
        {!n.isRead ? (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${meta.bg}`}
      >
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${n.isRead ? "text-slate-400" : "text-slate-200"}`}
        >
          {n.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
          {n.message}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!n.isRead && (
          <button
            onClick={() => onMarkRead(n.id)}
            className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(n.id)}
          disabled={deleting}
          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
          title="Remove"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
