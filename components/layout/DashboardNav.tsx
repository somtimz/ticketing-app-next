'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/types';

const navItems: NavItem[] = [
  { href: '/dashboard/issue-logging', label: 'Issue Logging', icon: '📋' },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: '🎫' },
  { href: '/dashboard/all-tickets', label: 'All Tickets', icon: '📑' }
];

export default function DashboardNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="p-4 space-y-2">
      {navItems.map((item: NavItem) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            pathname === item.href
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
