'use client';

import { useState, useEffect, type FormEvent } from 'react';

interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json() as { departments: Department[] };
        setDepartments(data.departments);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchDepartments(); }, []);

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (dept: Department) => {
    setFormData({ name: dept.name, code: dept.code, description: dept.description || '' });
    setEditingId(dept.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId ? `/api/departments/${editingId}` : '/api/departments';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message || 'Operation failed');
        return;
      }

      setSuccess(editingId ? 'Department updated' : 'Department created');
      resetForm();
      void fetchDepartments();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this department?')) return;
    try {
      await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      void fetchDepartments();
    } catch {
      // non-fatal
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-500">Manage departments for team visibility</p>
        </div>
        <button
          onClick={() => { showForm ? resetForm() : setShowForm(true); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Department'}
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
            {editingId ? 'Edit Department' : 'New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700">Code * (e.g., ENG)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
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
          <h2 className="text-lg font-medium text-gray-900">All Departments</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
        ) : departments.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No departments found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {departments.map(dept => (
              <div key={dept.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-gray-900">{dept.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded">{dept.code}</span>
                    {!dept.isActive && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">Inactive</span>
                    )}
                  </div>
                  {dept.description && <p className="mt-1 text-xs text-gray-500">{dept.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(dept)} className="text-sm text-primary-600 hover:underline">Edit</button>
                  {dept.isActive && (
                    <button onClick={() => handleDelete(dept.id)} className="text-sm text-red-600 hover:underline">Deactivate</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
