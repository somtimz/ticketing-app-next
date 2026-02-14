'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface KBArticle {
  id: number;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
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
  const [page, setPage] = useState(1);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const userRole = session?.user?.role as string | undefined;
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';

  const fetchArticles = useCallback(async (q: string, catId: string, p: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('q', q);
      if (catId) params.set('categoryId', catId);

      const url = q ? `/api/kb/search?${params}` : `/api/kb/articles?${params}`;
      const res = await fetch(url);
      const data = await res.json() as { articles: KBArticle[]; pagination: Pagination };
      setArticles(data.articles ?? []);
      setPagination(data.pagination ?? null);
    } catch {
      console.error('Failed to fetch KB articles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories once
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

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => {
      setPage(1);
      void fetchArticles(search, categoryFilter, 1);
    }, 300);
    setSearchTimeout(t);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  useEffect(() => {
    void fetchArticles(search, categoryFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search help articles
          </p>
        </div>
        {isAgent && (
          <Link
            href="/dashboard/kb/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            New Article
          </Link>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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
      </div>

      {/* Article List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg divide-y divide-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {search ? 'No articles match your search.' : 'No articles yet.'}
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
                    {isAgent && !article.isPublished && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span>{article.viewCount} views</span>
                    <span>{article.helpfulCount} helpful</span>
                    <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
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
