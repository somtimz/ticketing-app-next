'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

interface EscalationRule {
  id: number;
  name: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  minutesBeforeBreach: number;
  action: 'notify_teamlead' | 'notify_admin' | 'reassign';
  reassignToAgentId: number | null;
  isActive: boolean;
  createdAt: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 — Critical',
  P2: 'P2 — High',
  P3: 'P3 — Medium',
  P4: 'P4 — Low'
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-blue-100 text-blue-700',
  P4: 'bg-green-100 text-green-700'
};

const ACTION_LABELS: Record<string, string> = {
  notify_teamlead: 'Notify Team Lead',
  notify_admin: 'Notify Admin',
  reassign: 'Reassign Ticket'
};

function formatThreshold(minutes: number): string {
  if (minutes > 0) return `${minutes} min before breach`;
  if (minutes === 0) return 'At breach';
  return `${Math.abs(minutes)} min after breach`;
}

interface EscalationForm {
  name: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  minutesBeforeBreach: number;
  action: 'notify_teamlead' | 'notify_admin' | 'reassign';
  reassignToAgentId: number | null;
}

const emptyForm: EscalationForm = {
  name: '',
  priority: 'P2',
  minutesBeforeBreach: -30,
  action: 'notify_teamlead',
  reassignToAgentId: null
};

export default function EscalationPoliciesPage() {
  const { data: session, status } = useSession();
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EscalationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/login');
    if (status === 'authenticated' && session?.user?.role !== 'Admin') redirect('/dashboard');
  }, [status, session]);

  useEffect(() => {
    void fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const res = await fetch('/api/admin/escalation');
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch {
      setError('Failed to load escalation rules');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `/api/admin/escalation/${editingId}` : '/api/admin/escalation';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save rule');
        return;
      }
      await fetchRules();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      setError('Failed to save rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this escalation rule?')) return;
    try {
      await fetch(`/api/admin/escalation/${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch {
      setError('Failed to delete rule');
    }
  }

  async function handleToggle(rule: EscalationRule) {
    try {
      await fetch(`/api/admin/escalation/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      await fetchRules();
    } catch {
      setError('Failed to update rule');
    }
  }

  function handleEdit(rule: EscalationRule) {
    setForm({
      name: rule.name,
      priority: rule.priority,
      minutesBeforeBreach: rule.minutesBeforeBreach,
      action: rule.action,
      reassignToAgentId: rule.reassignToAgentId
    });
    setEditingId(rule.id);
    setShowForm(true);
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <BellAlertIcon className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Escalation Policies</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Define rules to automatically notify or reassign tickets when SLAs are at risk or breached.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Escalation Rule' : 'New Escalation Rule'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Notify TL on P1 breach"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as typeof form.priority }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                When (relative to SLA resolution deadline)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={form.minutesBeforeBreach}
                  onChange={e => setForm(f => ({ ...f, minutesBeforeBreach: parseInt(e.target.value) || 0 }))}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">
                  minutes (negative = after breach, e.g. -30 = 30 min after breach)
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Preview: {formatThreshold(form.minutesBeforeBreach)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={form.action}
                onChange={e => setForm(f => ({ ...f, action: e.target.value as typeof form.action }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="notify_teamlead">Notify Team Lead</option>
                <option value="notify_admin">Notify Admin</option>
                <option value="reassign">Reassign to specific agent</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      {rules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <BellAlertIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No escalation rules yet</p>
          <p className="text-sm mt-1">Add rules to automatically escalate overdue tickets.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rule</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trigger</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map(rule => (
                <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_COLORS[rule.priority]}`}>
                      {rule.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatThreshold(rule.minutesBeforeBreach)}</td>
                  <td className="px-4 py-3 text-gray-600">{ACTION_LABELS[rule.action]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {rule.isActive ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>How escalation rules work:</strong> The SLA monitor cron (runs every 5–15 min) evaluates active rules
        against breached tickets. A negative <em>minutes</em> value means the rule fires N minutes <em>after</em> the
        SLA deadline passes (e.g. <code>-30</code> = 30 minutes after breach).
      </div>
    </div>
  );
}
