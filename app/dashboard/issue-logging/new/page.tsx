'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { CreateTicketRequest } from '@/types';
import UserSearchCombobox, { type SelectedEmployee } from '@/components/UserSearchCombobox';

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

  // Caller info (controlled — populated by combobox or manual entry)
  const [callerName, setCallerName] = useState('');
  const [callerEmployeeId, setCallerEmployeeId] = useState('');
  const [callerEmail, setCallerEmail] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [isGuestCaller, setIsGuestCaller] = useState(false);

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

  function handleEmployeeSelect(emp: SelectedEmployee | null) {
    if (emp) {
      setCallerName(emp.fullName);
      setCallerEmployeeId(emp.employeeId);
      setCallerEmail(emp.email ?? '');
      setCallerPhone(emp.phone ?? '');
    } else {
      setCallerName('');
      setCallerEmployeeId('');
      setCallerEmail('');
      setCallerPhone('');
    }
  }

  function toggleGuestMode() {
    setIsGuestCaller(prev => !prev);
    // Clear caller fields when switching modes
    setCallerName('');
    setCallerEmployeeId('');
    setCallerEmail('');
    setCallerPhone('');
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    // Validate caller name
    if (!callerName.trim()) {
      setError(
        isGuestCaller
          ? 'Caller Name is required'
          : 'Please select an employee from the directory, or switch to guest mode to enter manually'
      );
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const requestData: CreateTicketRequest = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string | undefined,
      impact: formData.get('impact') as 'Low' | 'Medium' | 'High',
      urgency: formData.get('urgency') as 'Low' | 'Medium' | 'High',
      callerName: callerName.trim(),
      callerEmail: callerEmail.trim() || undefined,
      callerPhone: callerPhone.trim() || undefined,
      callerEmployeeId: callerEmployeeId.trim() || undefined,
    };

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
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

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <PlusCircleIcon className="h-6 w-6 text-violet-600" />
          <h1 className="text-2xl font-semibold text-gray-900">New Issue</h1>
        </div>
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
        {/* ── Caller Information ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900">Caller Information</h2>
            <button
              type="button"
              onClick={toggleGuestMode}
              className="text-xs text-violet-600 hover:text-violet-800 underline"
            >
              {isGuestCaller ? '← Search employee directory' : 'Enter manually (guest / external)'}
            </button>
          </div>

          {!isGuestCaller ? (
            /* ── Employee directory search ──────────────────────────────────── */
            <div className="space-y-3">
              <UserSearchCombobox
                onSelect={handleEmployeeSelect}
                placeholder="Search by name, email, or employee ID…"
              />
              {/* Auto-filled summary shown after selection */}
              {callerName && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 px-1">
                  {callerEmployeeId && (
                    <span>
                      <span className="font-medium text-gray-600">Employee ID: </span>
                      {callerEmployeeId}
                    </span>
                  )}
                  {callerEmail && (
                    <span>
                      <span className="font-medium text-gray-600">Email: </span>
                      {callerEmail}
                    </span>
                  )}
                  {callerPhone && (
                    <span>
                      <span className="font-medium text-gray-600">Phone: </span>
                      {callerPhone}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Manual guest / external entry ──────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="callerNameManual" className="block text-sm font-medium text-gray-700">
                  Caller Name *
                </label>
                <input
                  type="text"
                  id="callerNameManual"
                  value={callerName}
                  onChange={e => setCallerName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="callerEmployeeIdManual" className="block text-sm font-medium text-gray-700">
                  Employee ID (if applicable)
                </label>
                <input
                  type="text"
                  id="callerEmployeeIdManual"
                  value={callerEmployeeId}
                  onChange={e => setCallerEmployeeId(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="callerEmailManual" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="callerEmailManual"
                  value={callerEmail}
                  onChange={e => setCallerEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="callerPhoneManual" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  id="callerPhoneManual"
                  value={callerPhone}
                  onChange={e => setCallerPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Issue Details ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Issue Details</h2>
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
                className={inputClass}
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
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select id="category" name="category" className={inputClass}>
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="impact" className="block text-sm font-medium text-gray-700">
                  Impact *
                </label>
                <select id="impact" name="impact" defaultValue="Medium" required className={inputClass}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
                  Urgency *
                </label>
                <select id="urgency" name="urgency" defaultValue="Medium" required className={inputClass}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
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
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4" />
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
