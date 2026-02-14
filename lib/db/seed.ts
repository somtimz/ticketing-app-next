import * as schema from './schema';
import { db } from '../db';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { NewCategory, NewUser, NewEmployee, NewTicket, NewCaller, NewSLAPolicy, NewDepartment, NewGuestUser } from './schema';
import type { NewTicketStatusHistory } from './schema';
import { calculatePriority, calculateSLADueDates } from '@/lib/sla';

async function seed(): Promise<void> {
  console.log('Seeding database...');

  // ========================================
  // 1. INSERT USERS (11 total)
  // ========================================

  // Hash passwords
  const adminPasswordHash: string = await bcrypt.hash('admin123', 10);
  const teamLeadPasswordHash: string = await bcrypt.hash('teamlead123', 10);
  const agentPasswordHash: string = await bcrypt.hash('agent123', 10);
  const employeePasswordHash: string = await bcrypt.hash('employee123', 10);

  console.log('Inserting users...');

  // 1 Admin
  const adminUser: NewUser = {
    email: 'admin@company.com',
    passwordHash: adminPasswordHash,
    fullName: 'System Administrator',
    role: 'Admin',
    isActive: true
  };

  await db.insert(schema.users).values(adminUser).onConflictDoNothing();

  // 2 Team Leads
  const teamLeadsData: NewUser[] = [
    {
      email: 'teamlead1@company.com',
      passwordHash: teamLeadPasswordHash,
      fullName: 'David Martinez',
      role: 'TeamLead',
      isActive: true
    },
    {
      email: 'teamlead2@company.com',
      passwordHash: teamLeadPasswordHash,
      fullName: 'Lisa Thompson',
      role: 'TeamLead',
      isActive: true
    }
  ];

  await db.insert(schema.users).values(teamLeadsData).onConflictDoNothing();

  // 3 Agents
  const agentsData: NewUser[] = [
    {
      email: 'agent1@company.com',
      passwordHash: agentPasswordHash,
      fullName: 'Sarah Johnson',
      role: 'Agent',
      isActive: true
    },
    {
      email: 'agent2@company.com',
      passwordHash: agentPasswordHash,
      fullName: 'Michael Chen',
      role: 'Agent',
      isActive: true
    },
    {
      email: 'agent3@company.com',
      passwordHash: agentPasswordHash,
      fullName: 'Emily Davis',
      role: 'Agent',
      isActive: true
    }
  ];

  await db.insert(schema.users).values(agentsData).onConflictDoNothing();

  // 5 Employees (note: employees also go in employees table)
  const employeeUsersData: NewUser[] = [
    {
      email: 'employee1@company.com',
      passwordHash: employeePasswordHash,
      fullName: 'John Smith',
      role: 'Employee',
      isActive: true
    },
    {
      email: 'employee2@company.com',
      passwordHash: employeePasswordHash,
      fullName: 'Jane Doe',
      role: 'Employee',
      isActive: true
    },
    {
      email: 'employee3@company.com',
      passwordHash: employeePasswordHash,
      fullName: 'Bob Wilson',
      role: 'Employee',
      isActive: true
    },
    {
      email: 'employee4@company.com',
      passwordHash: employeePasswordHash,
      fullName: 'Alice Brown',
      role: 'Employee',
      isActive: true
    },
    {
      email: 'employee5@company.com',
      passwordHash: employeePasswordHash,
      fullName: 'Tom Harris',
      role: 'Employee',
      isActive: true
    }
  ];

  await db.insert(schema.users).values(employeeUsersData).onConflictDoNothing();

  console.log('  ✓ 1 Admin, 2 Team Leads, 3 Agents, 5 Employees created');

  // ========================================
  // 1.5. INSERT DEPARTMENTS (5)
  // ========================================

  console.log('Inserting departments...');
  const departmentsData: NewDepartment[] = [
    { name: 'Engineering', code: 'ENG', description: 'Software Development and Engineering', isActive: true },
    { name: 'Marketing', code: 'MKT', description: 'Marketing and Communications', isActive: true },
    { name: 'Sales', code: 'SAL', description: 'Sales and Business Development', isActive: true },
    { name: 'Human Resources', code: 'HR', description: 'Human Resources and People Operations', isActive: true },
    { name: 'Finance', code: 'FIN', description: 'Finance and Accounting', isActive: true }
  ];

  await db.insert(schema.departments).values(departmentsData).onConflictDoNothing();

  // Get inserted departments for linking to users
  const insertedDepartments = await db.select().from(schema.departments);
  const departmentMap = new Map(insertedDepartments.map(d => [d.code, d.id]));

  // Update users with department assignments
  await db.update(schema.users)
    .set({ departmentId: departmentMap.get('ENG') })
    .where(eq(schema.users.email, 'employee1@company.com'));

  await db.update(schema.users)
    .set({ departmentId: departmentMap.get('MKT') })
    .where(eq(schema.users.email, 'employee2@company.com'));

  await db.update(schema.users)
    .set({ departmentId: departmentMap.get('SAL') })
    .where(eq(schema.users.email, 'employee3@company.com'));

  await db.update(schema.users)
    .set({ departmentId: departmentMap.get('HR') })
    .where(eq(schema.users.email, 'employee4@company.com'));

  await db.update(schema.users)
    .set({ departmentId: departmentMap.get('FIN') })
    .where(eq(schema.users.email, 'employee5@company.com'));

  console.log('  ✓ 5 Departments created (ENG, MKT, SAL, HR, FIN) and linked to employees');

  // ========================================
  // 1.6. INSERT GUEST USERS (2)
  // ========================================

  console.log('Inserting guest users...');

  // Get admin user for sponsorship
  const adminUserRecord = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@company.com')).limit(1);

  if (adminUserRecord.length > 0) {
    const guestUsersData: NewGuestUser[] = [
      {
        name: 'External Vendor Contact',
        email: 'vendor@acme-corp.com',
        company: 'ACME Corporation',
        phone: '555-7777',
        sponsorId: adminUserRecord[0].id,
        isActive: true,
        notes: 'Primary contact for software license renewals'
      },
      {
        name: 'Contractor Support',
        email: 'contractor@external-consulting.com',
        company: 'External Consulting LLC',
        phone: '555-8888',
        sponsorId: adminUserRecord[0].id,
        isActive: true,
        notes: 'Contractor for Q1 project support'
      }
    ];

    await db.insert(schema.guestUsers).values(guestUsersData).onConflictDoNothing();
    console.log('  ✓ 2 Guest users created');
  }

  // ========================================
  // 2. INSERT EMPLOYEES (5)
  // ========================================

  console.log('Inserting employees...');
  const employeesData: NewEmployee[] = [
    {
      employeeId: 'EMP001',
      email: 'employee1@company.com',
      fullName: 'John Smith',
      department: 'Engineering',
      phone: '555-0101',
      isActive: true
    },
    {
      employeeId: 'EMP002',
      email: 'employee2@company.com',
      fullName: 'Jane Doe',
      department: 'Marketing',
      phone: '555-0102',
      isActive: true
    },
    {
      employeeId: 'EMP003',
      email: 'employee3@company.com',
      fullName: 'Bob Wilson',
      department: 'Sales',
      phone: '555-0103',
      isActive: true
    },
    {
      employeeId: 'EMP004',
      email: 'employee4@company.com',
      fullName: 'Alice Brown',
      department: 'HR',
      phone: '555-0104',
      isActive: true
    },
    {
      employeeId: 'EMP005',
      email: 'employee5@company.com',
      fullName: 'Tom Harris',
      department: 'Finance',
      phone: '555-0105',
      isActive: true
    }
  ];

  await db.insert(schema.employees).values(employeesData).onConflictDoNothing();
  console.log('  ✓ 5 Employees created');

  // ========================================
  // 3. INSERT CATEGORIES (4 main categories)
  // ========================================

  console.log('Inserting categories...');
  const categoriesData: NewCategory[] = [
    { name: 'Hardware', description: 'Hardware issues including laptops, monitors, and peripherals', isActive: true },
    { name: 'Software', description: 'Software issues including OS, applications, and software installations', isActive: true },
    { name: 'Network', description: 'Network issues including WiFi, VPN, and connectivity problems', isActive: true },
    { name: 'Access', description: 'Access and account issues including account requests and password resets', isActive: true }
  ];

  await db.insert(schema.categories).values(categoriesData).onConflictDoNothing();
  console.log('  ✓ 4 Categories created (Hardware, Software, Network, Access)');

  // ========================================
  // 4. INSERT SLA POLICIES (4 policies)
  // ========================================

  console.log('Inserting SLA policies...');
  const slaPoliciesData: NewSLAPolicy[] = [
    {
      priority: 'P1',
      firstResponseMinutes: 15, // 15 minutes
      resolutionMinutes: 240 // 4 hours
    },
    {
      priority: 'P2',
      firstResponseMinutes: 60, // 1 hour
      resolutionMinutes: 1440 // 24 hours
    },
    {
      priority: 'P3',
      firstResponseMinutes: 240, // 4 hours
      resolutionMinutes: 4320 // 72 hours (3 days)
    },
    {
      priority: 'P4',
      firstResponseMinutes: 1440, // 24 hours
      resolutionMinutes: 10080 // 7 days
    }
  ];

  await db.insert(schema.slaPolicies).values(slaPoliciesData).onConflictDoNothing();
  console.log('  ✓ 4 SLA Policies created (P1-P4)');

  // ========================================
  // 5. INSERT CALLERS (for ticket creation)
  // ========================================

  console.log('Inserting callers...');

  // First, get the employee IDs we just created
  const insertedEmployees = await db.select().from(schema.employees);
  const employeeMap = new Map(insertedEmployees.map(e => [e.email, e.id]));

  // Create callers linked to employees
  const callersData: NewCaller[] = [
    {
      fullName: 'John Smith',
      email: 'employee1@company.com',
      phone: '555-0101',
      employeeReferenceId: employeeMap.get('employee1@company.com'),
      isGuest: false
    },
    {
      fullName: 'Jane Doe',
      email: 'employee2@company.com',
      phone: '555-0102',
      employeeReferenceId: employeeMap.get('employee2@company.com'),
      isGuest: false
    },
    {
      fullName: 'Bob Wilson',
      email: 'employee3@company.com',
      phone: '555-0103',
      employeeReferenceId: employeeMap.get('employee3@company.com'),
      isGuest: false
    },
    {
      fullName: 'Alice Brown',
      email: 'employee4@company.com',
      phone: '555-0104',
      employeeReferenceId: employeeMap.get('employee4@company.com'),
      isGuest: false
    },
    {
      fullName: 'Tom Harris',
      email: 'employee5@company.com',
      phone: '555-0105',
      employeeReferenceId: employeeMap.get('employee5@company.com'),
      isGuest: false
    },
    // Add a guest caller for variety
    {
      fullName: 'Guest User',
      email: 'guest@external.com',
      phone: '555-9999',
      employeeReferenceId: null,
      isGuest: true
    }
  ];

  await db.insert(schema.callers).values(callersData).onConflictDoNothing();
  console.log('  ✓ 6 Callers created (5 employees + 1 guest)');

  // ========================================
  // 6. INSERT TICKETS (20 sample tickets)
  // ========================================

  console.log('Inserting tickets...');

  // Get inserted data for foreign key references
  const insertedCategories = await db.select().from(schema.categories);
  const insertedCallers = await db.select().from(schema.callers);
  const insertedUsers = await db.select().from(schema.users);

  const categoryMap = new Map(insertedCategories.map(c => [c.name, c.id]));
  const callerMap = new Map(insertedCallers.map(c => [(c.email || c.fullName), c.id]));

  // Filter users by role for assignment
  const agents = insertedUsers.filter(u => u.role === 'Agent');

  const ticketsData: NewTicket[] = [];

  // Helper function to create a ticket
  const createTicket = (
    ticketNumber: string,
    title: string,
    description: string,
    categoryName: string,
    callerEmail: string,
    impact: 'Low' | 'Medium' | 'High',
    urgency: 'Low' | 'Medium' | 'High',
    status: 'New' | 'InProgress' | 'Resolved' | 'Closed',
    assignedAgentEmail: string | null,
    createdAtOffset: number, // minutes ago
    resolvedAtOffset: number | null, // minutes ago (null if not resolved)
    resolution: string | null
  ): NewTicket => {
    const priority = calculatePriority(impact, urgency);
    const createdAt = new Date(Date.now() - createdAtOffset * 60 * 1000);
    const slaDates = calculateSLADueDates(priority, createdAt);

    const assignedAgent = assignedAgentEmail ? agents.find(a => a.email === assignedAgentEmail) : null;

    return {
      ticketNumber,
      title,
      description,
      categoryId: categoryMap.get(categoryName) || null,
      callerId: callerMap.get(callerEmail) || 0,
      impact,
      urgency,
      priority,
      status,
      assignedAgentId: assignedAgent?.id || null,
      resolution,
      slaFirstResponseDue: slaDates.firstResponseDue,
      slaResolutionDue: slaDates.resolutionDue,
      resolvedAt: resolvedAtOffset ? new Date(Date.now() - resolvedAtOffset * 60 * 1000) : null,
      createdAt,
      updatedAt: new Date(),
      closedAt: status === 'Closed' && resolvedAtOffset ? new Date(Date.now() - resolvedAtOffset * 60 * 1000) : null
    };
  };

  // P1 TICKETS (Critical)
  ticketsData.push(
    createTicket(
      'TICK-1001',
      'Server Down - Production Database Unreachable',
      'Critical production database server is down. Multiple services affected. No access to customer data.',
      'Network',
      'employee1@company.com',
      'High',
      'High',
      'InProgress',
      'agent1@company.com',
      30, // created 30 min ago
      null,
      null
    ),
    createTicket(
      'TICK-1002',
      'CEO Laptop Cannot Boot - Board Meeting in 2 Hours',
      'CEO\'s laptop will not boot. Blue screen on startup. Critical board meeting scheduled in 2 hours.',
      'Hardware',
      'employee3@company.com',
      'High',
      'High',
      'Resolved',
      'agent1@company.com',
      120, // created 2 hours ago
      90, // resolved 90 min ago
      'Replaced faulty RAM module. System booting normally now.'
    )
  );

  // P2 TICKETS (High)
  ticketsData.push(
    createTicket(
      'TICK-1003',
      'VPN Not Connecting - Remote Team Cannot Access',
      'VPN connection failing for all remote team members. Getting authentication error.',
      'Network',
      'employee2@company.com',
      'High',
      'Medium',
      'New',
      null,
      60, // created 1 hour ago
      null,
      null
    ),
    createTicket(
      'TICK-1004',
      'Email Not Sending - Outlook Stuck in Outbox',
      'Outlook is not sending emails. All messages stuck in outbox. Receiving works fine.',
      'Software',
      'employee4@company.com',
      'Medium',
      'High',
      'InProgress',
      'agent2@company.com',
      150, // created 2.5 hours ago
      null,
      null
    ),
    createTicket(
      'TICK-1005',
      'Cannot Access Network Shares - Permission Denied',
      'Unable to access department network shares. Getting "Access Denied" error for all folders.',
      'Access',
      'employee5@company.com',
      'Medium',
      'High',
      'Resolved',
      'agent2@company.com',
      200, // created ~3.3 hours ago
      180,
      'Reset AD permissions. User can now access all required shares.'
    )
  );

  // P3 TICKETS (Medium)
  ticketsData.push(
    createTicket(
      'TICK-1006',
      'Monitor Flickering - Dell 24" Display',
      'Secondary monitor is flickering intermittently. Happens when display brightness is above 70%.',
      'Hardware',
      'employee1@company.com',
      'Low',
      'Medium',
      'New',
      null,
      180, // created 3 hours ago
      null,
      null
    ),
    createTicket(
      'TICK-1007',
      'Request: Software Installation - Adobe Creative Cloud',
      'Need Adobe Creative Cloud installed for design projects. License available.',
      'Software',
      'employee2@company.com',
      'Medium',
      'Low',
      'Resolved',
      'agent3@company.com',
      240, // created 4 hours ago
      210,
      'Installed Adobe Creative Cloud with assigned license. User confirmed working.'
    ),
    createTicket(
      'TICK-1008',
      'WiFi Intermittent in Conference Room B',
      'WiFi connection drops frequently in Conference Room B. Affecting meetings.',
      'Network',
      'employee3@company.com',
      'Medium',
      'Medium',
      'InProgress',
      'agent3@company.com',
      300, // created 5 hours ago
      null,
      null
    ),
    createTicket(
      'TICK-1009',
      'Password Reset Required',
      'User forgot password and needs reset for email and system access.',
      'Access',
      'employee4@company.com',
      'Low',
      'Medium',
      'Closed',
      'agent1@company.com',
      360, // created 6 hours ago
      350,
      'Password reset successfully. User has logged in and changed to new password.'
    ),
    createTicket(
      'TICK-1010',
      'Request: New Employee Account Setup',
      'New employee starting Monday. Need email, AD account, and system access setup.',
      'Access',
      'employee5@company.com',
      'Medium',
      'Medium',
      'InProgress',
      'agent2@company.com',
      400, // created ~6.7 hours ago
      null,
      null
    )
  );

  // P4 TICKETS (Low)
  ticketsData.push(
    createTicket(
      'TICK-1011',
      'Keyboard Keys Sticking - Enter Key',
      'Enter key is sticking and needs to be pressed multiple times to register.',
      'Hardware',
      'employee1@company.com',
      'Low',
      'Low',
      'New',
      null,
      480, // created 8 hours ago
      null,
      null
    ),
    createTicket(
      'TICK-1012',
      'Request: Monitor Stand Adjustment',
      'Need monitor arm to adjust height. Current stand is not adjustable.',
      'Hardware',
      'employee2@company.com',
      'Low',
      'Low',
      'Resolved',
      'agent3@company.com',
      540, // created 9 hours ago
      500,
      'Provided adjustable monitor arm. Installation complete.'
    ),
    createTicket(
      'TICK-1013',
      'Software Update Available - Office 2021',
      'Notification for Office 2021 update. Should I proceed with installation?',
      'Software',
      'employee3@company.com',
      'Low',
      'Low',
      'Resolved',
      'agent1@company.com',
      600, // created 10 hours ago
      580,
      'Confirmed update is safe. User proceeded with installation successfully.'
    ),
    createTicket(
      'TICK-1014',
      'Request: Access to Shared Folder',
      'Need read access to Marketing shared folder for project collaboration.',
      'Access',
      'employee4@company.com',
      'Low',
      'Low',
      'Resolved',
      'agent2@company.com',
      720, // created 12 hours ago
      700,
      'Granted read access to Marketing shared folder. Access confirmed.'
    ),
    createTicket(
      'TICK-1015',
      'Printer Default Settings Need Change',
      'Need to change default printer settings to double-sided for all users in department.',
      'Hardware',
      'employee5@company.com',
      'Low',
      'Low',
      'New',
      null,
      900, // created 15 hours ago
      null,
      null
    ),
    createTicket(
      'TICK-1016',
      'Request: VPN Software Installation',
      'Need VPN client installed for upcoming remote work next week.',
      'Software',
      'employee1@company.com',
      'Low',
      'Low',
      'Closed',
      'agent3@company.com',
      1080, // created 18 hours ago
      1050,
      'VPN client installed and configured. User tested successfully.'
    ),
    createTicket(
      'TICK-1017',
      'Wireless Mouse Not Working',
      'Wireless mouse not responding. Tried new batteries, still not working.',
      'Hardware',
      'employee2@company.com',
      'Low',
      'Low',
      'Resolved',
      'agent1@company.com',
      1260, // created 21 hours ago
      1200,
      'USB receiver was faulty. Replaced with new wireless mouse kit.'
    ),
    createTicket(
      'TICK-1018',
      'Question: How to Setup Email Signature',
      'Need guidance on setting up email signature with company logo.',
      'Software',
      'employee3@company.com',
      'Low',
      'Low',
      'Resolved',
      'agent2@company.com',
      1440, // created 24 hours ago
      1400,
      'Provided step-by-step instructions. User successfully created email signature.'
    )
  );

  await db.insert(schema.tickets).values(ticketsData).onConflictDoNothing();
  console.log(`  ✓ ${ticketsData.length} Tickets created (2 P1, 3 P2, 5 P3, 8 P4)`);

  // ========================================
  // 7. INSERT TICKET STATUS HISTORY
  // ========================================

  console.log('Inserting ticket status history...');

  // Get inserted tickets
  const insertedTickets = await db.select().from(schema.tickets);
  const ticketMap = new Map(insertedTickets.map(t => [t.ticketNumber, t.id]));

  const statusHistoryData: NewTicketStatusHistory[] = [];

  // Helper to add status change
  const addStatusChange = (
    ticketNumber: string,
    fromStatus: string | null,
    toStatus: string,
    changedByEmail: string,
    notes?: string,
    offset: number = 0
  ) => {
    const ticketId = ticketMap.get(ticketNumber);
    if (!ticketId) return;

    const changedBy = insertedUsers.find(u => u.email === changedByEmail);
    if (!changedBy) return;

    statusHistoryData.push({
      ticketId,
      fromStatus: fromStatus as any,
      toStatus: toStatus as any,
      changedBy: changedBy.id,
      notes: notes || null,
      changedAt: new Date(Date.now() - offset * 60 * 1000)
    });
  };

  // Add status history for resolved tickets
  addStatusChange('TICK-1002', 'New', 'InProgress', 'agent1@company.com', 'Acknowledged critical issue', 115);
  addStatusChange('TICK-1002', 'InProgress', 'Resolved', 'agent1@company.com', 'Replaced faulty RAM module', 90);

  addStatusChange('TICK-1005', 'New', 'InProgress', 'agent2@company.com', 'Investigating permission issue', 195);
  addStatusChange('TICK-1005', 'InProgress', 'Resolved', 'agent2@company.com', 'Reset AD permissions', 180);

  addStatusChange('TICK-1007', 'New', 'InProgress', 'agent3@company.com', 'Installing Adobe Creative Cloud', 230);
  addStatusChange('TICK-1007', 'InProgress', 'Resolved', 'agent3@company.com', 'Installation complete', 210);

  addStatusChange('TICK-1009', 'New', 'Resolved', 'agent1@company.com', 'Password reset completed', 350);
  addStatusChange('TICK-1009', 'Resolved', 'Closed', 'agent1@company.com', 'User confirmed new password working', 340);

  addStatusChange('TICK-1012', 'New', 'InProgress', 'agent3@company.com', 'Ordering monitor arm', 530);
  addStatusChange('TICK-1012', 'InProgress', 'Resolved', 'agent3@company.com', 'Monitor arm installed', 500);

  addStatusChange('TICK-1013', 'New', 'Resolved', 'agent1@company.com', 'Confirmed update safe, user proceeded', 580);

  addStatusChange('TICK-1014', 'New', 'InProgress', 'agent2@company.com', 'Processing access request', 710);
  addStatusChange('TICK-1014', 'InProgress', 'Resolved', 'agent2@company.com', 'Access granted', 700);

  addStatusChange('TICK-1016', 'New', 'InProgress', 'agent3@company.com', 'Installing VPN client', 1060);
  addStatusChange('TICK-1016', 'InProgress', 'Resolved', 'agent3@company.com', 'VPN installed and tested', 1050);
  addStatusChange('TICK-1016', 'Resolved', 'Closed', 'agent3@company.com', 'User confirmed working', 1040);

  addStatusChange('TICK-1017', 'New', 'InProgress', 'agent1@company.com', 'Diagnosing mouse issue', 1220);
  addStatusChange('TICK-1017', 'InProgress', 'Resolved', 'agent1@company.com', 'Replaced mouse', 1200);

  addStatusChange('TICK-1018', 'New', 'Resolved', 'agent2@company.com', 'Provided email signature instructions', 1400);

  // Add status history for in-progress tickets
  addStatusChange('TICK-1001', 'New', 'InProgress', 'agent1@company.com', 'Investigating database connectivity issue', 25);

  addStatusChange('TICK-1004', 'New', 'InProgress', 'agent2@company.com', 'Checking Outlook configuration', 145);

  addStatusChange('TICK-1008', 'New', 'InProgress', 'agent3@company.com', 'Checking AP in conference room', 295);

  addStatusChange('TICK-1010', 'New', 'InProgress', 'agent2@company.com', 'Preparing new employee account setup', 395);

  await db.insert(schema.ticketStatusHistory).values(statusHistoryData).onConflictDoNothing();
  console.log(`  ✓ ${statusHistoryData.length} Status history entries created`);

  // ========================================
  // KNOWLEDGE BASE ARTICLES
  // ========================================

  console.log('Inserting KB articles...');

  // Re-fetch user IDs we need
  const kbAgents = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.isActive, true));

  const agentById = Object.fromEntries(kbAgents.map(u => [u.email, u.id]));
  const agent1Id = agentById['agent1@company.com'];
  const agent2Id = agentById['agent2@company.com'];
  const agent3Id = agentById['agent3@company.com'];
  const adminId  = agentById['admin@company.com'];

  const kbCategories = await db
    .select({ id: schema.categories.id, name: schema.categories.name })
    .from(schema.categories);

  const catByName = Object.fromEntries(kbCategories.map(c => [c.name, c.id]));
  const hwCatId  = catByName['Hardware'];
  const swCatId  = catByName['Software'];
  const netCatId = catByName['Network'];
  const accCatId = catByName['Access & Permissions'];

  const kbArticles = [
    {
      title: 'How to Reset Your Password',
      content: `# How to Reset Your Password

Follow these steps to reset your account password.

## Self-Service Reset (Recommended)

1. Go to the login page and click **"Forgot Password"**
2. Enter your company email address
3. Check your inbox for a reset link (expires in 30 minutes)
4. Click the link and choose a new password

## Password Requirements

- Minimum **12 characters**
- At least one uppercase letter, one number, and one special character
- Cannot reuse your last 5 passwords

## Locked Out?

If your account is locked after too many failed attempts, contact the help desk or submit a ticket — an agent can unlock it within minutes.

> **Tip:** Use a password manager to keep track of complex passwords securely.`,
      categoryId: accCatId,
      createdBy: agent1Id,
      isPublished: true,
      helpfulCount: 24,
      notHelpfulCount: 2,
      viewCount: 312
    },
    {
      title: 'Setting Up VPN on Windows',
      content: `# Setting Up VPN on Windows

This guide walks you through installing and configuring the company VPN client on Windows 10/11.

## Prerequisites

- Windows 10 (version 1903+) or Windows 11
- Company credentials
- VPN installer from the IT portal (or request via ticket)

## Installation

1. Download **CompanyVPN-Setup.exe** from the IT software portal
2. Run as Administrator and follow the installer prompts
3. Restart your computer when prompted

## First-Time Configuration

1. Open the VPN client from the system tray
2. Enter the server address provided by IT: \`vpn.company.com\`
3. Log in with your **company email and password**
4. Select the **"Full Tunnel"** profile for remote work

## Connecting / Disconnecting

- Click the VPN icon in the system tray → **Connect**
- To disconnect: tray icon → **Disconnect**
- The VPN auto-reconnects on network changes

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't connect | Check your internet connection; try restarting the VPN client |
| Authentication failed | Verify your password hasn't expired |
| Slow speeds | Switch to the **"Split Tunnel"** profile |

Still having issues? [Submit a support ticket](/dashboard/issue-logging/new).`,
      categoryId: netCatId,
      createdBy: agent1Id,
      isPublished: true,
      helpfulCount: 41,
      notHelpfulCount: 3,
      viewCount: 580
    },
    {
      title: 'Requesting Software Installation',
      content: `# Requesting Software Installation

Need new software on your machine? Here's how to get it approved and installed.

## Standard Software (Pre-Approved List)

The following can be installed immediately via the **Self-Service Portal**:

- Microsoft Office suite
- Adobe Acrobat Reader
- Zoom / Teams
- 7-Zip, Notepad++, VS Code

Visit the IT Portal → **Software Catalog** to install these yourself.

## Non-Standard Software

For software not on the pre-approved list:

1. Submit a ticket with category **Software**
2. Include:
   - Software name and version
   - Business justification
   - Vendor website / download link
3. Your manager will receive an approval request
4. Once approved, an agent will install it (typically within 1–2 business days)

## Licensing

IT maintains all software licenses. Do **not** purchase or install personal software licenses on company hardware — this creates compliance risks.

## macOS Users

The same process applies. Note that some Windows-only tools may have macOS alternatives — ask your agent.`,
      categoryId: swCatId,
      createdBy: agent2Id,
      isPublished: true,
      helpfulCount: 18,
      notHelpfulCount: 1,
      viewCount: 204
    },
    {
      title: 'Troubleshooting Wi-Fi Connectivity Issues',
      content: `# Troubleshooting Wi-Fi Connectivity Issues

Before submitting a ticket, try these steps to resolve common Wi-Fi problems.

## Step 1 — Forget and Reconnect

1. Click the Wi-Fi icon in the taskbar
2. Right-click the network → **Forget**
3. Reconnect and re-enter credentials if prompted

## Step 2 — Restart Network Adapter

Open PowerShell as Administrator and run:

\`\`\`powershell
Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
Start-Sleep -Seconds 3
Enable-NetAdapter -Name "Wi-Fi"
\`\`\`

## Step 3 — Flush DNS

\`\`\`cmd
ipconfig /flushdns
ipconfig /release
ipconfig /renew
\`\`\`

## Step 4 — Check for IP Conflicts

Run \`ipconfig /all\` and confirm you have a valid IP (not 169.254.x.x). A 169.254 address indicates DHCP failure — contact the help desk.

## Still Not Working?

Check the **IT Status Page** for any known outages. If none exist, submit a ticket with:
- Your location / floor
- Device name (Settings → About)
- Error message (if any)`,
      categoryId: netCatId,
      createdBy: agent3Id,
      isPublished: true,
      helpfulCount: 33,
      notHelpfulCount: 5,
      viewCount: 447
    },
    {
      title: 'New Employee IT Onboarding Checklist',
      content: `# New Employee IT Onboarding Checklist

Welcome! This article covers everything IT sets up for new employees in your first week.

## Day 1 — What IT Provides

- [ ] Laptop (pre-imaged with standard software)
- [ ] Company email account
- [ ] Access to core systems (HR portal, Slack, Jira)
- [ ] Badge / physical access (coordinated with Facilities)

## Your Responsibility

1. **Change your temporary password** on first login
2. **Set up MFA** — go to [account.company.com](https://account.company.com) → Security → Enable Authenticator App
3. **Install VPN** if you'll be working remotely (see [VPN setup guide](/dashboard/kb))
4. **Bookmark** the IT Help Desk portal

## Additional Access Requests

Need access to specific systems (Salesforce, GitHub org, AWS)?

- Ask your manager to submit an access request ticket
- Standard access is provisioned within **1 business day**
- Privileged access (admin rights, prod systems) requires security review

## Equipment Issues

If your equipment arrives damaged or is missing accessories, submit a Hardware ticket within **48 hours** of receipt.`,
      categoryId: hwCatId,
      createdBy: adminId,
      isPublished: true,
      helpfulCount: 52,
      notHelpfulCount: 0,
      viewCount: 891
    },
    {
      title: 'Outlook Not Syncing — Common Fixes',
      content: `# Outlook Not Syncing — Common Fixes

If Outlook isn't receiving new emails or showing a "disconnected" status, try the following.

## Quick Fixes

1. **Check your internet** — can you browse the web?
2. **Look at the status bar** (bottom of Outlook) — it should say "Connected"
3. **Click Send/Receive All** (F9) to force a sync

## Repair Your Profile

1. Close Outlook
2. Open **Control Panel** → **Mail** → **Show Profiles**
3. Select your profile → **Properties** → **Email Accounts**
4. Select your Exchange account → **Change** → **More Settings** → **Advanced**
5. Click **Offline Folder File Settings** → verify the path is valid

## Clear the Outlook Cache

1. Close Outlook
2. Navigate to \`%localappdata%\\Microsoft\\Outlook\`
3. Rename (don't delete) the \`.ost\` file to \`.ost.old\`
4. Reopen Outlook — it will rebuild the cache (may take a few minutes)

## Re-add Your Account

As a last resort, remove and re-add your email account in Outlook settings.

If none of these work, submit a **Software** ticket and include your Outlook version (File → Office Account).`,
      categoryId: swCatId,
      createdBy: agent2Id,
      isPublished: true,
      helpfulCount: 29,
      notHelpfulCount: 4,
      viewCount: 376
    },
    {
      title: 'Requesting Access to Shared Drives and Folders',
      content: `# Requesting Access to Shared Drives and Folders

To request access to a shared network drive or SharePoint folder, follow this process.

## What You Need to Know First

- Access is granted based on **business need** and **manager approval**
- Some folders require department head sign-off
- Access is reviewed quarterly and removed when no longer needed

## How to Submit a Request

1. Submit a ticket with category **Access & Permissions**
2. Include:
   - **Drive/folder path** or SharePoint URL
   - **Access level needed**: Read-only or Read/Write
   - **Business reason** (1–2 sentences)
   - **Your manager's name** (they'll be cc'd for approval)

## Turnaround Time

| Access Type | SLA |
|-------------|-----|
| Standard shared drive | 4 business hours |
| SharePoint site | 4 business hours |
| Sensitive/restricted folder | 1–2 business days (requires approval chain) |

## Removing Access

When someone leaves a team or project, managers should submit an access **removal** request to maintain security hygiene.`,
      categoryId: accCatId,
      createdBy: agent1Id,
      isPublished: true,
      helpfulCount: 15,
      notHelpfulCount: 1,
      viewCount: 198
    },
    {
      title: 'Hardware Refresh Program — FAQ',
      content: `# Hardware Refresh Program — FAQ

IT refreshes employee hardware on a rolling 3-year cycle. Here are answers to common questions.

## Am I Eligible?

Check with your manager or submit a ticket asking IT to look up your device's age. Devices older than **3 years** are typically eligible.

## What Do I Get?

Standard refresh includes:
- Laptop (current spec for your role)
- Charging cable and adapter
- Docking station (if applicable to your role)

Monitors and peripherals are refreshed on a **5-year** cycle.

## How Do I Request a Refresh?

Submit a **Hardware** ticket with subject "Hardware Refresh Request — [Your Name]". Include your current device name (Settings → About).

## Data Migration

IT will schedule a 30-minute handoff session to:
1. Back up your data to OneDrive/SharePoint
2. Set up your new machine with standard software
3. Verify your data is accessible before you return the old device

## What Happens to the Old Device?

Old devices are wiped and either redeployed (for light-duty use) or recycled through our certified e-waste vendor.`,
      categoryId: hwCatId,
      createdBy: agent3Id,
      isPublished: true,
      helpfulCount: 11,
      notHelpfulCount: 0,
      viewCount: 143
    },
    {
      title: 'Draft: Configuring Multi-Factor Authentication (MFA)',
      content: `# Configuring Multi-Factor Authentication (MFA)

> **Note:** This article is in draft — screenshots pending.

MFA is required for all accounts with access to production systems.

## Supported Methods

1. **Authenticator App** (recommended) — Microsoft Authenticator or Google Authenticator
2. **SMS** — backup only, less secure
3. **Hardware Key** — YubiKey (contact IT to request one)

## Setup Steps

1. Go to [account.company.com](https://account.company.com)
2. Sign in → Security → Two-Factor Authentication
3. Click **Set up authenticator app**
4. Scan the QR code with your app
5. Enter the 6-digit code to confirm

## Backup Codes

After setup, download and store your **backup codes** in a safe place (e.g. a password manager). These let you log in if you lose your phone.`,
      categoryId: accCatId,
      createdBy: agent2Id,
      isPublished: false,
      helpfulCount: 0,
      notHelpfulCount: 0,
      viewCount: 3
    }
  ];

  for (const article of kbArticles) {
    await db.insert(schema.knowledgeBaseArticles).values(article).onConflictDoNothing();
  }

  console.log(`  ✓ ${kbArticles.length} KB articles created (${kbArticles.filter(a => a.isPublished).length} published, ${kbArticles.filter(a => !a.isPublished).length} draft)`);

  // ========================================
  // SUMMARY
  // ========================================

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Test Data Summary:');
  console.log('  Users: 11 total (1 Admin, 2 Team Leads, 3 Agents, 5 Employees)');
  console.log('  Employees: 5');
  console.log('  Categories: 4 (Hardware, Software, Network, Access)');
  console.log('  SLA Policies: 4 (P1-P4)');
  console.log('  Callers: 6 (5 employees + 1 guest)');
  console.log('  Tickets: 18 total');
  console.log('    - P1 (Critical): 2');
  console.log('    - P2 (High): 3');
  console.log('    - P3 (Medium): 5');
  console.log('    - P4 (Low): 8');
  console.log('  Ticket Status History: 17 entries');
  console.log('  KB Articles: 9 total (8 published, 1 draft)');
  console.log('\nDefault Credentials:');
  console.log('  Admin:     admin@company.com / admin123');
  console.log('  Team Lead: teamlead1@company.com / teamlead123');
  console.log('  Agent:     agent1@company.com / agent123');
  console.log('  Employee:  employee1@company.com / employee123');
  console.log('');
}

seed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
