import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from '@/components/layout/LogoutButton';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 justify-between">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="flex items-center gap-2">
            <img src="/compass.png" alt="Compass" className="w-6 h-6 object-contain" />
            <span className="font-semibold text-sm text-gray-900">Compass</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/portal/tickets" className="text-gray-600 hover:text-gray-900">My Tickets</Link>
            <Link href="/portal/tickets/new" className="text-gray-600 hover:text-gray-900">Submit Ticket</Link>
            <Link href="/portal/kb" className="text-gray-600 hover:text-gray-900">Knowledge Base</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user?.name}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
