'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusIcon, TrashIcon, GlobeAltIcon, UserIcon } from '@heroicons/react/24/outline';

interface Template {
  id: number;
  title: string;
  body: string;
  category: string | null;
  isGlobal: boolean;
  createdAt: string;
  createdBy: { id: number; fullName: string };
}

export default function AdminTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const userRole = (session?.user as any)?.role as string | undefined;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || userRole !== 'Admin') {
      router.replace('/dashboard');
    }
  }, [session, status, userRole, router]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) return;
      const data = await res.json() as { templates: Template[] };
      setTemplates(data.templates ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'Admin') void fetchTemplates();
  }, [userRole, fetchTemplates]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || undefined,
          isGlobal
        })
      });
      if (!res.ok) {
        const d = await res.json() as { message?: string };
        setCreateError(d.message || 'Failed to create template');
        return;
      }
      setTitle('');
      setBody('');
      setCategory('');
      setIsGlobal(true);
      await fetchTemplates();
    } catch {
      setCreateError('Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchTemplates();
    } catch {
      // non-fatal
    }
  };

  if (status === 'loading' || userRole !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Response Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage global and personal response templates for agents.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
          <PlusIcon className="h-5 w-5 text-violet-600" />
          Create Template
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="e.g. Password Reset Instructions"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Account Issues, Hardware, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              required
              rows={5}
              placeholder="Enter the template text. Agents will be able to insert this into comment fields."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={e => setIsGlobal(e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <GlobeAltIcon className="h-4 w-4 text-violet-500" />
              Make global (visible to all agents)
            </label>
            <button
              type="submit"
              disabled={isCreating || !title.trim() || !body.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-md text-sm hover:bg-violet-700 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              {isCreating ? 'Creating...' : 'Create Template'}
            </button>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
        </form>
      </div>

      {/* Templates list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900">
            All Templates{' '}
            {!loading && (
              <span className="text-gray-400 font-normal text-sm">({templates.length})</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm italic">No templates yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {templates.map(t => (
              <li key={t.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{t.title}</span>
                      {t.isGlobal ? (
                        <span className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                          <GlobeAltIcon className="h-3 w-3" />
                          Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          <UserIcon className="h-3 w-3" />
                          Personal
                        </span>
                      )}
                      {t.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {t.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      By {t.createdBy.fullName} &middot; {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                  </div>
                  <button
                    onClick={() => void handleDelete(t.id)}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete template"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
