import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Inbox,
  AlertTriangle,
  Video,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  calendarService,
  customerService,
  employeeService,
} from "../services/api.js";
import { MeetingType, User } from "../types/index.js";
import { Button } from "../components/ui/Button.js";
import { Badge } from "../components/ui/Badge.js";
import { Modal } from "../components/ui/Modal.js";
import { Input, Select, TextArea } from "../components/ui/Input.js";
import { useAuth } from "../context/AuthContext.js";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

interface CalendarEvent {
  id: string;
  originalId: string;
  eventType: "MEETING" | "TASK_DEADLINE" | "FOLLOW_UP";
  title: string;
  description?: string | null;
  start: string;
  end?: string | null;
  location?: string | null;
  type?: MeetingType;
  status?: string;
  host?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
  color: string;
}

const typeIcon: Record<string, React.ElementType> = {
  ONLINE: Video,
  IN_PERSON: MapPin,
  PHONE: Phone,
};

const emptyForm = {
  title: "",
  description: "",
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "10:00",
  endTime: "11:00",
  location: "",
  type: "ONLINE" as MeetingType,
  customerId: "",
  hostId: "",
};

export const CalendarPage: React.FC = () => {
  const { isAdmin, isManager } = useAuth();
  const canWrite = true;

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [employees, setEmployees] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const rangeStart = weekStart;
  const rangeEnd = addDays(weekStart, 6);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await calendarService.getEvents({
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      });
      const items: CalendarEvent[] = (res.data.data || []).filter(
        (e: CalendarEvent) => !!e.start,
      );
      items.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
      setEvents(items);
    } catch (err: any) {
      setError(err?.message || "Failed to load calendar events.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const openAdd = () => {
    setForm({ ...emptyForm });
    setFormError("");
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    if (ev.eventType !== "MEETING") return;
    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : start;
    setEditTarget(ev);
    setForm({
      title: ev.title,
      description: ev.description || "",
      date: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      endTime: format(end, "HH:mm"),
      location: ev.location || "",
      type: ev.type || "ONLINE",
      customerId: ev.customer?.id || "",
      hostId: ev.host?.id || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
      setFormError("Title, date and start/end time are required.");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      const startTime = new Date(`${form.date}T${form.startTime}:00`);
      const endTime = new Date(`${form.date}T${form.endTime}:00`);
      const payload = {
        title: form.title,
        description: form.description || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: form.location || undefined,
        type: form.type,
        customerId: form.customerId || undefined,
        hostId: form.hostId || undefined,
      };
      if (editTarget) {
        await calendarService.updateMeeting(editTarget.originalId, payload);
      } else {
        await calendarService.createMeeting(payload);
      }
      closeForm();
      await fetchEvents();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save meeting.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await calendarService.deleteMeeting(deleteTarget.originalId);
      setDeleteTarget(null);
      await fetchEvents();
    } catch (err: any) {
      setError(err?.message || "Failed to delete meeting.");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Calendar</h1>
          <p className="text-slate-400 text-sm">
            Meetings, task deadlines and lead follow-ups in one place.
          </p>
        </div>
        {canWrite && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            Schedule Meeting
          </Button>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
        <button
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold">
          {format(rangeStart, "d MMM")} – {format(rangeEnd, "d MMM yyyy")}
        </p>
        <button
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading calendar
        </div>
      ) : events.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-16 px-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
            <Inbox size={22} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Nothing scheduled</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Meetings, task deadlines and lead follow-ups for this week will show
            up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const dayEvents = events.filter((e) =>
              isSameDay(new Date(e.start), day),
            );
            if (dayEvents.length === 0) return null;
            return (
              <div key={day.toISOString()}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {format(day, "EEEE, d MMMM")}
                </p>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                  {dayEvents.map((ev) => {
                    const Icon =
                      ev.eventType === "MEETING" && ev.type
                        ? typeIcon[ev.type] || Video
                        : Clock;
                    return (
                      <div key={ev.id} className="flex items-start gap-4 p-4">
                        <div
                          className="w-1 self-stretch rounded-full shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <div className="w-16 shrink-0 text-xs text-slate-400 pt-0.5">
                          {format(new Date(ev.start), "h:mm a")}
                        </div>
                        <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{ev.title}</p>
                            <Badge size="sm" variant="slate">
                              {ev.eventType.replace("_", " ")}
                            </Badge>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {ev.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {ev.host?.name && <span>With {ev.host.name}</span>}
                            {ev.customer?.name && (
                              <span>Customer: {ev.customer.name}</span>
                            )}
                            {ev.location && <span>{ev.location}</span>}
                          </div>
                        </div>
                        {canWrite && ev.eventType === "MEETING" && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(ev)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(ev)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editTarget ? "Edit Meeting" : "Schedule Meeting"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editTarget ? "Save Changes" : "Schedule"}
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
            label="Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date *"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label="Start *"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <Input
              label="End *"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Meeting Type"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as MeetingType })
              }
              options={[
                { value: "ONLINE", label: "Online" },
                { value: "IN_PERSON", label: "In Person" },
                { value: "PHONE", label: "Phone" },
              ]}
            />
            <Input
              label="Location / Link"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <Select
            label="Related Customer"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            options={[
              { value: "", label: "None" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {(isAdmin || isManager) && employees.length > 0 && (
            <Select
              label="Host"
              value={form.hostId}
              onChange={(e) => setForm({ ...form, hostId: e.target.value })}
              options={[
                { value: "", label: "Host it myself" },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
            />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Cancel Meeting"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep it
            </Button>
            <Button variant="danger" isLoading={saving} onClick={handleDelete}>
              Cancel Meeting
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Cancel and delete{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.title}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default CalendarPage;
