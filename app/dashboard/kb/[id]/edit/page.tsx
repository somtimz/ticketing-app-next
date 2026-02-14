'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';

interface Category {
  id: number;
  name: string;
}

interface KBArticle {
  id: number;
  title: string;
  content: string;
  categoryId: number | null;
  createdBy: number;
  isPublished: boolean;
}

export default function EditKBArticlePage(): JSX.Element {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [preview, setPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = session?.user?.role as string | undefined;
  const userId = session?.user?.id;
  const isAdmin = userRole === 'Admin';
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';

  // Load article
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/kb/articles/${id}`);
        if (!res.ok) {
          setError('Article not found.');
          setIsLoading(false);
          return;
        }
        const article = await res.json() as KBArticle;

        // Auth check: must be agent and (author or admin)
        if (status === 'authenticated') {
          if (!isAgent || (!isAdmin && String(article.createdBy) !== userId)) {
            router.replace(`/dashboard/kb/${id}`);
            return;
          }
        }

        setTitle(article.title);
        setContent(article.content);
        setCategoryId(article.categoryId ? String(article.categoryId) : '');
        setIsPublished(article.isPublished);
      } catch {
        setError('Failed to load article.');
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status]);

  // Load categories
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json() as { categories: Category[] };
        setCategories(data.categories ?? []);
      } catch {
        console.error('Failed to fetch categories');
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/kb/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          isPublished
        })
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message ?? 'Failed to update article.');
        return;
      }
      router.push(`/dashboard/kb/${id}`);
    } catch {
      setError('Failed to update article.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || status === 'loading') {
    return <div className="p-8 text-center text-sm text-gray-500">Loading...</div>;
  }

  if (error && !title) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={() => router.back()} className="text-sm text-primary-600 hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Article</h1>
      </div>

      <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">No category</option>
              {categories.map(cat => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Content (Markdown) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setPreview(p => !p)}
                className="text-xs text-primary-600 hover:underline"
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="min-h-[300px] p-4 border border-gray-300 rounded-lg prose prose-sm max-w-none text-gray-800 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600">
                <ReactMarkdown>{content || '*Nothing to preview yet.*'}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                required
              />
            )}
          </div>

          {/* Published */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">
              Published (visible to all users)
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
