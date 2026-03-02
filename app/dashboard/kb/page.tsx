'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BookOpenIcon, MagnifyingGlassIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';

interface KBArticle {
  id: number;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  createdBy: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isPublished: boolean;
  isAgentOnly: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  tags: { id: number; name: string }[];
}

interface Category {
  id: number;
  name: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function KBPage(): JSX.Element {
  const { data: session } = useSession();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  // Use ref, not state — timers are transient values that don't need to trigger re-renders
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userRole = session?.user?.role as string | undefined;
  const userId = session?.user?.id;
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';
  const isAdmin = userRole === 'Admin';

  const canDeleteArticle = (article: KBArticle) =>
    isAdmin || (isAgent && String(article.createdBy) === userId);

  const handleDelete = async (e: React.MouseEvent, articleId: number) => {
    e.preventDefault(); // prevent navigating to the article
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/kb/articles/${articleId}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== articleId));
      } else {
        const data = await res.json() as { message?: string };
        alert(data.message ?? 'Failed to delete article.');
      }
    } catch {
      alert('Failed to delete article.');
    }
  };

  const fetchArticles = useCallback(async (q: string, catId: string, p: number, tagId: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('q', q);
      if (catId) params.set('categoryId', catId);

      const url = q ? `/api/kb/search?${params}` : `/api/kb/articles?${params}`;
      const res = await fetch(url);
      const data = await res.json() as { articles: KBArticle[]; pagination: Pagination };
      const allArticles = data.articles ?? [];
      setArticles(
        tagId
          ? allArticles.filter(a => a.tags.some(t => String(t.id) === tagId))
          : allArticles
      );
      setPagination(data.pagination ?? null);
    } catch {
      console.error('Failed to fetch KB articles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories and tags once
  useEffect(() => {
    void (async () => {
      try {
        const [catRes, tagsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/kb/tags')
        ]);
        const catData = await catRes.json() as { categories: Category[] };
        const tagsData = await tagsRes.json() as { tags: { id: number; name: string }[] };
        setCategories(catData.categories ?? []);
        setTags(tagsData.tags ?? []);
      } catch {
        console.error('Failed to fetch categories or tags');
      }
    })();
  }, []);

  // Debounced search — timer stored in ref so it doesn't trigger extra renders
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      void fetchArticles(search, categoryFilter, 1, tagFilter);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, tagFilter]);

  useEffect(() => {
    void fetchArticles(search, categoryFilter, page, tagFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search help articles
          </p>
        </div>
        {isAgent && (
          <Link
            href="/dashboard/kb/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <PlusCircleIcon className="h-4 w-4" />
            New Article
          </Link>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={e => { setTagFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Tags</option>
          {tags.map(tag => (
            <option key={tag.id} value={String(tag.id)}>{tag.name}</option>
          ))}
        </select>
      </div>

      {/* Article List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg divide-y divide-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {search ? (
              <div className="space-y-2">
                <p>No articles match your search.</p>
                <p>
                  Still need help?{' '}
                  <Link href="/dashboard/issue-logging/new" className="text-primary-600 underline hover:text-primary-700">
                    Create a support ticket →
                  </Link>
                </p>
              </div>
            ) : 'No articles yet.'}
          </div>
        ) : (
          articles.map(article => (
            <Link
              key={article.id}
              href={`/dashboard/kb/${article.id}`}
              className="block px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {article.title}
                    </h3>
                    {article.categoryName && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                        {article.categoryName}
                      </span>
                    )}
                    {isAgent && (
                      article.isPublished
                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Published</span>
                        : <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Draft</span>
                    )}
                    {article.isAgentOnly && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                        <LockClosedIcon className="h-3 w-3" />
                        Agent only
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span>{article.viewCount} views</span>
                    <span>{article.helpfulCount} helpful</span>
                    <span>
                      {article.isPublished && article.publishedAt
                        ? `Published ${new Date(article.publishedAt).toLocaleDateString()}`
                        : `Updated ${new Date(article.updatedAt).toLocaleDateString()}`}
                    </span>
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {article.tags.map(tag => (
                        <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {canDeleteArticle(article) && (
                  <button
                    onClick={(e) => void handleDelete(e, article.id)}
                    className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    Delete
                  </button>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
