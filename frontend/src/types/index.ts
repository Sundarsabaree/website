// Shared frontend types. These mirror backend/prisma/schema.prisma —
// keep both in sync when the schema changes.

export type Role = "ADMIN" | "MANAGER" | "SALES_EXECUTIVE" | "VIEWER";

export type CustomerStatus = "ACTIVE" | "INACTIVE" | "PROSPECT";

export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type DealStage =
  | "DISCOVERY"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type MeetingType = "ONLINE" | "IN_PERSON" | "PHONE";

export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type NotificationType =
  | "CUSTOMER"
  | "TASK"
  | "DEAL"
  | "MEETING"
  | "SYSTEM";

/** Minimal user reference embedded in other records (e.g. Customer.assignedTo). */
export interface UserRef {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  phone?: string | null;
  department?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  budget: number;
  interest?: string | null;
  leadScore?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  status: CustomerStatus;
  notes?: string | null;
  assignedToId?: string | null;
  assignedTo?: UserRef | null;
  createdById?: string | null;
  createdBy?: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  title: string;
  contactName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  value: number;
  stage: LeadStage;
  priority: Priority;
  notes?: string | null;
  followUpDate?: string | null;
  assignedToId?: string | null;
  assignedTo?: UserRef | null;
  customerId?: string | null;
  customer?: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  closingDate?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  assignedToId?: string | null;
  assignedTo?: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: Priority;
  status: TaskStatus;
  assignedToId?: string | null;
  assignedTo?: UserRef | null;
  createdById?: string | null;
  createdBy?: UserRef | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  type: MeetingType;
  status: MeetingStatus;
  hostId?: string | null;
  host?: UserRef | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  userId?: string | null;
  user?: UserRef | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details: string;
  createdAt: string;
}

/** Shape returned by GET /dashboard/stats. */
export interface DashboardStats {
  totalCustomers: number;
  activeLeads: number;
  hotLeadsCount: number;
  totalRevenue: number;
  pipelineValue: number;
  closedDeals: number;
  pendingTasks: number;
  meetingsToday: number;
}

/** Live per-employee performance figures, shown on Employees and Reports pages. */
export interface EmployeePerformance {
  userId: string;
  customersAssigned: number;
  customersConverted: number;
  dealsClosed: number;
  revenueGenerated: number;
  tasksCompleted: number;
  overdueTasks: number;
  conversionRate: number;
  performanceScore: number;
}
