'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CreateTicketRequest } from '@/types';

interface Category {
  id: number;
  name: string;
}

interface KBArticle {
  id: number;
  title: string;
  slug: string;
}

interface SimilarTicket {
  id: number;
  ticketNumber: string;
  title: string;
  status: string;
  resolution: string | null;
}

export default function NewIssuePage(): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Dynamic categories
  const [categories, setCategories] = useState<Category[]>([]);

  // KB deflection
  const [kbSuggestions, setKbSuggestions] = useState<KBArticle[]>([]);
  const [similarTickets, setSimilarTickets] = useState<SimilarTicket[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const kbDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const similarDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load categories
  useEffect(() => {
    void fetch('/api/categories')
      .then(r => r.json())
      .then((d: { categories: Category[] }) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  // KB deflection — debounce 400ms on title change
  useEffect(() => {
    if (kbDebounceRef.current) clearTimeout(kbDebounceRef.current);
    if (title.trim().length < 4) {
      setKbSuggestions([]);
      return;
    }
    kbDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kb/search?q=${encodeURIComponent(title)}&limit=3`);
        if (!res.ok) return;
        const data = await res.json() as { articles: KBArticle[] };
        setKbSuggestions(data.articles ?? []);
      } catch {
        // non-fatal
      }
    }, 400);
    return () => {
      if (kbDebounceRef.current) clearTimeout(kbDebounceRef.current);
    };
  }, [title]);

  // Similar tickets — debounce 600ms on title + description
  useEffect(() => {
    if (similarDebounceRef.current) clearTimeout(similarDebounceRef.current);
    if (title.trim().length < 6) {
      setSimilarTickets([]);
      return;
    }
    similarDebounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ title, limit: '3' });
        if (description.trim()) params.set('description', description);
        const res = await fetch(`/api/tickets/suggest?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json() as { similar: SimilarTicket[] };
        setSimilarTickets(data.similar ?? []);
      } catch {
        // non-fatal
      }
    }, 600);
    return () => {
      if (similarDebounceRef.current) clearTimeout(similarDebounceRef.current);
    };
  }, [title, description]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const requestData: CreateTicketRequest = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string | undefined,
      impact: formData.get('impact') as 'Low' | 'Medium' | 'High',
      urgency: formData.get('urgency') as 'Low' | 'Medium' | 'High',
      callerName: formData.get('callerName') as string,
      callerEmail: formData.get('callerEmail') as string | undefined,
      callerPhone: formData.get('callerPhone') as string | undefined,
      callerEmployeeId: formData.get('callerEmployeeId') as string | undefined
    };

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        router.push('/dashboard/issue-logging');
      } else {
        const data = (await response.json()) as { error?: string };
        setError(data.error || 'Failed to create ticket');
      }
    } catch {
      setError('An error occurred while creating the ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Issue</h1>
        <p className="mt-1 text-sm text-gray-500">Log a new issue from a caller</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* KB Deflection Panel */}
      {kbSuggestions.length > 0 && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">
            Knowledge Base articles that may help:
          </p>
          <ul className="space-y-1">
            {kbSuggestions.map(article => (
              <li key={article.id}>
                <Link
                  href={`/dashboard/kb/${article.id}`}
                  target="_blank"
                  className="text-sm text-blue-700 hover:underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-blue-600">
            Check these articles before logging a ticket — the issue may already be resolved.
          </p>
        </div>
      )}

      {/* Similar Tickets Panel */}
      {similarTickets.length > 0 && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            Similar tickets found:
          </p>
          <ul className="space-y-2">
            {similarTickets.map(t => (
              <li key={t.id} className="text-sm">
                <Link
                  href={`/dashboard/issue-logging/${t.id}`}
                  target="_blank"
                  className="text-yellow-700 hover:underline font-medium"
                >
                  {t.ticketNumber}
                </Link>
                <span className="text-yellow-700"> — {t.title}</span>
                {t.resolution && (
                  <p className="text-xs text-yellow-600 mt-0.5 line-clamp-2">
                    Resolution: {t.resolution}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 space-y-6"
      >
        {/* Caller Information */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Caller Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="callerName" className="block text-sm font-medium text-gray-700">
                Caller Name *
              </label>
              <input
                type="text"
                id="callerName"
                name="callerName"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="callerEmployeeId" className="block text-sm font-medium text-gray-700">
                Employee ID (if applicable)
              </label>
              <input
                type="text"
                id="callerEmployeeId"
                name="callerEmployeeId"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="callerEmail" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="callerEmail"
                name="callerEmail"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="callerPhone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="text"
                id="callerPhone"
                name="callerPhone"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Issue Details */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Issue Details
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="impact" className="block text-sm font-medium text-gray-700">
                  Impact *
                </label>
                <select
                  id="impact"
                  name="impact"
                  defaultValue="Medium"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
                  Urgency *
                </label>
                <select
                  id="urgency"
                  name="urgency"
                  defaultValue="Medium"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
