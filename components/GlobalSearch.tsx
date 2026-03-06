'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  TicketIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResultType = 'ticket' | 'service_request' | 'kb_article' | 'asset' | 'problem' | 'change';

interface SearchResult {
  type: ResultType;
  id: number;
  number: string;
  title: string;
  status?: string;
  priority?: string;
  category?: string;
  type_label?: string;
  changeType?: string;
  isAgentOnly?: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ResultType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: (r: SearchResult) => string;
}> = {
  ticket: {
    label: 'Incident',
    icon: TicketIcon,
    color: 'text-blue-400',
    href: r => `/dashboard/issue-logging/${r.id}`,
  },
  service_request: {
    label: 'Service Request',
    icon: ClipboardDocumentListIcon,
    color: 'text-violet-400',
    href: r => `/dashboard/service-requests/${r.id}`,
  },
  kb_article: {
    label: 'KB Article',
    icon: BookOpenIcon,
    color: 'text-emerald-400',
    href: r => `/dashboard/kb/${r.id}`,
  },
  asset: {
    label: 'Asset',
    icon: ComputerDesktopIcon,
    color: 'text-amber-400',
    href: r => `/dashboard/assets/${r.id}`,
  },
  problem: {
    label: 'Problem',
    icon: DocumentTextIcon,
    color: 'text-red-400',
    href: r => `/dashboard/problems/${r.id}`,
  },
  change: {
    label: 'Change',
    icon: ArrowPathIcon,
    color: 'text-teal-400',
    href: r => `/dashboard/changes/${r.id}`,
  },
};

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-900 text-blue-300',
  Assigned: 'bg-indigo-900 text-indigo-300',
  InProgress: 'bg-yellow-900 text-yellow-300',
  'In Progress': 'bg-yellow-900 text-yellow-300',
  'On Hold': 'bg-orange-900 text-orange-300',
  Resolved: 'bg-green-900 text-green-300',
  Closed: 'bg-gray-700 text-gray-400',
  Submitted: 'bg-blue-900 text-blue-300',
  Approved: 'bg-green-900 text-green-300',
  Fulfilled: 'bg-green-800 text-green-200',
  Rejected: 'bg-red-900 text-red-300',
  Active: 'bg-green-900 text-green-300',
  'In Repair': 'bg-amber-900 text-amber-300',
  Retired: 'bg-gray-700 text-gray-400',
  Draft: 'bg-gray-700 text-gray-400',
  Completed: 'bg-green-900 text-green-300',
  'CAB Review': 'bg-purple-900 text-purple-300',
  Scheduled: 'bg-teal-900 text-teal-300',
  Failed: 'bg-red-900 text-red-300',
  Cancelled: 'bg-gray-700 text-gray-400',
};

// ── Result Row ────────────────────────────────────────────────────────────────

function ResultRow({
  result,
  isHighlighted,
  onSelect,
}: {
  result: SearchResult;
  isHighlighted: boolean;
  onSelect: () => void;
}) {
  const cfg = TYPE_CONFIG[result.type];
  const Icon = cfg.icon;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isHighlighted ? 'bg-gray-700' : 'hover:bg-gray-750'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {result.number && (
            <span className="font-mono text-xs text-gray-500 shrink-0">{result.number}</span>
          )}
          <span className="text-sm text-white truncate">{result.title}</span>
          {result.isAgentOnly && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900 text-amber-300 shrink-0">Agent</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {result.status && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[result.status] ?? 'bg-gray-700 text-gray-400'}`}>
            {result.status}
          </span>
        )}
        <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const seq = ++reqSeqRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=8`);
        if (res.ok && seq === reqSeqRef.current) {
          const data = await res.json() as { results: SearchResult[] };
          setResults(data.results ?? []);
          setHighlightedIndex(0);
        }
      } catch {
        if (seq === reqSeqRef.current) setResults([]);
      } finally {
        if (seq === reqSeqRef.current) setIsLoading(false);
      }
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const navigate = useCallback((result: SearchResult) => {
    const cfg = TYPE_CONFIG[result.type];
    router.push(cfg.href(result));
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      navigate(results[highlightedIndex]);
    }
  }, [results, highlightedIndex, navigate, onClose]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.children[highlightedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[10vh] z-50 mx-auto max-w-2xl px-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tickets, requests, KB articles, assets…"
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-500 hover:text-gray-300">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div ref={listRef} className="max-h-96 overflow-y-auto divide-y divide-gray-800">
              {results.map((result, idx) => (
                <ResultRow
                  key={`${result.type}-${result.id}`}
                  result={result}
                  isHighlighted={idx === highlightedIndex}
                  onSelect={() => navigate(result)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No results for <span className="text-gray-300">&ldquo;{query}&rdquo;</span>
            </div>
          )}

          {/* Hint bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 text-[11px] text-gray-600">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400">↑↓</kbd> navigate &nbsp;
              <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400">↵</kbd> open &nbsp;
              <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400">Esc</kbd> close
            </span>
            {results.length > 0 && (
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
