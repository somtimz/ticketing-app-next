'use client';

import Link from 'next/link';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const adminSections = [
  {
    title: 'Departments',
    description: 'Create and manage departments for team-level visibility and access control.',
    href: '/dashboard/admin/departments',
  },
  {
    title: 'Categories',
    description: 'Manage ticket categories and assign default agents.',
    href: '/dashboard/admin/categories',
  },
  {
    title: 'SLA Policies',
    description: 'Configure response and resolution time targets per priority level.',
    href: '/dashboard/admin/sla',
  },
  {
    title: 'User Management',
    description: 'Create, edit, and manage user accounts and roles.',
    href: '/dashboard/agents',
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="h-6 w-6 text-violet-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Administration</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          System configuration and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="block bg-white shadow-sm border border-gray-200 rounded-lg p-6 hover:border-primary-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-medium text-gray-900">{section.title}</h2>
            <p className="mt-2 text-sm text-gray-500">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
