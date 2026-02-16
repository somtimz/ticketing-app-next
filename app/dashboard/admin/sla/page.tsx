'use client';

import { useState, useEffect, type FormEvent } from 'react';

interface SLAPolicy {
  id: number;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

const DEFAULT_POLICIES = [
  { priority: 'P1', firstResponseMinutes: 15, resolutionMinutes: 240 },
  { priority: 'P2', firstResponseMinutes: 60, resolutionMinutes: 1440 },
  { priority: 'P3', firstResponseMinutes: 240, resolutionMinutes: 4320 },
  { priority: 'P4', firstResponseMinutes: 1440, resolutionMinutes: 10080 },
];

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + 'm' : ''}`.trim();
  const days = Math.floor(minutes / 1440);
  const remainHours = Math.floor((minutes % 1440) / 60);
  return `${days}d ${remainHours ? remainHours + 'h' : ''}`.trim();
}

export default function SLAPoliciesPage() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstResponseMinutes: 0, resolutionMinutes: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/sla-policies');
      if (res.ok) {
        const data = await res.json() as { policies: SLAPolicy[] };
        setPolicies(data.policies);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchPolicies(); }, []);

  // Merge fetched policies with defaults
  const displayPolicies = DEFAULT_POLICIES.map(dp => {
    const existing = policies.find(p => p.priority === dp.priority);
    return existing || { id: 0, ...dp };
  });

  const startEdit = (policy: SLAPolicy) => {
    setEditingPriority(policy.priority);
    setFormData({
      firstResponseMinutes: policy.firstResponseMinutes,
      resolutionMinutes: policy.resolutionMinutes,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPriority) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/sla-policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: editingPriority,
          ...formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message || 'Failed to update policy');
        return;
      }

      setSuccess(`${editingPriority} policy updated`);
      setEditingPriority(null);
      void fetchPolicies();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColors: Record<string, string> = {
    P1: 'bg-red-100 text-red-800',
    P2: 'bg-orange-100 text-orange-800',
    P3: 'bg-yellow-100 text-yellow-800',
    P4: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">SLA Policies</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure first response and resolution targets per priority level
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">SLA Targets</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">First Response</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Resolution</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayPolicies.map(policy => (
                <tr key={policy.priority}>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[policy.priority] || ''}`}>
                      {policy.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {editingPriority === policy.priority ? (
                      <input
                        type="number"
                        min="1"
                        value={formData.firstResponseMinutes}
                        onChange={e => setFormData({ ...formData, firstResponseMinutes: parseInt(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      formatTime(policy.firstResponseMinutes)
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {editingPriority === policy.priority ? (
                      <input
                        type="number"
                        min="1"
                        value={formData.resolutionMinutes}
                        onChange={e => setFormData({ ...formData, resolutionMinutes: parseInt(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      formatTime(policy.resolutionMinutes)
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingPriority === policy.priority ? (
                      <form onSubmit={handleSubmit} className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="text-sm text-green-600 hover:underline disabled:opacity-50"
                        >
                          {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPriority(null)}
                          className="text-sm text-gray-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => startEdit(policy)}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Time values are in minutes</h3>
        <p className="text-xs text-gray-500">
          Common conversions: 1 hour = 60, 4 hours = 240, 24 hours = 1440, 3 days = 4320, 7 days = 10080
        </p>
      </div>
    </div>
  );
}
