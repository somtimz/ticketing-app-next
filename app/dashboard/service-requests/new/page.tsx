'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const CATEGORIES = ['New Equipment', 'Software Access', 'Account Setup', 'Hardware Repair', 'Other'] as const;
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 — Critical',
  P2: 'P2 — High',
  P3: 'P3 — Medium',
  P4: 'P4 — Low'
};

interface CatalogItem {
  id: number;
  title: string;
  description: string;
  category: typeof CATEGORIES[number];
  estimatedSLAHours: number;
  icon: string | null;
}

export default function NewServiceRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogItemId = searchParams.get('catalogItemId');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'New Equipment' as typeof CATEGORIES[number],
    priority: 'P3' as typeof PRIORITIES[number]
  });

  // Pre-populate from catalog item when catalogItemId is in the URL
  useEffect(() => {
    if (!catalogItemId) return;
    const id = parseInt(catalogItemId, 10);
    if (isNaN(id)) return;

    fetch(`/api/catalog/${id}`)
      .then(res => res.ok ? res.json() as Promise<{ catalogItem: CatalogItem }> : Promise.reject())
      .then(data => {
        const item = data.catalogItem;
        setCatalogItem(item);
        setForm(f => ({
          ...f,
          title: item.title,
          category: item.category,
        }));
      })
      .catch(() => {
        // Silently ignore; just don't pre-populate
      });
  }, [catalogItemId]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (catalogItemId) {
        const id = parseInt(catalogItemId, 10);
        if (!isNaN(id)) payload.catalogItemId = id;
      }

      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to submit request');
      }
      const { serviceRequest } = await res.json() as { serviceRequest: { id: number } };
      router.push(`/dashboard/service-requests/${serviceRequest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>
        <p className="mt-1 text-sm text-gray-500">Submit a request for equipment, software access, or account setup.</p>
      </div>

      {catalogItem && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 flex items-start gap-3">
          {catalogItem.icon && (
            <span className="text-xl leading-none mt-0.5 shrink-0">{catalogItem.icon}</span>
          )}
          <div>
            <p className="text-sm font-semibold text-violet-900">{catalogItem.title}</p>
            <p className="text-xs text-violet-700 mt-0.5">{catalogItem.description}</p>
            <p className="text-xs text-violet-600 mt-1">Est. SLA: {catalogItem.estimatedSLAHours} hours</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input id="title" required value={form.title} onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Brief summary of your request" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea id="description" required rows={4} value={form.description} onChange={e => set('description', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Describe what you need and why..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select id="category" value={form.category} onChange={e => set('category', e.target.value as typeof CATEGORIES[number])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select id="priority" value={form.priority} onChange={e => set('priority', e.target.value as typeof PRIORITIES[number])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
