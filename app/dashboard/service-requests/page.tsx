import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { serviceRequests, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { InboxStackIcon, PlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700'
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-blue-100 text-blue-700',
  P4: 'bg-gray-100 text-gray-600'
};

export default async function ServiceRequestsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');

  const rows = await db
    .select({
      id: serviceRequests.id,
      requestNumber: serviceRequests.requestNumber,
      title: serviceRequests.title,
      category: serviceRequests.category,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      createdAt: serviceRequests.createdAt,
      requester: { id: users.id, fullName: users.fullName }
    })
    .from(serviceRequests)
    .leftJoin(users, eq(serviceRequests.requesterId, users.id))
    .where(!isAgent ? eq(serviceRequests.requesterId, userId) : undefined as any)
    .orderBy(desc(serviceRequests.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAgent ? 'All service requests' : 'Your service requests'}
          </p>
        </div>
        <Link
          href="/dashboard/service-requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"
        >
          <PlusIcon className="h-4 w-4" />
          New Request
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <InboxStackIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No service requests yet.</p>
          <Link href="/dashboard/service-requests/new" className="mt-3 inline-block text-sm text-violet-600 hover:underline">Submit your first request</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {(['Request #', 'Title', 'Category', 'Priority', 'Status'] as const).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
                {isAgent && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(req => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/service-requests/${req.id}`} className="text-sm font-mono text-violet-700 hover:underline">
                      {req.requestNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">{req.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{req.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>{req.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                  </td>
                  {isAgent && <td className="px-4 py-3 text-sm text-gray-600">{req.requester?.fullName ?? '—'}</td>}
                  <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(req.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
