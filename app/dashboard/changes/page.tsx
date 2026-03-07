'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  TrashIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface Change {
  id: number;
  changeNumber: string;
  title: string;
  changeType: string;
  status: string;
  riskLevel: string;
  impactLevel: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  creatorName: string | null;
  assigneeName: string | null;
  createdAt: string;
}

interface FreezeWindow {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: { id: number; fullName: string } | null;
}

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

const RISK_COLORS: Record<string, string> = {
  Low: 'text-green-400',
  Medium: 'text-yellow-400',
  High: 'text-orange-400',
  Critical: 'text-red-400',
};

const STATUSES = ['', 'Draft', 'Submitted', 'CAB Review', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Failed', 'Cancelled'];
const TYPES = ['', 'Standard', 'Normal', 'Emergency'];

export default function ChangesPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<'changes' | 'freeze'>('changes');

  // Changes list state
  const [changes, setChanges] = useState<Change[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [changeType, setChangeType] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    changeType: 'Normal',
    riskLevel: 'Medium',
    impactLevel: 'Medium',
    scheduledStart: '',
    scheduledEnd: '',
    implementationPlan: '',
    backoutPlan: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Freeze windows state
  const [freezeWindows, setFreezeWindows] = useState<FreezeWindow[]>([]);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [showFreezeForm, setShowFreezeForm] = useState(false);
  const [freezeForm, setFreezeForm] = useState({ name: '', startDate: '', endDate: '', reason: '' });
  const [freezeSubmitting, setFreezeSubmitting] = useState(false);
  const [freezeError, setFreezeError] = useState('');

  const limit = 20;

  const role = session?.user?.role;
  const canCreate = role === 'Agent' || role === 'TeamLead' || role === 'Admin';
  const isAdmin = role === 'Admin';

  const loadChanges = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (changeType) sp.set('changeType', changeType);
    const res = await fetch(`/api/changes?${sp}`);
    if (res.ok) {
      const data = await res.json();
      setChanges(data.changes ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [q, status, changeType, page]);

  const loadFreezeWindows = useCallback(async () => {
    setFreezeLoading(true);
    const res = await fetch('/api/changes/freeze');
    if (res.ok) {
      const data = await res.json();
      setFreezeWindows(data.freezeWindows ?? []);
    }
    setFreezeLoading(false);
  }, []);

  useEffect(() => { loadChanges(); }, [loadChanges]);
  useEffect(() => { if (tab === 'freeze') loadFreezeWindows(); }, [tab, loadFreezeWindows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const body: Record<string, string | null> = {
      title: form.title,
      description: form.description,
      changeType: form.changeType,
      riskLevel: form.riskLevel,
      impactLevel: form.impactLevel,
      implementationPlan: form.implementationPlan || null,
      backoutPlan: form.backoutPlan || null,
      scheduledStart: form.scheduledStart || null,
      scheduledEnd: form.scheduledEnd || null,
    };
    const res = await fetch('/api/changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ title: '', description: '', changeType: 'Normal', riskLevel: 'Medium', impactLevel: 'Medium', scheduledStart: '', scheduledEnd: '', implementationPlan: '', backoutPlan: '' });
      loadChanges();
    } else {
      const d = await res.json();
      setError(d.message ?? 'Failed to create change');
    }
    setSubmitting(false);
  };

  const handleCreateFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setFreezeSubmitting(true);
    setFreezeError('');
    const res = await fetch('/api/changes/freeze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: freezeForm.name,
        startDate: freezeForm.startDate,
        endDate: freezeForm.endDate,
        reason: freezeForm.reason || null,
      }),
    });
    if (res.ok) {
      setShowFreezeForm(false);
      setFreezeForm({ name: '', startDate: '', endDate: '', reason: '' });
      loadFreezeWindows();
    } else {
      const d = await res.json();
      setFreezeError(d.message ?? 'Failed to create freeze window');
    }
    setFreezeSubmitting(false);
  };

  const deleteFreeze = async (id: number) => {
    if (!confirm('Delete this freeze window?')) return;
    await fetch(`/api/changes/freeze/${id}`, { method: 'DELETE' });
    loadFreezeWindows();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowPathIcon className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Change Management</h1>
            <p className="text-sm text-gray-400">RFC tracking &amp; change freeze calendar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/changes/calendar"
            className="flex items-center gap-2 border border-gray-700 hover:bg-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Calendar
          </Link>
          {tab === 'changes' && canCreate && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              New RFC
            </button>
          )}
          {tab === 'freeze' && isAdmin && (
            <button
              onClick={() => setShowFreezeForm(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <LockClosedIcon className="h-4 w-4" />
              Add Freeze Window
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {(['changes', 'freeze'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'changes' ? 'Change Requests' : '🔒 Freeze Windows'}
          </button>
        ))}
      </div>

      {/* ── CHANGE REQUESTS TAB ─────────────────────────── */}
      {tab === 'changes' && (
        <>
          {/* New RFC modal */}
          {showNew && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
              <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl my-8">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white">Create Request for Change (RFC)</h2>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                  {error && <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title <span className="text-red-400">*</span></label>
                    <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description <span className="text-red-400">*</span></label>
                    <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                      <select value={form.changeType} onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option>Standard</option>
                        <option>Normal</option>
                        <option>Emergency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Risk</label>
                      <select value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Impact</label>
                      <select value={form.impactLevel} onChange={e => setForm(f => ({ ...f, impactLevel: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled Start</label>
                      <input type="datetime-local" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled End</label>
                      <input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Implementation Plan</label>
                    <textarea rows={3} value={form.implementationPlan} onChange={e => setForm(f => ({ ...f, implementationPlan: e.target.value }))}
                      placeholder="Step-by-step implementation plan…"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Backout Plan</label>
                    <textarea rows={2} value={form.backoutPlan} onChange={e => setForm(f => ({ ...f, backoutPlan: e.target.value }))}
                      placeholder="How to roll back if something goes wrong…"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowNew(false); setError(''); }}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                      {submitting ? 'Creating…' : 'Submit RFC'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search changes…"
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
              value={changeType}
              onChange={e => { setChangeType(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading…</div>
            ) : changes.length === 0 ? (
              <div className="p-12 text-center">
                <ArrowPathIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No change requests found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Number</th>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Risk</th>
                    <th className="text-left px-4 py-3">Scheduled</th>
                    <th className="text-left px-4 py-3">Created by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {changes.map(c => (
                    <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/changes/${c.id}`} className="text-violet-400 hover:text-violet-300 font-mono font-medium">
                          {c.changeNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white font-medium max-w-xs truncate">
                        <Link href={`/dashboard/changes/${c.id}`} className="hover:text-violet-300">{c.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{c.changeType}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-700 text-gray-300'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${RISK_COLORS[c.riskLevel] ?? 'text-gray-400'}`}>
                        {c.riskLevel}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {c.scheduledStart ? new Date(c.scheduledStart).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{c.creatorName ?? '—'}</td>
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
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700">Previous</button>
                <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── FREEZE WINDOWS TAB ─────────────────────────── */}
      {tab === 'freeze' && (
        <>
          {/* Create freeze modal */}
          {showFreezeForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <LockClosedIcon className="h-5 w-5 text-orange-400" />
                    Add Change Freeze Window
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Scheduled deployments and non-emergency changes will be blocked during this period.</p>
                </div>
                <form onSubmit={handleCreateFreeze} className="p-6 space-y-4">
                  {freezeError && <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{freezeError}</p>}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Name <span className="text-red-400">*</span></label>
                    <input type="text" required value={freezeForm.name}
                      onChange={e => setFreezeForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Year-End Freeze, Holiday Lockdown"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Start Date &amp; Time <span className="text-red-400">*</span></label>
                      <input type="datetime-local" required value={freezeForm.startDate}
                        onChange={e => setFreezeForm(f => ({ ...f, startDate: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">End Date &amp; Time <span className="text-red-400">*</span></label>
                      <input type="datetime-local" required value={freezeForm.endDate}
                        onChange={e => setFreezeForm(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                    <textarea rows={2} value={freezeForm.reason}
                      onChange={e => setFreezeForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Why is this freeze period needed?"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowFreezeForm(false); setFreezeError(''); }}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">
                      Cancel
                    </button>
                    <button type="submit" disabled={freezeSubmitting}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                      {freezeSubmitting ? 'Saving…' : 'Create Freeze Window'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Freeze windows list */}
          {freezeLoading ? (
            <div className="p-12 text-center text-gray-400">Loading…</div>
          ) : freezeWindows.length === 0 ? (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-12 text-center">
              <LockClosedIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">No freeze windows defined</p>
              <p className="text-sm text-gray-500">Admins can add blackout periods to block non-emergency changes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {freezeWindows.map(fw => (
                <div
                  key={fw.id}
                  className={`bg-gray-900 border rounded-xl p-5 flex items-start justify-between gap-4 ${
                    fw.isActive ? 'border-orange-700 bg-orange-950/20' : 'border-gray-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LockClosedIcon className={`h-4 w-4 ${fw.isActive ? 'text-orange-400' : 'text-gray-500'}`} />
                      <span className="text-white font-semibold">{fw.name}</span>
                      {fw.isActive && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900 text-orange-200 font-medium">🔴 Active Now</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {fmtDate(fw.startDate)} → {fmtDate(fw.endDate)}
                    </p>
                    {fw.reason && <p className="text-sm text-gray-500 mt-1">{fw.reason}</p>}
                    <p className="text-xs text-gray-600 mt-2">Created by {fw.createdBy?.fullName ?? '—'}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteFreeze(fw.id)}
                      className="text-gray-500 hover:text-red-400 shrink-0"
                      title="Delete freeze window"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
