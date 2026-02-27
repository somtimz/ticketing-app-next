import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { assets, assetHistory, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Retired: 'bg-gray-100 text-gray-500'
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) notFound();

  const rows = await db
    .select({
      asset: assets,
      assignedUser: { id: users.id, fullName: users.fullName, email: users.email }
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedUserId, users.id))
    .where(eq(assets.id, assetId))
    .limit(1);

  if (rows.length === 0) notFound();

  const { asset: a, assignedUser } = rows[0];
  const isAgent = hasRole(session, 'Agent');
  const userId = parseInt(session.user.id, 10);
  if (!isAgent && a.assignedUserId !== userId) notFound();

  const history = await db
    .select({
      id: assetHistory.id,
      assignedAt: assetHistory.assignedAt,
      returnedAt: assetHistory.returnedAt,
      notes: assetHistory.notes,
      assignedTo: { id: users.id, fullName: users.fullName }
    })
    .from(assetHistory)
    .leftJoin(users, eq(assetHistory.assignedToUserId, users.id))
    .where(eq(assetHistory.assetId, assetId))
    .orderBy(desc(assetHistory.assignedAt));

  const details: [string, string | null | undefined][] = [
    ['Type', a.type],
    ['Make', a.make],
    ['Model', a.model],
    ['Serial / License', a.serialNumber],
    ['Location', a.location],
    ['Cost', a.cost ? `$${a.cost}` : null],
    ['Purchase Date', a.purchaseDate ? format(new Date(a.purchaseDate), 'MMM d, yyyy') : null],
    ['Warranty Expiry', a.warrantyExpiry ? format(new Date(a.warrantyExpiry), 'MMM d, yyyy') : null],
    ['Assigned To', assignedUser?.fullName],
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{a.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 font-mono">{a.assetTag}</p>
        </div>
        <Link href="/dashboard/assets" className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          ← Back
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Details</h2>
          {details.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-900 font-medium">{value}</span>
            </div>
          ))}
        </div>
        {isAgent && a.status !== 'Retired' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
            <p className="text-xs text-gray-500">Use the API or a future actions panel to reassign or retire this asset.</p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Assignment History</h2>
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.id} className="text-sm text-gray-700 flex gap-4">
                <span className="text-gray-400 shrink-0">{format(new Date(h.assignedAt), 'MMM d, yyyy')}</span>
                <span>
                  Assigned to <strong>{h.assignedTo?.fullName ?? 'Unknown'}</strong>
                  {h.returnedAt && ` → returned ${format(new Date(h.returnedAt), 'MMM d, yyyy')}`}
                  {h.notes && <span className="text-gray-500"> — {h.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
