'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NEXT_STATUSES: Record<string, { label: string; status: string; danger?: boolean }[]> = {
  Submitted: [
    { label: 'Approve', status: 'Approved' },
    { label: 'Reject', status: 'Rejected', danger: true }
  ],
  Approved: [
    { label: 'Start Work', status: 'In Progress' },
    { label: 'Reject', status: 'Rejected', danger: true }
  ],
  'In Progress': [
    { label: 'Fulfill', status: 'Fulfilled' },
    { label: 'Reject', status: 'Rejected', danger: true }
  ]
};

export default function ServiceRequestActions({ srId, status }: { srId: number; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  const actions = NEXT_STATUSES[status] ?? [];
  if (actions.length === 0) return null;

  async function transition(toStatus: string) {
    if (toStatus === 'Rejected' && !showReject) {
      setShowReject(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/service-requests/${srId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus, rejectionReason: toStatus === 'Rejected' ? rejectionReason : undefined })
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to update status');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</h2>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {showReject && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Rejection reason *</label>
          <textarea rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => transition('Rejected')} disabled={!rejectionReason.trim() || loading}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50">
              Confirm Reject
            </button>
            <button onClick={() => setShowReject(false)} className="px-3 py-1.5 border border-gray-300 text-xs rounded text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
      {!showReject && actions.map(action => (
        <button key={action.status} onClick={() => transition(action.status)} disabled={loading}
          className={`w-full px-3 py-2 rounded text-sm font-medium disabled:opacity-50 ${
            action.danger
              ? 'border border-red-300 text-red-700 hover:bg-red-50'
              : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
