'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ExclamationCircleIcon,
  ArrowLeftIcon,
  LinkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Problem {
  id: number;
  problemNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  rootCause: string | null;
  workaround: string | null;
  creator: { fullName: string; email: string } | null;
  assignedAgent: { id: number; fullName: string } | null;
  linkedIncidents: Array<{ id: number; ticketNumber: string; title: string; status: string; linkedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = ['New', 'Under Investigation', 'Known Error', 'Resolved', 'Closed'];
const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-900 text-blue-200',
  'Under Investigation': 'bg-yellow-900 text-yellow-200',
  'Known Error': 'bg-orange-900 text-orange-200',
  Resolved: 'bg-green-900 text-green-200',
  Closed: 'bg-gray-700 text-gray-300',
};

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [linkTicketId, setLinkTicketId] = useState('');
  const [linkError, setLinkError] = useState('');

  const role = session?.user?.role;
  const canEdit = role === 'Agent' || role === 'TeamLead' || role === 'Admin';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/problems/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProblem(data.problem);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patch = async (updates: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/problems/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setProblem(data.problem);
    }
    setSaving(false);
    setEditField(null);
  };

  const linkIncident = async () => {
    setLinkError('');
    const ticketId = parseInt(linkTicketId, 10);
    if (isNaN(ticketId)) { setLinkError('Enter a valid ticket ID'); return; }

    const res = await fetch(`/api/problems/${id}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId }),
    });
    if (res.ok) {
      setLinkTicketId('');
      load();
    } else {
      const d = await res.json();
      setLinkError(d.message ?? 'Failed to link');
    }
  };

  const unlinkIncident = async (ticketId: number) => {
    await fetch(`/api/problems/${id}/incidents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId }),
    });
    load();
  };

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!problem) return <div className="p-6 text-gray-400">Problem not found.</div>;

  const isTerminal = problem.status === 'Closed';

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <ExclamationCircleIcon className="h-6 w-6 text-violet-400" />
        <h1 className="text-xl font-bold text-white font-mono">{problem.problemNumber}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[problem.status] ?? ''}`}>
          {problem.status}
        </span>
        {saving && <span className="text-xs text-gray-400 ml-2">Saving…</span>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            {editField === 'title' ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={fieldValue}
                  onChange={e => setFieldValue(e.target.value)}
                />
                <button onClick={() => patch({ title: fieldValue })} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Save</button>
                <button onClick={() => setEditField(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{problem.title}</h2>
                {canEdit && !isTerminal && (
                  <button onClick={() => { setEditField('title'); setFieldValue(problem.title); }} className="text-xs text-gray-500 hover:text-violet-400 shrink-0">Edit</button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Description</h3>
            {editField === 'description' ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={fieldValue}
                  onChange={e => setFieldValue(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => patch({ description: fieldValue })} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Save</button>
                  <button onClick={() => setEditField(null)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{problem.description}</p>
                {canEdit && !isTerminal && (
                  <button onClick={() => { setEditField('description'); setFieldValue(problem.description); }} className="text-xs text-gray-500 hover:text-violet-400 shrink-0">Edit</button>
                )}
              </div>
            )}
          </div>

          {/* Root Cause */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Root Cause Analysis</h3>
            {editField === 'rootCause' ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={4}
                  placeholder="Describe the root cause…"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={fieldValue}
                  onChange={e => setFieldValue(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => patch({ rootCause: fieldValue })} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Save</button>
                  <button onClick={() => setEditField(null)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{problem.rootCause || <span className="text-gray-500 italic">Not yet identified</span>}</p>
                {canEdit && !isTerminal && (
                  <button onClick={() => { setEditField('rootCause'); setFieldValue(problem.rootCause ?? ''); }} className="text-xs text-gray-500 hover:text-violet-400 shrink-0">Edit</button>
                )}
              </div>
            )}
          </div>

          {/* Workaround */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Workaround</h3>
            {editField === 'workaround' ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Describe any workaround…"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={fieldValue}
                  onChange={e => setFieldValue(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => patch({ workaround: fieldValue })} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Save</button>
                  <button onClick={() => setEditField(null)} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{problem.workaround || <span className="text-gray-500 italic">No workaround documented</span>}</p>
                {canEdit && !isTerminal && (
                  <button onClick={() => { setEditField('workaround'); setFieldValue(problem.workaround ?? ''); }} className="text-xs text-gray-500 hover:text-violet-400 shrink-0">Edit</button>
                )}
              </div>
            )}
          </div>

          {/* Linked Incidents */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" /> Linked Incidents ({problem.linkedIncidents.length})
            </h3>
            {canEdit && !isTerminal && (
              <div className="flex gap-2 mb-4">
                <input
                  type="number"
                  placeholder="Ticket ID"
                  value={linkTicketId}
                  onChange={e => setLinkTicketId(e.target.value)}
                  className="w-32 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button onClick={linkIncident} className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm">Link Incident</button>
                {linkError && <span className="text-xs text-red-400 self-center">{linkError}</span>}
              </div>
            )}
            {problem.linkedIncidents.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No incidents linked yet</p>
            ) : (
              <div className="space-y-2">
                {problem.linkedIncidents.map(inc => (
                  <div key={inc.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/issue-logging/${inc.id}`} className="font-mono text-sm text-violet-400 hover:text-violet-300">{inc.ticketNumber}</Link>
                      <span className="text-sm text-gray-300 truncate max-w-xs">{inc.title}</span>
                      <span className="text-xs text-gray-500">{inc.status}</span>
                    </div>
                    {canEdit && !isTerminal && (
                      <button onClick={() => unlinkIncident(inc.id)} className="text-gray-500 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          {canEdit && !isTerminal && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
              <select
                value={problem.status}
                onChange={e => patch({ status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Priority */}
          {canEdit && !isTerminal && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
              <select
                value={problem.priority}
                onChange={e => patch({ priority: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {/* Details */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</h3>
            <div>
              <p className="text-xs text-gray-500">Created by</p>
              <p className="text-sm text-gray-300">{problem.creator?.fullName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned to</p>
              <p className="text-sm text-gray-300">{problem.assignedAgent?.fullName ?? 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm text-gray-300">{new Date(problem.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last updated</p>
              <p className="text-sm text-gray-300">{new Date(problem.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
