import { PrismaClient, Role, CustomerStatus, LeadStage, Priority, DealStage, TaskStatus, MeetingType, MeetingStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing tables in reverse dependency order
  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const managerHash = await bcrypt.hash('Manager@123', 10);
  const viewerHash = await bcrypt.hash('Viewer@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Director',
      email: 'admin@crm.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 019-2831',
      department: 'Executive Leadership',
      status: 'ACTIVE'
    }
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'manager@crm.com',
      passwordHash: managerHash,
      role: Role.MANAGER,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 014-9922',
      department: 'Sales Operations',
      status: 'ACTIVE'
    }
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Audit Viewer',
      email: 'viewer@crm.com',
      passwordHash: viewerHash,
      role: Role.VIEWER,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 018-7711',
      department: 'Compliance',
      status: 'ACTIVE'
    }
  });

  // Migrated Sales Reps from original script.js
  const salesUsersData = [
    { email: 'sales1@crm.com', pass: 'pass101', name: 'Alex Morgan', phone: '+1 555-0101' },
    { email: 'sales2@crm.com', pass: 'pass102', name: 'David Kim', phone: '+1 555-0102' },
    { email: 'sales3@crm.com', pass: 'pass103', name: 'Priya Sharma', phone: '+1 555-0103' },
    { email: 'sales4@crm.com', pass: 'pass104', name: 'James Wilson', phone: '+1 555-0104' },
    { email: 'sales5@crm.com', pass: 'pass105', name: 'Elena Rostova', phone: '+1 555-0105' },
    { email: 'sales6@crm.com', pass: 'pass106', name: 'Liam Chen', phone: '+1 555-0106' },
    { email: 'sales7@crm.com', pass: 'pass107', name: 'Amina Diallo', phone: '+1 555-0107' },
    { email: 'sales8@crm.com', pass: 'pass108', name: 'Carlos Mendez', phone: '+1 555-0108' },
    { email: 'sales9@crm.com', pass: 'pass109', name: 'Chloe Dupont', phone: '+1 555-0109' },
    { email: 'sales10@crm.com', pass: 'pass110', name: 'Rohan Verma', phone: '+1 555-0110' }
  ];

  const salesReps = [];
  for (const s of salesUsersData) {
    const hash = await bcrypt.hash(s.pass, 10);
    const u = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash: hash,
        role: Role.SALES_EXECUTIVE,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name.replace(' ', '')}`,
        phone: s.phone,
        department: 'Enterprise Sales',
        status: 'ACTIVE'
      }
    });
    salesReps.push(u);
  }

  // Create Customers with Migrated Rules
  const customersData = [
    {
      name: 'Acme Corporation',
      email: 'contact@acmecorp.com',
      phone: '+1 555-492-1000',
      company: 'Acme Corp',
      industry: 'Manufacturing',
      budget: 125000,
      interest: 'Cloud Migration & ERP',
      leadScore: 'Hot Lead 🔥',
      address: '100 Industrial Parkway',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      status: CustomerStatus.ACTIVE,
      notes: 'Key prospect looking to modernize legacy on-premise systems before Q4.',
      assignedToId: salesReps[0].id,
      createdById: admin.id
    },
    {
      name: 'BioGenix Labs',
      email: 'procurement@biogenix.io',
      phone: '+1 555-883-9122',
      company: 'BioGenix',
      industry: 'Healthcare',
      budget: 85000,
      interest: 'HIPAA CRM Integration',
      leadScore: 'Hot Lead 🔥',
      address: '45 Science Hub Road',
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      status: CustomerStatus.ACTIVE,
      notes: 'Demo scheduled with compliance and clinical trials teams.',
      assignedToId: salesReps[1].id,
      createdById: salesReps[1].id
    },
    {
      name: 'FinVantage Financial',
      email: 'deals@finvantage.com',
      phone: '+1 555-321-7788',
      company: 'FinVantage Group',
      industry: 'Finance',
      budget: 45000,
      interest: 'Automated Portfolio Reporting',
      leadScore: 'Medium Lead 🟡',
      address: '88 Wall Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      status: CustomerStatus.ACTIVE,
      notes: 'Budget approved for pilot rollout across 2 regional offices.',
      assignedToId: salesReps[2].id,
      createdById: salesReps[2].id
    },
    {
      name: 'Nexus Retail Technologies',
      email: 'ops@nexusretail.com',
      phone: '+1 555-901-4455',
      company: 'Nexus Retail',
      industry: 'Retail & E-commerce',
      budget: 35000,
      interest: 'Omnichannel POS Sync',
      leadScore: 'Medium Lead 🟡',
      address: '1200 Market Street',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      status: CustomerStatus.PROSPECT,
      notes: 'Needs custom Shopify + NetSuite connectors.',
      assignedToId: salesReps[0].id,
      createdById: salesReps[0].id
    },
    {
      name: 'Starlight Media Studios',
      email: 'tech@starlightmedia.net',
      phone: '+1 555-667-8899',
      company: 'Starlight Studios',
      industry: 'Media & Entertainment',
      budget: 18000,
      interest: 'Video Asset Metadata Pipeline',
      leadScore: 'Low Lead 🔵',
      address: '500 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      status: CustomerStatus.PROSPECT,
      notes: 'Exploring options; budget constraint until next fiscal year.',
      assignedToId: salesReps[3].id,
      createdById: salesReps[3].id
    },
    {
      name: 'Quantum Logistics',
      email: 'support@quantumlog.com',
      phone: '+1 555-443-1122',
      company: 'Quantum Global',
      industry: 'Logistics',
      budget: 95000,
      interest: 'Fleet Tracking & Dispatch Automation',
      leadScore: 'Hot Lead 🔥',
      address: '77 Port Road',
      city: 'Houston',
      state: 'TX',
      country: 'USA',
      status: CustomerStatus.ACTIVE,
      notes: 'Executive sponsor is highly eager to sign by end of month.',
      assignedToId: salesReps[4].id,
      createdById: salesReps[4].id
    }
  ];

  const createdCustomers = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({ data: c });
    createdCustomers.push(cust);
  }

  // Create Leads for Kanban Board
  const leadsData = [
    {
      title: 'Enterprise ERP Suite Expansion',
      contactName: 'Robert Vance',
      email: 'rvance@acmecorp.com',
      phone: '+1 555-492-1001',
      company: 'Acme Corp',
      value: 120000,
      stage: LeadStage.NEGOTIATION,
      priority: Priority.HIGH,
      notes: 'Contract under final legal review.',
      assignedToId: salesReps[0].id,
      customerId: createdCustomers[0].id
    },
    {
      title: 'Lab Automation Cloud API',
      contactName: 'Dr. Helen Brooks',
      email: 'hbrooks@biogenix.io',
      phone: '+1 555-883-9133',
      company: 'BioGenix',
      value: 85000,
      stage: LeadStage.PROPOSAL,
      priority: Priority.HIGH,
      notes: 'Custom security questionnaire submitted.',
      assignedToId: salesReps[1].id,
      customerId: createdCustomers[1].id
    },
    {
      title: 'Fintech Data Pipeline Pilot',
      contactName: 'Marcus Sterling',
      email: 'msterling@finvantage.com',
      phone: '+1 555-321-7799',
      company: 'FinVantage Group',
      value: 45000,
      stage: LeadStage.QUALIFIED,
      priority: Priority.MEDIUM,
      notes: 'Technical POC successfully demonstrated.',
      assignedToId: salesReps[2].id,
      customerId: createdCustomers[2].id
    },
    {
      title: 'Omnichannel POS Sync',
      contactName: 'Jessica Tran',
      email: 'jtran@nexusretail.com',
      phone: '+1 555-901-4466',
      company: 'Nexus Retail',
      value: 35000,
      stage: LeadStage.CONTACTED,
      priority: Priority.MEDIUM,
      notes: 'Discovery call completed, awaiting requirements spec.',
      assignedToId: salesReps[0].id,
      customerId: createdCustomers[3].id
    },
    {
      title: 'Digital Asset Manager Upgrade',
      contactName: 'Julian Grey',
      email: 'jgrey@starlightmedia.net',
      phone: '+1 555-667-8811',
      company: 'Starlight Studios',
      value: 18000,
      stage: LeadStage.NEW,
      priority: Priority.LOW,
      notes: 'Inbound inquiry from website contact form.',
      assignedToId: salesReps[3].id,
      customerId: createdCustomers[4].id
    },
    {
      title: 'Global Fleet Dispatch Optimization',
      contactName: 'Carlos Santoro',
      email: 'csantoro@quantumlog.com',
      phone: '+1 555-443-1133',
      company: 'Quantum Global',
      value: 95000,
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      notes: 'Master Service Agreement signed! Onboarding started.',
      assignedToId: salesReps[4].id,
      customerId: createdCustomers[5].id
    }
  ];

  for (const l of leadsData) {
    await prisma.lead.create({ data: l });
  }

  // Create Deals
  const dealsData = [
    {
      title: 'Acme Global Infrastructure 2026',
      value: 125000,
      stage: DealStage.NEGOTIATION,
      probability: 85,
      closingDate: new Date(Date.now() + 14 * 86400000),
      customerId: createdCustomers[0].id,
      assignedToId: salesReps[0].id
    },
    {
      title: 'BioGenix HIPAA Analytics Cloud',
      value: 85000,
      stage: DealStage.PROPOSAL,
      probability: 70,
      closingDate: new Date(Date.now() + 25 * 86400000),
      customerId: createdCustomers[1].id,
      assignedToId: salesReps[1].id
    },
    {
      title: 'FinVantage Security Gateway',
      value: 45000,
      stage: DealStage.QUALIFICATION,
      probability: 50,
      closingDate: new Date(Date.now() + 40 * 86400000),
      customerId: createdCustomers[2].id,
      assignedToId: salesReps[2].id
    },
    {
      title: 'Quantum Worldwide Fleet Deal',
      value: 95000,
      stage: DealStage.CLOSED_WON,
      probability: 100,
      closingDate: new Date(Date.now() - 3 * 86400000),
      customerId: createdCustomers[5].id,
      assignedToId: salesReps[4].id
    }
  ];

  for (const d of dealsData) {
    await prisma.deal.create({ data: d });
  }

  // Create Tasks
  const tasksData = [
    {
      title: 'Send Revised MSA to Acme Legal',
      description: 'Incorporate clauses 4.2 and indemnification updates.',
      dueDate: new Date(Date.now() + 2 * 86400000),
      priority: Priority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: salesReps[0].id,
      createdById: manager.id,
      customerId: createdCustomers[0].id
    },
    {
      title: 'Schedule BioGenix Architecture Demo',
      description: 'Include Solution Architect for AWS compliance review.',
      dueDate: new Date(Date.now() + 1 * 86400000),
      priority: Priority.HIGH,
      status: TaskStatus.PENDING,
      assignedToId: salesReps[1].id,
      createdById: manager.id,
      customerId: createdCustomers[1].id
    },
    {
      title: 'Prepare FinVantage Q4 Pricing Proposal',
      description: 'Prepare tiered discount structure for 200+ seats.',
      dueDate: new Date(Date.now() + 5 * 86400000),
      priority: Priority.MEDIUM,
      status: TaskStatus.PENDING,
      assignedToId: salesReps[2].id,
      createdById: salesReps[2].id,
      customerId: createdCustomers[2].id
    },
    {
      title: 'Finalize Quantum Onboarding Plan',
      description: 'Handover account notes to Customer Success team.',
      dueDate: new Date(Date.now() - 1 * 86400000),
      priority: Priority.MEDIUM,
      status: TaskStatus.COMPLETED,
      assignedToId: salesReps[4].id,
      createdById: salesReps[4].id,
      customerId: createdCustomers[5].id
    }
  ];

  for (const t of tasksData) {
    await prisma.task.create({ data: t });
  }

  // Create Meetings
  const meetingsData = [
    {
      title: 'Acme Executive Review & Contract Signing',
      description: 'Review final terms and sign partnership agreement.',
      startTime: new Date(Date.now() + 3600000 * 3),
      endTime: new Date(Date.now() + 3600000 * 4),
      location: 'Zoom / Room A',
      type: MeetingType.ONLINE,
      status: MeetingStatus.SCHEDULED,
      hostId: salesReps[0].id,
      customerId: createdCustomers[0].id
    },
    {
      title: 'BioGenix Technical Q&A',
      description: 'Address security and audit trail questions.',
      startTime: new Date(Date.now() + 86400000 * 1 + 3600000 * 2),
      endTime: new Date(Date.now() + 86400000 * 1 + 3600000 * 3),
      location: 'Google Meet',
      type: MeetingType.ONLINE,
      status: MeetingStatus.SCHEDULED,
      hostId: salesReps[1].id,
      customerId: createdCustomers[1].id
    },
    {
      title: 'Weekly Sales Pipeline Review',
      description: 'Team sync on high-value targets and blockers.',
      startTime: new Date(Date.now() + 86400000 * 2),
      endTime: new Date(Date.now() + 86400000 * 2 + 3600000),
      location: 'Main Boardroom',
      type: MeetingType.IN_PERSON,
      status: MeetingStatus.SCHEDULED,
      hostId: manager.id,
      customerId: null
    }
  ];

  for (const m of meetingsData) {
    await prisma.meeting.create({ data: m });
  }

  // Create Notifications
  const notificationsData = [
    {
      userId: admin.id,
      title: '🎉 Major Deal Closed',
      message: 'Quantum Worldwide Fleet Deal worth ₹95,000 was marked CLOSED WON by Carlos Mendez!',
      type: NotificationType.DEAL,
      link: '/sales'
    },
    {
      userId: salesReps[0].id,
      title: '📅 Upcoming Meeting',
      message: 'Acme Executive Review starts in 3 hours.',
      type: NotificationType.MEETING,
      link: '/calendar'
    },
    {
      userId: salesReps[1].id,
      title: '📌 High Priority Task Assigned',
      message: 'Schedule BioGenix Architecture Demo is due tomorrow.',
      type: NotificationType.TASK,
      link: '/tasks'
    },
    {
      userId: manager.id,
      title: '👥 New Hot Lead Added',
      message: 'BioGenix Labs registered with budget ₹85,000.',
      type: NotificationType.CUSTOMER,
      link: '/customers'
    }
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }

  // Create Activities
  const activitiesData = [
    {
      userId: salesReps[4].id,
      action: 'DEAL_CLOSED_WON',
      entityType: 'Deal',
      entityId: createdCustomers[5].id,
      details: 'Closed won deal with Quantum Global for ₹95,000'
    },
    {
      userId: salesReps[0].id,
      action: 'LEAD_STAGE_MOVED',
      entityType: 'Lead',
      entityId: createdCustomers[0].id,
      details: 'Moved Acme Corporation lead to Negotiation stage'
    },
    {
      userId: salesReps[1].id,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: createdCustomers[1].id,
      details: 'Added new customer BioGenix Labs with budget ₹85,000 (Hot Lead 🔥)'
    },
    {
      userId: manager.id,
      action: 'TASK_ASSIGNED',
      entityType: 'Task',
      entityId: createdCustomers[0].id,
      details: 'Assigned task "Send Revised MSA to Acme Legal" to Alex Morgan'
    }
  ];

  for (const a of activitiesData) {
    await prisma.activity.create({ data: a });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
