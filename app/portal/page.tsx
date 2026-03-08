import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function PortalDashboard() {
  const session = await auth();
  const userId = parseInt(session!.user!.id);

  const myTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.createdBy, userId))
    .orderBy(desc(tickets.createdAt))
    .limit(5);

  const resolvedCount = myTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const openCount = myTickets.length - resolvedCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Support Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Track your tickets and find answers in the knowledge base.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{openCount}</p>
          <p className="text-sm text-gray-500">Open tickets</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{resolvedCount}</p>
          <p className="text-sm text-gray-500">Resolved</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/portal/tickets/new"
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
        >
          Submit a ticket
        </Link>
        <Link
          href="/portal/kb"
          className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Browse knowledge base
        </Link>
      </div>

      {/* Recent tickets */}
      {myTickets.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Recent tickets</h2>
          <div className="space-y-2">
            {myTickets.map(ticket => (
              <Link
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-violet-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{ticket.title}</span>
                  <span className="text-xs text-gray-500">{ticket.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{ticket.ticketNumber}</p>
              </Link>
            ))}
          </div>
          <Link href="/portal/tickets" className="text-xs text-violet-600 hover:underline mt-2 block">
            View all tickets →
          </Link>
        </div>
      )}
    </div>
  );
}
