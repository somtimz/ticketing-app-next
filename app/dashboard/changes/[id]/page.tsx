'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Change {
  id: number;
  changeNumber: string;
  title: string;
  description: string;
  changeType: string;
  status: string;
  riskLevel: string;
  impactLevel: string;
  implementationPlan: string | null;
  backoutPlan: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  creator: { fullName: string; email: string } | null;
  assignedAgent: { id: number; fullName: string } | null;
  approvals: Array<{
    id: number;
    role: string;
    status: string;
    respondedAt: string | null;
    notes: string | null;
    approverName: string | null;
    approverEmail: string | null;
  }>;
  affectedCIs: Array<{
    id: number;
    assetId: number;
    assetTag: string | null;
    name: string | null;
    assetType: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = ['Draft', 'Submitted', 'CAB Review', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Cancelled'];
const TERMINAL = new Set(['Completed', 'Failed', 'Cancelled']);

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-700 text-gray-300',
  Submitted: 'bg-blue-900 text-blue-200',
  'CAB Review': 'bg-purple-900 text-purple-200',
  Approved: 'bg-green-900 text-green-200',
  Scheduled: 'bg-teal-900 text-teal-200',
  'In Progress': 'bg-yellow-900 text-yellow-200',
  Completed: 'bg-green-800 text-green-100',
  Failed: 'bg-red-900 text-red-200',
  Cancelled: 'bg-gray-700 text-gray-400',
};

const APPROVAL_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-900 text-yellow-200',
  Approved: 'bg-green-900 text-green-200',
  Rejected: 'bg-red-900 text-red-200',
};

export default function ChangeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [change, setChange] = useState<Change | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  const role = session?.user?.role;
  const canEdit = role === 'Agent' || role === 'TeamLead' || role === 'Admin';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/changes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setChange(data.change);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patch = async (updates: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setChange(prev => prev ? { ...prev, ...data.change } : data.change);
    }
    setSaving(false);
    setEditField(null);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!change) return <div className="p-6 text-gray-400">Change not found.</div>;

  const isTerminal = TERMINAL.has(change.status);

  const EditableText = ({ field, label, rows = 3 }: { field: string; label: string; rows?: number }) => {
    const value = change[field as keyof Change] as string | null;
    if (editField === field) {
      return (
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={rows}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={fieldValue}
            onChange={e => setFieldValue(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => patch({ [field]: fieldValue })} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Save</button>
            <button onClick={() => setEditField(null)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Cancel</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="text-gray-300 text-sm whitespace-pre-wrap">{value || <span className="text-gray-500 italic">Not provided</span>}</p>
        {canEdit && !isTerminal && (
          <button onClick={() => { setEditField(field); setFieldValue(value ?? ''); }} className="text-xs text-gray-500 hover:text-violet-400 shrink-0">Edit</button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <ArrowPathIcon className="h-6 w-6 text-violet-400" />
        <h1 className="text-xl font-bold text-white font-mono">{change.changeNumber}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[change.status] ?? ''}`}>
          {change.status}
        </span>
        <span className="text-sm text-gray-400">{change.changeType}</span>
        {saving && <span className="text-xs text-gray-400 ml-2">Saving…</span>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            {editField === 'title' ? (
              <div className="flex gap-2">
                <input autoFocus className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={fieldValue} onChange={e => setFieldValue(e.target.value)} />
                <button onClick={() => patch({ title: fieldValue })} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Save</button>
                <button onClick={() => setEditField(null)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{change.title}</h2>
                {canEdit && !isTerminal && (
                  <button onClick={() => { setEditField('title'); setFieldValue(change.title); }} className="text-xs text-gray-500 hover:text-violet-400 shrink-0">Edit</button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Description</h3>
            <EditableText field="description" label="Description" rows={4} />
          </div>

          {/* Implementation Plan */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Implementation Plan</h3>
            <EditableText field="implementationPlan" label="Implementation Plan" rows={4} />
          </div>

          {/* Backout Plan */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Backout Plan</h3>
            <EditableText field="backoutPlan" label="Backout Plan" rows={3} />
          </div>

          {/* Approvals */}
          {change.approvals.length > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">CAB Approvals</h3>
              <div className="space-y-2">
                {change.approvals.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{a.approverName ?? a.approverEmail}</p>
                      <p className="text-xs text-gray-400">{a.role}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${APPROVAL_COLORS[a.status] ?? ''}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected CIs */}
          {change.affectedCIs.length > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Affected CIs ({change.affectedCIs.length})</h3>
              <div className="space-y-2">
                {change.affectedCIs.map(ci => (
                  <div key={ci.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                    <span className="font-mono text-sm text-violet-400">{ci.assetTag}</span>
                    <span className="text-sm text-gray-300">{ci.name}</span>
                    <span className="text-xs text-gray-500">{ci.assetType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          {canEdit && !isTerminal && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
              <select
                value={change.status}
                onChange={e => patch({ status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Details */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</h3>
            <div>
              <p className="text-xs text-gray-500">Risk</p>
              <p className="text-sm font-medium text-orange-400">{change.riskLevel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Impact</p>
              <p className="text-sm text-gray-300">{change.impactLevel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created by</p>
              <p className="text-sm text-gray-300">{change.creator?.fullName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned to</p>
              <p className="text-sm text-gray-300">{change.assignedAgent?.fullName ?? 'Unassigned'}</p>
            </div>
            {change.scheduledStart && (
              <div>
                <p className="text-xs text-gray-500">Scheduled start</p>
                <p className="text-sm text-gray-300">{new Date(change.scheduledStart).toLocaleString()}</p>
              </div>
            )}
            {change.scheduledEnd && (
              <div>
                <p className="text-xs text-gray-500">Scheduled end</p>
                <p className="text-sm text-gray-300">{new Date(change.scheduledEnd).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm text-gray-300">{new Date(change.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
