import * as schema from './schema';
import { db } from '../db';
import bcrypt from 'bcryptjs';
import type { NewCategory, NewUser, NewEmployee } from '@/types';

async function seed(): Promise<void> {
  console.log('Seeding database...');

  // Insert categories
  console.log('Inserting categories...');
  const categoriesData: NewCategory[] = [
    { name: 'Hardware', description: 'Issues with physical equipment', isActive: true },
    { name: 'Software', description: 'Issues with applications or software', isActive: true },
    { name: 'Network', description: 'Issues with WiFi, VPN, or connectivity', isActive: true },
    { name: 'Printer', description: 'Issues specifically related to printers', isActive: true },
    { name: 'Temperature', description: 'Issues related to office temperature', isActive: true },
    { name: 'Noise', description: 'Issues related to office noise', isActive: true }
  ];

  await db
    .insert(schema.categories)
    .values(categoriesData)
    .onConflictDoNothing();

  // Hash password for admin (default: admin123)
  const adminPasswordHash: string = await bcrypt.hash('admin123', 10);

  // Insert admin user
  console.log('Inserting admin user...');
  const adminUser: NewUser = {
    email: 'admin@company.com',
    passwordHash: adminPasswordHash,
    fullName: 'System Administrator',
    role: 'admin'
  };

  await db
    .insert(schema.users)
    .values(adminUser)
    .onConflictDoNothing();

  // Hash password for agents (default: agent123)
  const agentPasswordHash: string = await bcrypt.hash('agent123', 10);

  // Insert sample agents
  console.log('Inserting agents...');
  const agentsData: NewUser[] = [
    {
      email: 'agent1@company.com',
      passwordHash: agentPasswordHash,
      fullName: 'Sarah Johnson',
      role: 'agent'
    },
    {
      email: 'agent2@company.com',
      passwordHash: agentPasswordHash,
      fullName: 'Michael Chen',
      role: 'agent'
    },
    {
      email: 'agent3@company.com',
      passwordHash: agentPasswordHash,
      fullName: 'Emily Davis',
      role: 'agent'
    }
  ];

  await db
    .insert(schema.users)
    .values(agentsData)
    .onConflictDoNothing();

  // Insert sample employees
  console.log('Inserting employees...');
  const employeesData: NewEmployee[] = [
    {
      employeeId: 'EMP001',
      email: 'john.smith@company.com',
      fullName: 'John Smith',
      department: 'Engineering',
      phone: '555-0101',
      isActive: true
    },
    {
      employeeId: 'EMP002',
      email: 'jane.doe@company.com',
      fullName: 'Jane Doe',
      department: 'Marketing',
      phone: '555-0102',
      isActive: true
    },
    {
      employeeId: 'EMP003',
      email: 'bob.wilson@company.com',
      fullName: 'Bob Wilson',
      department: 'Sales',
      phone: '555-0103',
      isActive: true
    },
    {
      employeeId: 'EMP004',
      email: 'alice.brown@company.com',
      fullName: 'Alice Brown',
      department: 'HR',
      phone: '555-0104',
      isActive: true
    }
  ];

  await db
    .insert(schema.employees)
    .values(employeesData)
    .onConflictDoNothing();

  console.log('Database seeded successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin: admin@company.com / admin123');
  console.log('  Agent: agent1@company.com / agent123');
  console.log('  Agent: agent2@company.com / agent123');
  console.log('  Agent: agent3@company.com / agent123');
}

seed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
