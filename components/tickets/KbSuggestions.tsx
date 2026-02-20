'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookOpenIcon, LockClosedIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface KbArticle {
  id: number;
  title: string;
  content: string;
  isAgentOnly: boolean;
}

interface Props {
  ticketTitle: string;
}

export default function KbSuggestions({ ticketTitle }: Props): JSX.Element {
  const [autoResults, setAutoResults] = useState<KbArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KbArticle[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-load on mount using ticket title
  useEffect(() => {
    if (!ticketTitle.trim()) return;
    void (async () => {
      try {
        const res = await fetch(`/api/kb/search?q=${encodeURIComponent(ticketTitle)}&limit=3`);
        if (!res.ok) return;
        const data = await res.json() as { articles: KbArticle[] };
        setAutoResults(data.articles ?? []);
      } catch {
        // non-fatal
      }
    })();
  }, [ticketTitle]);

  // Debounced manual search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/kb/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
          if (!res.ok) return;
          const data = await res.json() as { articles: KbArticle[] };
          setSearchResults(data.articles ?? []);
        } catch {
          // non-fatal
        }
      })();
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const displayResults = searchQuery.trim() ? searchResults : autoResults;

  function excerpt(content: string): string {
    const plain = content.replace(/[#*`>\-_]/g, '').trim();
    return plain.length > 100 ? plain.slice(0, 100) + '…' : plain;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <BookOpenIcon className="h-4 w-4 text-violet-600" />
        Related Articles
      </h3>

      {/* Manual search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          data-testid="kb-search-input"
        />
      </div>

      {displayResults.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No related articles found.</p>
      ) : (
        <ul className="space-y-2" data-testid="kb-suggestions-list">
          {displayResults.map(article => (
            <li key={article.id} className="border border-gray-200 rounded-md p-3 hover:border-violet-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/kb/${article.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-violet-700 hover:underline"
                >
                  {article.title}
                </Link>
                {article.isAgentOnly && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded shrink-0">
                    <LockClosedIcon className="h-3 w-3" />
                    Agent only
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{excerpt(article.content)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
