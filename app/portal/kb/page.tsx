'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface KBArticle {
  id: number;
  title: string;
  createdAt: string;
  category: { id: number; name: string } | null;
}

export default function PortalKBPage() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadArticles = async (q = '') => {
    setIsLoading(true);
    try {
      const url = q
        ? `/api/kb/search?q=${encodeURIComponent(q)}&limit=20`
        : '/api/kb/articles?limit=20';
      const res = await fetch(url);
      const data = await res.json() as { articles: KBArticle[] };
      setArticles(data.articles ?? []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArticles();
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadArticles(value);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Help Center</h1>
        <p className="mt-1 text-sm text-gray-500">Browse articles and find answers to common questions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search articles..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
        />
      </div>

      {/* Articles */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Searching...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {query ? `No articles found for "${query}"` : 'No articles published yet.'}
          </div>
        ) : (
          articles.map(article => (
            <Link
              key={article.id}
              href={`/portal/kb/${article.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <svg className="h-5 w-5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-violet-600">{article.title}</p>
                {article.category && (
                  <p className="text-xs text-gray-400 mt-0.5">{article.category.name}</p>
                )}
              </div>
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
