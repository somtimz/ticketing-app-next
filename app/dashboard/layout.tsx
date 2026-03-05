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
          <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm leading-tight">Issue Logging<br /><span className="text-gray-400 font-normal text-xs">System</span></span>
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
