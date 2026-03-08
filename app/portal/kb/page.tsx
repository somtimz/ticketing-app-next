'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDebounce } from 'use-debounce';

interface Article { id: number; title: string; excerpt: string | null; publishedAt: string | null; }

export default function PortalKBPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const url = debouncedQuery
      ? `/api/kb/search?q=${encodeURIComponent(debouncedQuery)}`
      : '/api/kb/articles';
    fetch(url)
      .then(r => r.json())
      .then((data: { articles?: Article[]; results?: Article[] }) => setArticles(data.articles ?? data.results ?? []));
  }, [debouncedQuery]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search articles..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <div className="space-y-2">
        {articles.map(a => (
          <Link
            key={a.id}
            href={`/portal/kb/${a.id}`}
            className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-violet-300 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900">{a.title}</p>
            {a.excerpt && <p className="text-xs text-gray-500 mt-0.5">{a.excerpt}</p>}
          </Link>
        ))}
        {articles.length === 0 && <p className="text-sm text-gray-400">No articles found.</p>}
      </div>
    </div>
  );
}
