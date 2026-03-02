'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/types';
import {
  ClipboardDocumentListIcon,
  TicketIcon,
  QueueListIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  TagIcon,
  ClockIcon,
  UsersIcon,
  ComputerDesktopIcon,
  InboxStackIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseNavItems: NavItem[] = [
  { href: '/dashboard/issue-logging', label: 'Issue Logging', icon: ClipboardDocumentListIcon },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: TicketIcon },
  { href: '/dashboard/all-tickets', label: 'All Tickets', icon: QueueListIcon },
  { href: '/dashboard/assets', label: 'Assets', icon: ComputerDesktopIcon },
  { href: '/dashboard/service-requests', label: 'Service Requests', icon: InboxStackIcon },
  { href: '/dashboard/kb', label: 'Knowledge Base', icon: BookOpenIcon },
];

const agentNavItems: NavItem[] = [
  { href: '/dashboard/analytics', label: 'Analytics', icon: ChartBarIcon },
];

const adminNavItems: NavItem[] = [
  { href: '/dashboard/admin', label: 'Administration', icon: Cog6ToothIcon },
  { href: '/dashboard/admin/departments', label: 'Departments', icon: BuildingOffice2Icon },
  { href: '/dashboard/admin/categories', label: 'Categories', icon: TagIcon },
  { href: '/dashboard/admin/sla', label: 'SLA Policies', icon: ClockIcon },
  { href: '/dashboard/admin/guest-users', label: 'Guest Users', icon: UserGroupIcon },
  { href: '/dashboard/agents', label: 'Manage Users', icon: UsersIcon },
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
    ...(isAdmin ? adminNavItems : []),
  ];

  return (
    <nav className="p-3 space-y-0.5">
      {allNavItems.map((item: NavItem) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard/admin' && pathname.startsWith(item.href + '/'));
        const isSubItem =
          item.href.startsWith('/dashboard/admin/') || item.href === '/dashboard/agents';
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSubItem ? 'pl-6' : ''
            } ${
              isActive
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
