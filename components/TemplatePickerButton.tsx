'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Template {
  id: number;
  title: string;
  body: string;
  category: string | null;
  isGlobal: boolean;
  createdBy: { id: number; fullName: string };
}

interface TemplatePickerButtonProps {
  onSelect: (body: string) => void;
}

export default function TemplatePickerButton({ onSelect }: TemplatePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (open) {
      void fetchTemplates();
    }
  }, [open, fetchTemplates]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Group templates by category
  const filtered = templates.filter(t =>
    search === '' ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, Template[]> = {};
  for (const t of filtered) {
    const cat = t.category ?? 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  function handleSelect(t: Template) {
    onSelect(t.body);
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
        title="Insert a response template"
      >
        <ClipboardDocumentListIcon className="h-4 w-4" />
        Templates
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Response Templates</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No templates found.</p>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    {category}
                  </div>
                  {items.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelect(t)}
                      className="w-full text-left px-3 py-2.5 hover:bg-violet-50 border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 truncate pr-2">{t.title}</span>
                        {t.isGlobal && (
                          <span className="text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">Global</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.body}</p>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
