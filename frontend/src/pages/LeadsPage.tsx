import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Users,
  Flame,
  BadgeCheck,
  Trophy,
  Inbox,
  Building2,
  Wallet,
  UserRound,
  Clock,
  Loader2,
} from "lucide-react";
import { customerService } from "../services/api.js";

const STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Won",
  "Lost",
] as const;
type Stage = (typeof STAGES)[number];

interface Lead {
  id: string;
  name: string;
  company: string;
  budget: number | null;
  assignedTo: string;
  score: number;
  stage: Stage;
  updatedAt: string | null;
}

const STAGE_DOT: Record<Stage, string> = {
  New: "bg-sky-400",
  Contacted: "bg-indigo-400",
  Qualified: "bg-violet-400",
  Proposal: "bg-amber-400",
  Won: "bg-emerald-400",
  Lost: "bg-rose-400",
};

// ---- helpers: read whatever the existing customer API returns, never assume more ----

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

const pickList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const p = asRecord(payload);
  for (const key of ["data", "customers", "leads", "items"]) {
    const inner = p[key];
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === "object") {
      const nested = pickList(inner);
      if (nested.length) return nested;
    }
  }
  return [];
};

const toStage = (v: unknown): Stage | null => {
  if (typeof v !== "string") return null;
  const match = STAGES.find((s) => s.toLowerCase() === v.trim().toLowerCase());
  return match ?? null;
};

const toLead = (raw: unknown): Lead | null => {
  const r = asRecord(raw);
  const stage = toStage(r.stage) ?? toStage(r.status);
  if (!stage) return null;

  const assigned = r.assignedTo ?? r.employee ?? r.owner;
  const assignedName =
    typeof assigned === "string"
      ? assigned
      : String(asRecord(assigned).name ?? "");
  const budgetRaw = r.budget ?? r.value ?? r.dealValue;
  const scoreRaw = r.leadScore ?? r.score;

  return {
    id: String(r.id ?? `${r.name}-${r.email ?? ""}`),
    name: String(r.name ?? "Unnamed lead"),
    company: String(r.company ?? ""),
    budget:
      budgetRaw != null && !Number.isNaN(Number(budgetRaw))
        ? Number(budgetRaw)
        : null,
    assignedTo: assignedName,
    score:
      scoreRaw != null && !Number.isNaN(Number(scoreRaw))
        ? Number(scoreRaw)
        : 0,
    stage,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
  };
};

const formatBudget = (n: number | null) =>
  n == null
    ? "Not set"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);

const timeAgo = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const scoreBadge = (score: number) => {
  if (score >= 80)
    return {
      label: "Hot",
      cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    };
  if (score >= 50)
    return {
      label: "Warm",
      cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    };
  return { label: "Cold", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
};

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"All" | Stage>("All");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const svc = customerService as unknown as Record<string, unknown>;
        const getAll = svc.getAll;
        if (typeof getAll !== "function") {
          if (active) setLeads([]);
          return;
        }
        const res = await (getAll as () => Promise<unknown>).call(
          customerService,
        );
        const parsed = pickList(res)
          .map(toLead)
          .filter((l): l is Lead => l !== null);
        if (active) setLeads(parsed);
      } catch {
        if (active) setLeads([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "All" && l.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.assignedTo.toLowerCase().includes(q)
      );
    });
  }, [leads, search, stageFilter]);

  const stats = [
    {
      label: "Total Leads",
      value: leads.length,
      icon: Users,
      tint: "text-sky-300 bg-sky-500/10",
    },
    {
      label: "Hot Leads",
      value: leads.filter((l) => l.score >= 80).length,
      icon: Flame,
      tint: "text-rose-300 bg-rose-500/10",
    },
    {
      label: "Qualified",
      value: leads.filter((l) => l.stage === "Qualified").length,
      icon: BadgeCheck,
      tint: "text-violet-300 bg-violet-500/10",
    },
    {
      label: "Converted",
      value: leads.filter((l) => l.stage === "Won").length,
      icon: Trophy,
      tint: "text-emerald-300 bg-emerald-500/10",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-white space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Leads Pipeline</h1>
        <p className="text-slate-400">
          Track every lead from first contact to closed deal.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <div
            key={label}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center ${tint}`}
            >
              <Icon size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-400">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

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
            placeholder="Search by name, company or employee"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as "All" | Stage)}
          className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 sm:w-48"
        >
          <option value="All">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading leads
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl py-16 px-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
            <Inbox size={22} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No leads yet</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Leads will appear here once they are available from your CRM data.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const items = filtered.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                className="min-w-[280px] w-[280px] shrink-0 bg-slate-900/40 border border-slate-800 rounded-2xl p-3"
              >
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${STAGE_DOT[stage]}`}
                    />
                    <h3 className="font-semibold text-sm">{stage}</h3>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      No leads
                    </p>
                  ) : (
                    items.map((lead) => {
                      const badge = scoreBadge(lead.score);
                      return (
                        <motion.div
                          key={lead.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight">
                              {lead.name}
                            </p>
                            <span
                              className={`text-xs border rounded-full px-2 py-0.5 shrink-0 ${badge.cls}`}
                            >
                              {badge.label} · {lead.score}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-400">
                            <p className="flex items-center gap-2">
                              <Building2 size={14} />{" "}
                              {lead.company || "No company"}
                            </p>
                            <p className="flex items-center gap-2">
                              <Wallet size={14} /> {formatBudget(lead.budget)}
                            </p>
                            <p className="flex items-center gap-2">
                              <UserRound size={14} />{" "}
                              {lead.assignedTo || "Unassigned"}
                            </p>
                          </div>

                          <p className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
                            <Clock size={13} /> Updated{" "}
                            {timeAgo(lead.updatedAt)}
                          </p>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
