import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/layout/DashboardNav';
import LogoutButton from '@/components/layout/LogoutButton';
import NotificationBell from '@/components/NotificationBell';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-800 shrink-0">
          <img src="/compass.png" alt="Compass" className="w-7 h-7 rounded-md object-contain shrink-0" />
          <span className="text-white font-semibold text-sm">Compass</span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <DashboardNav userRole={session.user?.role as any} />
        </div>

        {/* User footer */}
        <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {session.user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{session.user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{session.user?.role}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0">
          <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full">
            {session.user?.role}
          </span>
          <NotificationBell />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
