import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  InProgress: 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
};

export default async function PortalTicketsPage() {
  const session = await auth();
  const userId = parseInt(session!.user!.id);

  const myTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.createdBy, userId))
    .orderBy(desc(tickets.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
        <Link
          href="/portal/tickets/new"
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
        >
          Submit ticket
        </Link>
      </div>

      {myTickets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No tickets yet.</p>
          <Link href="/portal/tickets/new" className="text-violet-600 text-sm hover:underline mt-2 block">
            Submit your first ticket →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {myTickets.map(ticket => (
            <Link
              key={ticket.id}
              href={`/portal/tickets/${ticket.id}`}
              className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-violet-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{ticket.title}</span>
                  <span className="text-xs text-gray-400 ml-2">{ticket.ticketNumber}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
