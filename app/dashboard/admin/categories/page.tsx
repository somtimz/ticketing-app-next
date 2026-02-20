'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { TagIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

interface Category {
  id: number;
  name: string;
  description: string | null;
  defaultAgentId: number | null;
  isActive: boolean;
}

interface Agent {
  id: number;
  fullName: string;
  role: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', defaultAgentId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json() as { categories: Category[] };
        setCategories(data.categories);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
    void fetch('/api/agents')
      .then(r => r.json())
      .then((d: { agents: Agent[] }) => setAgents(d.agents ?? []))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setFormData({ name: '', description: '', defaultAgentId: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (cat: Category) => {
    setFormData({
      name: cat.name,
      description: cat.description || '',
      defaultAgentId: cat.defaultAgentId ? String(cat.defaultAgentId) : '',
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
      };
      if (formData.defaultAgentId) {
        body.defaultAgentId = parseInt(formData.defaultAgentId);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message || 'Operation failed');
        return;
      }

      setSuccess(editingId ? 'Category updated' : 'Category created');
      resetForm();
      void fetchCategories();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this category?')) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      void fetchCategories();
    } catch {
      // non-fatal
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <TagIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">Manage ticket categories and default agents</p>
        </div>
        <button
          onClick={() => { showForm ? resetForm() : setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Cancel' : (
            <>
              <PlusCircleIcon className="h-4 w-4" />
              Add Category
            </>
          )}
        </button>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Agent</label>
              <select
                value={formData.defaultAgentId}
                onChange={e => setFormData({ ...formData, defaultAgentId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">None</option>
                {agents.map(a => (
                  <option key={a.id} value={String(a.id)}>{a.fullName} ({a.role})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">All Categories</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No categories found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map(cat => (
              <div key={cat.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{cat.name}</h3>
                  {cat.description && <p className="mt-1 text-xs text-gray-500">{cat.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(cat)} className="text-sm text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-600 hover:underline">Deactivate</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
