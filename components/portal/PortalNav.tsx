'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, TicketIcon, BookOpenIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const navItems = [
  { href: '/portal', label: 'Home', icon: HomeIcon, exact: true },
  { href: '/portal/tickets', label: 'My Requests', icon: TicketIcon, exact: false },
  { href: '/portal/kb', label: 'Help Center', icon: BookOpenIcon, exact: false },
  { href: '/portal/settings', label: 'Settings', icon: Cog6ToothIcon, exact: false }
];

export default function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-violet-100 text-violet-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
