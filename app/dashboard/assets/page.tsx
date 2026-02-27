import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { assets, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { ComputerDesktopIcon, PlusIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Retired: 'bg-gray-100 text-gray-500'
};

export default async function AssetsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = parseInt(session.user.id, 10);
  const isAgent = hasRole(session, 'Agent');

  const rows = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      type: assets.type,
      make: assets.make,
      model: assets.model,
      status: assets.status,
      location: assets.location,
      assignedUser: { id: users.id, fullName: users.fullName }
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedUserId, users.id))
    .where(!isAgent ? eq(assets.assignedUserId, userId) : undefined as any)
    .orderBy(desc(assets.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAgent ? 'All registered assets' : 'Your assigned assets'}
          </p>
        </div>
        {isAgent && (
          <Link
            href="/dashboard/assets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"
          >
            <PlusIcon className="h-4 w-4" />
            Register Asset
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ComputerDesktopIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No assets found.</p>
          <Link href="/dashboard/assets/new" className="mt-3 inline-block text-sm text-violet-600 hover:underline">Register your first asset</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {(['Tag', 'Name', 'Type', 'Make / Model', 'Status', 'Location'] as const).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
                {isAgent && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-violet-700">{asset.assetTag}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{asset.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{[asset.make, asset.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[asset.status] ?? ''}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{asset.location || '—'}</td>
                  {isAgent && <td className="px-4 py-3 text-sm text-gray-600">{asset.assignedUser?.fullName ?? 'Unassigned'}</td>}
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/assets/${asset.id}`} className="text-sm text-violet-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
