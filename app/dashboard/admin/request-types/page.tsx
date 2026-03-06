'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Category {
  id: number;
  name: string;
}

interface ServiceRequestType {
  id: number;
  name: string;
  description: string | null;
  defaultImpact: string;
  defaultUrgency: string;
  isActive: boolean;
  sortOrder: number;
  categoryId: number | null;
  category: { id: number; name: string } | null;
}

const IMPACT_OPTIONS = ['Low', 'Medium', 'High'];

export default function RequestTypesPage() {
  const [types, setTypes] = useState<ServiceRequestType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '' as string | number,
    defaultImpact: 'Medium',
    defaultUrgency: 'Medium',
    sortOrder: 0
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [typesRes, catsRes] = await Promise.all([
        fetch('/api/admin/service-request-types'),
        fetch('/api/categories')
      ]);
      const typesData = await typesRes.json() as { serviceRequestTypes: ServiceRequestType[] };
      const catsData = await catsRes.json() as { categories: Category[] };
      setTypes(typesData.serviceRequestTypes ?? []);
      setCategories(catsData.categories ?? []);
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', categoryId: '', defaultImpact: 'Medium', defaultUrgency: 'Medium', sortOrder: 0 });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (type: ServiceRequestType) => {
    setForm({
      name: type.name,
      description: type.description ?? '',
      categoryId: type.categoryId ?? '',
      defaultImpact: type.defaultImpact,
      defaultUrgency: type.defaultUrgency,
      sortOrder: type.sortOrder
    });
    setEditingId(type.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name,
      description: form.description || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      defaultImpact: form.defaultImpact,
      defaultUrgency: form.defaultUrgency,
      sortOrder: form.sortOrder
    };

    try {
      const url = editingId
        ? `/api/admin/service-request-types/${editingId}`
        : '/api/admin/service-request-types';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Failed to save');
        return;
      }

      resetForm();
      await loadData();
    } catch {
      setError('An error occurred');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this request type?')) return;
    await fetch(`/api/admin/service-request-types/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const toggleActive = async (type: ServiceRequestType) => {
    await fetch(`/api/admin/service-request-types/${type.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !type.isActive })
    });
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Service Request Types</h1>
          <p className="mt-1 text-sm text-gray-500">Define the types of requests employees can submit through the portal</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
        >
          {showForm && !editingId ? <XMarkIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
          {showForm && !editingId ? 'Cancel' : 'Add Type'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Request Type' : 'New Request Type'}
          </h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Impact</label>
                <select
                  value={form.defaultImpact}
                  onChange={e => setForm({ ...form, defaultImpact: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {IMPACT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Urgency</label>
                <select
                  value={form.defaultUrgency}
                  onChange={e => setForm({ ...form, defaultUrgency: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {IMPACT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                <CheckIcon className="h-4 w-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No request types yet. Click &quot;Add Type&quot; to create one.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {types.map(type => (
              <div key={type.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${type.isActive ? 'text-gray-900' : 'text-gray-400'}`}>{type.name}</span>
                    {!type.isActive && <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">Inactive</span>}
                    {type.category && <span className="px-1.5 py-0.5 text-xs bg-violet-100 text-violet-700 rounded">{type.category.name}</span>}
                  </div>
                  {type.description && <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Impact: {type.defaultImpact} · Urgency: {type.defaultUrgency} · Order: {type.sortOrder}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => void toggleActive(type)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded">
                    {type.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => startEdit(type)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => void handleDelete(type.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
