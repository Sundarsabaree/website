export type Role = 'ADMIN' | 'MANAGER' | 'SALES_EXECUTIVE' | 'VIEWER';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type DealStage = 'DISCOVERY' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type MeetingType = 'ONLINE' | 'IN_PERSON' | 'PHONE';

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type NotificationType = 'CUSTOMER' | 'TASK' | 'DEAL' | 'MEETING' | 'SYSTEM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
  department?: string;
  status?: string;
  createdAt?: string;
  _count?: {
    assignedCustomers?: number;
    assignedLeads?: number;
    assignedDeals?: number;
    assignedTasks?: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  industry?: string;
  budget: number;
  interest?: string;
  leadScore?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: CustomerStatus;
  notes?: string;
  assignedToId?: string;
  assignedTo?: Partial<User>;
  createdById?: string;
  createdBy?: Partial<User>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    deals?: number;
    tasks?: number;
    meetings?: number;
    leads?: number;
  };
  leads?: Lead[];
  deals?: Deal[];
  tasks?: Task[];
  meetings?: Meeting[];
}

export interface Lead {
  id: string;
  title: string;
  contactName: string;
  email: string;
  phone?: string;
  company?: string;
  value: number;
  stage: LeadStage;
  priority: Priority;
  notes?: string;
  followUpDate?: string;
  assignedToId?: string;
  assignedTo?: Partial<User>;
  customerId?: string;
  customer?: Partial<Customer>;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  closingDate?: string;
  customerId: string;
  customer?: Partial<Customer>;
  assignedToId?: string;
  assignedTo?: Partial<User>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: Priority;
  status: TaskStatus;
  assignedToId?: string;
  assignedTo?: Partial<User>;
  createdById?: string;
  createdBy?: Partial<User>;
  customerId?: string;
  customer?: Partial<Customer>;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: MeetingType;
  status: MeetingStatus;
  hostId?: string;
  host?: Partial<User>;
  customerId?: string;
  customer?: Partial<Customer>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  originalId: string;
  eventType: 'MEETING' | 'TASK_DEADLINE' | 'FOLLOW_UP';
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  type?: MeetingType;
  priority?: Priority;
  status?: string;
  host?: Partial<User>;
  customer?: Partial<Customer>;
  color: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  userId?: string;
  user?: Partial<User>;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activeLeads: number;
  totalRevenue: number;
  pipelineValue: number;
  closedDeals: number;
  pendingTasks: number;
  meetingsToday: number;
  hotLeadsCount: number;
}
