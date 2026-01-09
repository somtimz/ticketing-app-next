import * as schema from './schema';
import { db } from '../db';
import bcrypt from 'bcryptjs';
import type { NewCategory, NewUser, NewEmployee, NewTicket, NewCaller, NewSlaPolicy } from '@/types';
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
  const slaPoliciesData: NewSlaPolicy[] = [
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
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed',
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
      'In Progress',
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
      'Open',
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
      'In Progress',
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
      'Open',
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
      'In Progress',
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
      'In Progress',
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
      'Open',
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
      'Open',
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
  addStatusChange('TICK-1002', 'Open', 'In Progress', 'agent1@company.com', 'Acknowledged critical issue', 115);
  addStatusChange('TICK-1002', 'In Progress', 'Resolved', 'agent1@company.com', 'Replaced faulty RAM module', 90);

  addStatusChange('TICK-1005', 'Open', 'In Progress', 'agent2@company.com', 'Investigating permission issue', 195);
  addStatusChange('TICK-1005', 'In Progress', 'Resolved', 'agent2@company.com', 'Reset AD permissions', 180);

  addStatusChange('TICK-1007', 'Open', 'In Progress', 'agent3@company.com', 'Installing Adobe Creative Cloud', 230);
  addStatusChange('TICK-1007', 'In Progress', 'Resolved', 'agent3@company.com', 'Installation complete', 210);

  addStatusChange('TICK-1009', 'Open', 'Resolved', 'agent1@company.com', 'Password reset completed', 350);
  addStatusChange('TICK-1009', 'Resolved', 'Closed', 'agent1@company.com', 'User confirmed new password working', 340);

  addStatusChange('TICK-1012', 'Open', 'In Progress', 'agent3@company.com', 'Ordering monitor arm', 530);
  addStatusChange('TICK-1012', 'In Progress', 'Resolved', 'agent3@company.com', 'Monitor arm installed', 500);

  addStatusChange('TICK-1013', 'Open', 'Resolved', 'agent1@company.com', 'Confirmed update safe, user proceeded', 580);

  addStatusChange('TICK-1014', 'Open', 'In Progress', 'agent2@company.com', 'Processing access request', 710);
  addStatusChange('TICK-1014', 'In Progress', 'Resolved', 'agent2@company.com', 'Access granted', 700);

  addStatusChange('TICK-1016', 'Open', 'In Progress', 'agent3@company.com', 'Installing VPN client', 1060);
  addStatusChange('TICK-1016', 'In Progress', 'Resolved', 'agent3@company.com', 'VPN installed and tested', 1050);
  addStatusChange('TICK-1016', 'Resolved', 'Closed', 'agent3@company.com', 'User confirmed working', 1040);

  addStatusChange('TICK-1017', 'Open', 'In Progress', 'agent1@company.com', 'Diagnosing mouse issue', 1220);
  addStatusChange('TICK-1017', 'In Progress', 'Resolved', 'agent1@company.com', 'Replaced mouse', 1200);

  addStatusChange('TICK-1018', 'Open', 'Resolved', 'agent2@company.com', 'Provided email signature instructions', 1400);

  // Add status history for in-progress tickets
  addStatusChange('TICK-1001', 'Open', 'In Progress', 'agent1@company.com', 'Investigating database connectivity issue', 25);

  addStatusChange('TICK-1004', 'Open', 'In Progress', 'agent2@company.com', 'Checking Outlook configuration', 145);

  addStatusChange('TICK-1008', 'Open', 'In Progress', 'agent3@company.com', 'Checking AP in conference room', 295);

  addStatusChange('TICK-1010', 'Open', 'In Progress', 'agent2@company.com', 'Preparing new employee account setup', 395);

  await db.insert(schema.ticketStatusHistory).values(statusHistoryData).onConflictDoNothing();
  console.log(`  ✓ ${statusHistoryData.length} Status history entries created`);

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
