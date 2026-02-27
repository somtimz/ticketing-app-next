import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { serviceRequests, serviceRequestComments, users, assetLinks, assets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { format } from 'date-fns';
import ServiceRequestActions from '@/components/service-requests/ServiceRequestActions';

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700'
};

export default async function ServiceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const srId = parseInt(id, 10);
  if (isNaN(srId)) notFound();

  const [sr] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, srId)).limit(1);
  if (!sr) notFound();

  const userId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');
  if (!isAgent && sr.requesterId !== userId) notFound();

  const [requester] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users).where(eq(users.id, sr.requesterId)).limit(1);

  let assignedAgent: { fullName: string } | null = null;
  if (sr.assignedAgentId) {
    const [a] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, sr.assignedAgentId)).limit(1);
    assignedAgent = a ?? null;
  }

  const comments = await db
    .select({
      id: serviceRequestComments.id,
      body: serviceRequestComments.body,
      createdAt: serviceRequestComments.createdAt,
      author: { id: users.id, fullName: users.fullName, role: users.role }
    })
    .from(serviceRequestComments)
    .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
    .where(eq(serviceRequestComments.serviceRequestId, srId))
    .orderBy(asc(serviceRequestComments.createdAt));

  const linkedAssets = await db
    .select({ id: assets.id, assetTag: assets.assetTag, name: assets.name, type: assets.type, status: assets.status })
    .from(assetLinks)
    .innerJoin(assets, eq(assetLinks.assetId, assets.id))
    .where(eq(assetLinks.serviceRequestId, srId));

  const sidebarDetails: [string, string | null | undefined][] = [
    ['Category', sr.category],
    ['Requester', requester?.fullName],
    ['Assigned To', assignedAgent?.fullName ?? 'Unassigned'],
    ['Submitted', format(new Date(sr.createdAt), 'MMM d, yyyy')],
    ...(sr.approvedAt ? [['Approved', format(new Date(sr.approvedAt), 'MMM d, yyyy')] as [string, string]] : []),
    ...(sr.fulfilledAt ? [['Fulfilled', format(new Date(sr.fulfilledAt), 'MMM d, yyyy')] as [string, string]] : []),
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{sr.title}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[sr.status]}`}>{sr.status}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{sr.priority}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 font-mono">{sr.requestNumber}</p>
        </div>
        <Link href="/dashboard/service-requests" className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{sr.description}</p>
          </div>

          {sr.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="mt-1 text-sm text-red-700">{sr.rejectionReason}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
            {comments.length === 0 && <p className="text-sm text-gray-400 italic">No comments yet.</p>}
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-semibold shrink-0">
                  {c.author.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{c.author.fullName}</span>
                    <span>{format(new Date(c.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          {linkedAssets.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Linked Assets</h2>
              <ul className="space-y-2">
                {linkedAssets.map(a => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-violet-700">{a.assetTag}</span>
                      <span className="text-gray-900">{a.name}</span>
                    </div>
                    <Link href={`/dashboard/assets/${a.id}`} className="text-xs text-violet-600 hover:underline">View</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</h2>
            {sidebarDetails.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
          {isAgent && <ServiceRequestActions srId={srId} status={sr.status} />}
        </div>
      </div>
    </div>
  );
}
