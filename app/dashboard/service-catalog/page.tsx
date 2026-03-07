'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CatalogItem {
  id: number;
  title: string;
  description: string;
  category: string;
  estimatedSLAHours: number;
  eligibleRoles: string; // JSON string
  icon: string | null;
  isActive: boolean;
}

interface CatalogResponse {
  catalogItems: CatalogItem[];
  grouped: Record<string, CatalogItem[]>;
}

const CATEGORY_ORDER = [
  'New Equipment',
  'Software Access',
  'Account Setup',
  'Hardware Repair',
  'Other',
];

export default function ServiceCatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, CatalogItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchCatalog = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const url = q
        ? `/api/catalog?q=${encodeURIComponent(q)}`
        : '/api/catalog';
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? 'Failed to load catalog');
      }
      const data = await res.json() as CatalogResponse;
      setItems(data.catalogItems);
      setGrouped(data.grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(debouncedQuery);
  }, [debouncedQuery, fetchCatalog]);

  const orderedCategories = CATEGORY_ORDER.filter(c => grouped[c]?.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse available services and submit a request.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search catalog…"
          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">
          {query ? 'No items match your search.' : 'No catalog items available.'}
        </div>
      ) : (
        <div className="space-y-8">
          {orderedCategories.map(category => (
            <section key={category}>
              <h2 className="text-base font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[category].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/service-requests/new?catalogItemId=${item.id}`
                      )
                    }
                    className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-violet-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <div className="flex items-start gap-3">
                      {item.icon ? (
                        <span className="text-2xl leading-none shrink-0" aria-hidden>
                          {item.icon}
                        </span>
                      ) : (
                        <span className="text-2xl leading-none shrink-0 text-gray-300" aria-hidden>
                          📋
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {item.description}
                        </p>
                        <p className="mt-2 text-xs text-violet-600 font-medium">
                          Est. {item.estimatedSLAHours}h SLA
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
