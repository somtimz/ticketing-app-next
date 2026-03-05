'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ExclamationCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Problem {
  id: number;
  problemNumber: string;
  title: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  creatorName: string | null;
  incidentCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-900 text-blue-200',
  'Under Investigation': 'bg-yellow-900 text-yellow-200',
  'Known Error': 'bg-orange-900 text-orange-200',
  Resolved: 'bg-green-900 text-green-200',
  Closed: 'bg-gray-700 text-gray-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-900 text-red-200',
  P2: 'bg-orange-900 text-orange-200',
  P3: 'bg-yellow-900 text-yellow-200',
  P4: 'bg-gray-700 text-gray-300',
};

const STATUSES = ['', 'New', 'Under Investigation', 'Known Error', 'Resolved', 'Closed'];
const PRIORITIES = ['', 'P1', 'P2', 'P3', 'P4'];

export default function ProblemsPage() {
  const { data: session } = useSession();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'P3' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (priority) sp.set('priority', priority);

    const res = await fetch(`/api/problems?${sp}`);
    if (res.ok) {
      const data = await res.json();
      setProblems(data.problems ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [q, status, priority, page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ title: '', description: '', priority: 'P3' });
      load();
    } else {
      const d = await res.json();
      setError(d.message ?? 'Failed to create problem');
    }
    setSubmitting(false);
  };

  const role = session?.user?.role;
  const canCreate = role === 'Agent' || role === 'TeamLead' || role === 'Admin';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ExclamationCircleIcon className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Problem Management</h1>
            <p className="text-sm text-gray-400">{total} problem{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Problem
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search problems…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select
          value={priority}
          onChange={e => { setPriority(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {PRIORITIES.map(p => <option key={p} value={p}>{p || 'All Priorities'}</option>)}
        </select>
      </div>

      {/* New Problem modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Create Problem Record</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="P1">P1 — Critical</option>
                  <option value="P2">P2 — High</option>
                  <option value="P3">P3 — Medium</option>
                  <option value="P4">P4 — Low</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setError(''); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Creating…' : 'Create Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading…</div>
        ) : problems.length === 0 ? (
          <div className="p-12 text-center">
            <ExclamationCircleIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No problems found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Number</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Incidents</th>
                <th className="text-left px-4 py-3">Assigned To</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {problems.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/problems/${p.id}`} className="text-violet-400 hover:text-violet-300 font-mono font-medium">
                      {p.problemNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white font-medium max-w-xs truncate">
                    <Link href={`/dashboard/problems/${p.id}`} className="hover:text-violet-300">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PRIORITY_COLORS[p.priority] ?? 'bg-gray-700 text-gray-300'}`}>
                      {p.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{p.incidentCount}</td>
                  <td className="px-4 py-3 text-gray-300">{p.assigneeName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              disabled={page * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
