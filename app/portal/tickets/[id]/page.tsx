import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets, comments, users } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import PortalCommentForm from './PortalCommentForm';

export default async function PortalTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = parseInt(session!.user!.id);
  const ticketId = parseInt(id);

  const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket.length) notFound();

  // Client can only see their own tickets
  if (ticket[0].requesterId !== userId) redirect('/portal/tickets');

  const ticketComments = await db
    .select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, authorName: users.fullName, isInternal: comments.isInternal })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.ticketId, ticketId), eq(comments.isInternal, false)))
    .orderBy(asc(comments.createdAt));

  const t = ticket[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-400 mb-1">{t.ticketNumber}</p>
        <h1 className="text-2xl font-semibold text-gray-900">{t.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t.status}</span>
          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{t.priority}</span>
          <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.description}</p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Comments</h2>
        <div className="space-y-3">
          {ticketComments.map(c => (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-900">{c.authorName}</span>
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-700">{c.body}</p>
            </div>
          ))}
          {ticketComments.length === 0 && (
            <p className="text-sm text-gray-400">No comments yet.</p>
          )}
        </div>
        <div className="mt-4">
          <PortalCommentForm ticketId={ticketId} />
        </div>
      </div>
    </div>
  );
}
