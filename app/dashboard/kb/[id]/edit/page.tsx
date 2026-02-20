'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  isAgentOnly: boolean;
  tags?: { id: number; name: string }[];
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
  const [isAgentOnly, setIsAgentOnly] = useState(false);
  const [preview, setPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<{ id: number; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ id: number; name: string }[]>([]);
  const [tagInput, setTagInput] = useState('');

  const userRole = session?.user?.role as string | undefined;
  const userId = session?.user?.id;
  const isAdmin = userRole === 'Admin';
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';

  // Load article + categories in parallel
  useEffect(() => {
    void (async () => {
      try {
        const [articleRes, catRes, tagsRes] = await Promise.all([
          fetch(`/api/kb/articles/${id}`),
          fetch('/api/categories'),
          fetch('/api/kb/tags')
        ]);

        if (!articleRes.ok) {
          setError('Article not found.');
          setIsLoading(false);
          return;
        }

        const [article, catData, tagsData] = await Promise.all([
          articleRes.json() as Promise<KBArticle>,
          catRes.json() as Promise<{ categories: Category[] }>,
          tagsRes.json() as Promise<{ tags: { id: number; name: string }[] }>
        ]);

        setCategories(catData.categories ?? []);

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
        setIsAgentOnly(article.isAgentOnly);
        setAllTags(tagsData.tags ?? []);
        setSelectedTags(article.tags ?? []);
      } catch {
        setError('Failed to load article.');
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status]);

  const addTag = async (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || selectedTags.some(t => t.name === trimmed)) return;
    const existing = allTags.find(t => t.name === trimmed);
    if (existing) {
      setSelectedTags(prev => [...prev, existing]);
    } else {
      const res = await fetch('/api/kb/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      if (res.ok) {
        const tag = await res.json() as { id: number; name: string };
        setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedTags(prev => [...prev, tag]);
      }
    }
    setTagInput('');
  };

  const removeTag = (id: number) => {
    setSelectedTags(prev => prev.filter(t => t.id !== id));
  };

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
          isPublished,
          isAgentOnly,
          tagIds: selectedTags.map(t => t.id)
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
        <div className="flex items-center gap-2">
          <PencilSquareIcon className="h-6 w-6 text-violet-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Edit Article</h1>
        </div>
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAgentOnly"
              checked={isAgentOnly}
              onChange={e => setIsAgentOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isAgentOnly" className="text-sm text-gray-700">
              Restrict to agents only (not visible to employees)
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedTags.map(tag => (
                  <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addTag(tagInput); } }}
                  placeholder="Add a tag..."
                  list="tag-suggestions"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="tag-suggestions">
                  {allTags
                    .filter(t => !selectedTags.some(s => s.id === t.id))
                    .filter(t => t.name.includes(tagInput.toLowerCase()))
                    .map(tag => (
                      <option key={tag.id} value={tag.name} />
                    ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => void addTag(tagInput)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Press Enter or click Add. New tag names are created automatically.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <XMarkIcon className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
