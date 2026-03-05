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
  UserCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItem?: boolean;
}

const baseNavItems: NavItem[] = [
  { href: '/dashboard/home', label: 'Home', icon: HomeIcon },
  { href: '/dashboard/issue-logging', label: 'Issue Logging', icon: ClipboardDocumentListIcon },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: TicketIcon },
  { href: '/dashboard/service-catalog', label: 'Service Catalog', icon: ShoppingBagIcon },
  { href: '/dashboard/service-requests', label: 'Service Requests', icon: InboxStackIcon },
  { href: '/dashboard/assets', label: 'Assets', icon: ComputerDesktopIcon },
  { href: '/dashboard/kb', label: 'Knowledge Base', icon: BookOpenIcon },
];

const agentNavItems: NavItem[] = [
  { href: '/dashboard/all-tickets', label: 'All Tickets', icon: QueueListIcon },
  { href: '/dashboard/problems', label: 'Problem Management', icon: ExclamationCircleIcon },
  { href: '/dashboard/changes', label: 'Change Management', icon: ArrowPathIcon },
  { href: '/dashboard/analytics', label: 'Analytics', icon: ChartBarIcon },
  { href: '/dashboard/analytics/incidents', label: 'Incident Analytics', icon: ExclamationTriangleIcon, subItem: true },
];

const adminNavItems: NavItem[] = [
  { href: '/dashboard/admin', label: 'Administration', icon: Cog6ToothIcon },
  { href: '/dashboard/admin/templates', label: 'Response Templates', icon: DocumentTextIcon, subItem: true },
  { href: '/dashboard/admin/escalation', label: 'Escalation Rules', icon: ArrowTrendingUpIcon, subItem: true },
  { href: '/dashboard/admin/departments', label: 'Departments', icon: BuildingOffice2Icon, subItem: true },
  { href: '/dashboard/admin/categories', label: 'Categories', icon: TagIcon, subItem: true },
  { href: '/dashboard/admin/sla', label: 'SLA Policies', icon: ClockIcon, subItem: true },
  { href: '/dashboard/admin/guest-users', label: 'Guest Users', icon: UserGroupIcon, subItem: true },
  { href: '/dashboard/admin/customers', label: 'Customers', icon: UserCircleIcon, subItem: true },
  { href: '/dashboard/agents', label: 'Manage Users', icon: UsersIcon, subItem: true },
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

  // Paths that should NOT trigger startsWith child-route matching
  const exactOnlyPaths = new Set([
    '/dashboard/admin',
    '/dashboard/analytics',
    '/dashboard/home',
  ]);

  return (
    <nav className="p-3 space-y-0.5">
      {allNavItems.map((item: NavItem) => {
        const isActive =
          pathname === item.href ||
          (!exactOnlyPaths.has(item.href) && pathname.startsWith(item.href + '/'));
        const isSubItem = item.subItem ?? false;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSubItem ? 'pl-7 text-xs' : ''
            } ${
              isActive
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon className={`shrink-0 ${isSubItem ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
