import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { users, assets, tickets, serviceRequests } from '@/lib/db/schema';
import { eq, and, ne, notInArray } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Retired: 'bg-gray-100 text-gray-500',
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  New: 'bg-blue-100 text-blue-700',
  Assigned: 'bg-violet-100 text-violet-700',
  'On Hold': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-500'
};

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const targetId = parseInt(id, 10);
  if (isNaN(targetId)) notFound();

  const sessionUserId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');
  if (targetId !== sessionUserId && !isAgent) notFound();

  const [user] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, location: users.location })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!user) notFound();

  const [userAssets, openTickets, openRequests] = await Promise.all([
    db.select({ id: assets.id, assetTag: assets.assetTag, name: assets.name, type: assets.type, status: assets.status })
      .from(assets).where(eq(assets.assignedUserId, targetId)),
    db.select({ id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
      .from(tickets).where(and(eq(tickets.createdBy, targetId), ne(tickets.status, 'Closed'))),
    db.select({ id: serviceRequests.id, requestNumber: serviceRequests.requestNumber, title: serviceRequests.title, status: serviceRequests.status, priority: serviceRequests.priority, createdAt: serviceRequests.createdAt })
      .from(serviceRequests).where(and(eq(serviceRequests.requesterId, targetId), notInArray(serviceRequests.status, ['Fulfilled', 'Rejected'])))
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {user.email} · <span className="font-medium">{user.role}</span>
          {user.location ? ` · ${user.location}` : ''}
        </p>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Assets ({userAssets.length})</h2>
        {userAssets.length === 0 ? <p className="text-sm text-gray-400 italic">No assets assigned.</p> : (
          <ul className="divide-y divide-gray-100">
            {userAssets.map(a => (
              <li key={a.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-violet-700">{a.assetTag}</span>
                  <span className="text-sm text-gray-900">{a.name}</span>
                  <span className="text-xs text-gray-500">{a.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  <Link href={`/dashboard/assets/${a.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Open Incidents ({openTickets.length})</h2>
        {openTickets.length === 0 ? <p className="text-sm text-gray-400 italic">No open incidents.</p> : (
          <ul className="divide-y divide-gray-100">
            {openTickets.map(t => (
              <li key={t.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-violet-700">{t.ticketNumber}</span>
                  <span className="text-sm text-gray-900 truncate max-w-xs">{t.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                  <Link href={`/dashboard/issue-logging/${t.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Open Service Requests ({openRequests.length})</h2>
        {openRequests.length === 0 ? <p className="text-sm text-gray-400 italic">No open service requests.</p> : (
          <ul className="divide-y divide-gray-100">
            {openRequests.map(r => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-violet-700">{r.requestNumber}</span>
                  <span className="text-sm text-gray-900 truncate max-w-xs">{r.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  <Link href={`/dashboard/service-requests/${r.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
