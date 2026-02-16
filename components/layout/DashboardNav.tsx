'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem, UserRole } from '@/types';

const baseNavItems: NavItem[] = [
  { href: '/dashboard/issue-logging', label: 'Issue Logging', icon: '📋' },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: '🎫' },
  { href: '/dashboard/all-tickets', label: 'All Tickets', icon: '📑' },
  { href: '/dashboard/kb', label: 'Knowledge Base', icon: '📚' }
];

const agentNavItems: NavItem[] = [
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' }
];

const adminNavItems: NavItem[] = [
  { href: '/dashboard/admin', label: 'Administration', icon: '⚙️' },
  { href: '/dashboard/admin/departments', label: 'Departments', icon: '🏢' },
  { href: '/dashboard/admin/categories', label: 'Categories', icon: '🏷️' },
  { href: '/dashboard/admin/sla', label: 'SLA Policies', icon: '⏱️' },
  { href: '/dashboard/agents', label: 'Manage Users', icon: '👥' }
];

interface DashboardNavProps {
  userRole?: UserRole | null;
}

export default function DashboardNav({ userRole }: DashboardNavProps): JSX.Element {
  const pathname = usePathname();
  const isAdmin = userRole === 'Admin';
  const isAgentOrAbove = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';

  const allNavItems = [
    ...baseNavItems,
    ...(isAgentOrAbove ? agentNavItems : []),
    ...(isAdmin ? adminNavItems : [])
  ];

  return (
    <nav className="p-4 space-y-1">
      {allNavItems.map((item: NavItem) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href + '/'));
        const isSubItem = item.href.startsWith('/dashboard/admin/') || item.href === '/dashboard/agents';
        const isAdminSection = isSubItem && isAdmin;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isAdminSection ? 'pl-8' : ''
            } ${
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
