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
  type LucideIcon,
} from "lucide-react";
import type { Role } from "../types/index.js";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const item = (to: string, label: string, icon: LucideIcon): NavItem => ({
  to,
  label,
  icon,
});

// One sidebar per role. This is the single source of truth: the Sidebar
// renders it and RoleGuard uses the same list to block direct URL access.
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    item("/dashboard", "Dashboard", LayoutDashboard),
    item("/customers", "Customers", Users),
    item("/leads", "Leads Pipeline", Target),
    item("/sales", "Sales & Deals", TrendingUp),
    item("/tasks", "Tasks", CheckSquare),
    item("/calendar", "Calendar", Calendar),
    item("/employees", "Employees", UserCog),
    item("/reports", "Reports", BarChart3),
    item("/notifications", "Notifications", Bell),
    item("/settings", "Settings", Settings),
  ],
  MANAGER: [
    item("/dashboard", "Dashboard", LayoutDashboard),
    item("/customers", "Customers", Users),
    item("/leads", "Leads", Target),
    item("/sales", "Sales", TrendingUp),
    item("/tasks", "Tasks", CheckSquare),
    item("/calendar", "Calendar", Calendar),
    item("/employees", "Employees", UserCog),
    item("/reports", "Reports", BarChart3),
    item("/notifications", "Notifications", Bell),
  ],
  SALES_EXECUTIVE: [
    item("/dashboard", "My Dashboard", LayoutDashboard),
    item("/customers", "My Customers", Users),
    item("/leads", "My Leads", Target),
    item("/sales", "My Deals", TrendingUp),
    item("/tasks", "My Tasks", CheckSquare),
    item("/calendar", "Calendar", Calendar),
    item("/notifications", "Notifications", Bell),
  ],
  VIEWER: [
    item("/dashboard", "Dashboard", LayoutDashboard),
    item("/customers", "Customers", Users),
    item("/reports", "Reports", BarChart3),
    item("/notifications", "Notifications", Bell),
  ],
};

// Every signed-in user can open their own profile (password, avatar, etc.).
const ALWAYS_ALLOWED = ["/profile"];

export const getNavItems = (role?: Role | null): NavItem[] =>
  role ? (NAV_BY_ROLE[role] ?? []) : [];

export const canAccess = (role: Role | null | undefined, pathname: string) => {
  if (!role) return false;
  const allowed = [...ALWAYS_ALLOWED, ...getNavItems(role).map((n) => n.to)];
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};
