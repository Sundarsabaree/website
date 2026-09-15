import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Target,
  DollarSign,
  CheckSquare,
  Calendar,
  Flame,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { StatCard } from "../components/ui/Card.js";
import { dashboardService } from "../services/api.js";
import { DashboardStats, ActivityItem } from "../types/index.js";
import { format, formatDistanceToNow } from "date-fns";

const COLORS = [
  "#2563EB",
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-sm font-semibold text-slate-200 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.name === "sales" || entry.name === "target"
              ? `₹${entry.value.toLocaleString()}`
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const activityIconMap: Record<string, { icon: string; color: string }> = {
  CUSTOMER_CREATED: { icon: "👥", color: "bg-blue-500/15 text-blue-400" },
  DEAL_CLOSED_WON: { icon: "🎉", color: "bg-emerald-500/15 text-emerald-400" },
  LEAD_STAGE_CHANGED: { icon: "🔄", color: "bg-cyan-500/15 text-cyan-400" },
  TASK_COMPLETED: { icon: "✅", color: "bg-purple-500/15 text-purple-400" },
  TASK_ASSIGNED: { icon: "📌", color: "bg-amber-500/15 text-amber-400" },
  MEETING_SCHEDULED: { icon: "📅", color: "bg-indigo-500/15 text-indigo-400" },
  USER_LOGIN: { icon: "🔐", color: "bg-slate-500/15 text-slate-400" },
  DEFAULT: { icon: "📋", color: "bg-slate-500/15 text-slate-400" },
};

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, chartsRes, activitiesRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getCharts(),
          dashboardService.getActivities(),
        ]);
        setStats(statsRes.data.data);
        setCharts(chartsRes.data.data);
        setActivities(activitiesRes.data.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/10 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-bold text-white">
              Good{" "}
              {new Date().getHours() < 12
                ? "Morning"
                : new Date().getHours() < 17
                  ? "Afternoon"
                  : "Evening"}{" "}
              👋
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Here's what's happening with your CRM today —{" "}
              {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers ?? "—"}
          icon={<Users className="w-5 h-5" />}
          change="↑ 12% from last month"
          changeType="positive"
          loading={loading}
          gradient="from-blue-600/10 to-blue-500/5"
        />
        <StatCard
          title="Active Leads"
          value={stats?.activeLeads ?? "—"}
          icon={<Target className="w-5 h-5" />}
          change={`${stats?.hotLeadsCount ?? 0} hot leads 🔥`}
          changeType="positive"
          loading={loading}
          gradient="from-cyan-600/10 to-cyan-500/5"
        />
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.totalRevenue) : "—"}
          icon={<DollarSign className="w-5 h-5" />}
          change={
            stats ? `Pipeline: ${formatCurrency(stats.pipelineValue)}` : ""
          }
          changeType="positive"
          loading={loading}
          gradient="from-emerald-600/10 to-emerald-500/5"
        />
        <StatCard
          title="Closed Deals"
          value={stats?.closedDeals ?? "—"}
          icon={<TrendingUp className="w-5 h-5" />}
          change={`${stats?.pendingTasks ?? 0} tasks pending`}
          changeType="neutral"
          loading={loading}
          gradient="from-purple-600/10 to-purple-500/5"
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Tasks"
          value={stats?.pendingTasks ?? "—"}
          icon={<CheckSquare className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Meetings Today"
          value={stats?.meetingsToday ?? "—"}
          icon={<Calendar className="w-5 h-5" />}
          change="Scheduled for today"
          changeType="neutral"
          loading={loading}
        />
        <StatCard
          title="Hot Leads"
          value={stats?.hotLeadsCount ?? "—"}
          icon={<Flame className="w-5 h-5" />}
          change="Budget > ₹70,000"
          changeType="positive"
          loading={loading}
        />
        <div className="bg-gradient-to-br from-emerald-600/15 to-cyan-600/10 border border-emerald-500/25 rounded-2xl p-6">
          <p className="text-sm text-slate-400 font-medium mb-2">
            Forecast Revenue
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold font-heading text-white">
              {stats ? formatCurrency(stats.pipelineValue * 0.75) : "—"}
            </p>
          )}
          <p className="text-xs text-emerald-400 mt-1">
            Based on pipeline probability
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-bold text-white">Sales Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revenue vs Target — Last 6 months
              </p>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4%</span>
            </div>
          </div>
          {loading ? (
            <div className="h-52 bg-slate-800 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart
                data={charts?.monthlyTrend || []}
                margin={{ top: 5, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E293B"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#salesGrad)"
                  name="sales"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#targetGrad)"
                  name="target"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Lead Funnel */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="font-heading font-bold text-white mb-1">
            Lead Pipeline
          </h3>
          <p className="text-xs text-slate-500 mb-6">Leads by stage</p>
          {loading ? (
            <div className="h-52 bg-slate-800 rounded-xl animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={
                      charts?.leadConversionChart?.filter(
                        (d: any) => d.count > 0,
                      ) || []
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="stage"
                  >
                    {(charts?.leadConversionChart || []).map(
                      (_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ),
                    )}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {(charts?.leadConversionChart || [])
                  .filter((d: any) => d.count > 0)
                  .slice(0, 5)
                  .map((item: any, i: number) => (
                    <div
                      key={item.stage}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-xs text-slate-400 capitalize">
                          {item.stage.toLowerCase()}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-300">
                        {item.count}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deal Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Deal Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="font-heading font-bold text-white mb-1">
            Deal Pipeline
          </h3>
          <p className="text-xs text-slate-500 mb-5">By stage (deal count)</p>
          {loading ? (
            <div className="h-48 bg-slate-800 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={charts?.dealDistribution || []}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E293B"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip formatter={(v) => [v, "Deals"]} />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-bold text-white">
              Recent Activity
            </h3>
            <span className="text-xs text-slate-500">
              {activities.length} events
            </span>
          </div>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-800 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-800 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                No recent activity
              </p>
            ) : (
              activities.map((activity, idx) => {
                const meta =
                  activityIconMap[activity.action] || activityIconMap.DEFAULT;
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${meta.color}`}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-1">
                        {activity.details}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {activity.user?.name && (
                          <span className="text-xs text-slate-500">
                            {activity.user.name} ·
                          </span>
                        )}
                        <span className="text-xs text-slate-600">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
