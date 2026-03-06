import { auth } from '@/lib/auth';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets, knowledgeBaseArticles } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import TicketStatusBadge from '@/components/portal/TicketStatusBadge';

export default async function PortalHomePage() {
  const session = await auth();
  const userId = parseInt(session!.user.id, 10);

  const activeTickets = await db
    .select({ id: tickets.id, ticketNumber: tickets.ticketNumber, title: tickets.title, status: tickets.status, priority: tickets.priority, createdAt: tickets.createdAt })
    .from(tickets)
    .where(
      and(
        eq(tickets.createdBy, userId),
        or(
          eq(tickets.status, 'New'),
          eq(tickets.status, 'Assigned'),
          eq(tickets.status, 'InProgress'),
          eq(tickets.status, 'Pending')
        )
      )
    )
    .orderBy(desc(tickets.createdAt))
    .limit(5);

  const recentArticles = await db
    .select({ id: knowledgeBaseArticles.id, title: knowledgeBaseArticles.title })
    .from(knowledgeBaseArticles)
    .where(eq(knowledgeBaseArticles.isPublished, true))
    .orderBy(desc(knowledgeBaseArticles.createdAt))
    .limit(4);

  const firstName = session!.user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Hello, {firstName}
        </h1>
        <p className="mt-1 text-gray-500">How can we help you today?</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/portal/tickets/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Submit a Request
          </Link>
          <Link
            href="/portal/kb"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            Browse Help Center
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Requests */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Active Requests</h2>
            <Link href="/portal/tickets" className="text-xs text-violet-600 hover:underline">View all</Link>
          </div>
          {activeTickets.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No active requests. You&apos;re all clear!</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activeTickets.map(ticket => (
                <li key={ticket.id}>
                  <Link href={`/portal/tickets/${ticket.id}`} className="flex items-center justify-between py-3 hover:text-violet-600 group">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{ticket.ticketNumber}</p>
                      <p className="text-sm text-gray-800 group-hover:text-violet-600 truncate">{ticket.title}</p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent KB Articles */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Help Center Articles</h2>
            <Link href="/portal/kb" className="text-xs text-violet-600 hover:underline">Browse all</Link>
          </div>
          {recentArticles.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No articles published yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentArticles.map(article => (
                <li key={article.id}>
                  <Link href={`/portal/kb/${article.id}`} className="flex items-center gap-2 py-3 text-sm text-gray-800 hover:text-violet-600">
                    <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
