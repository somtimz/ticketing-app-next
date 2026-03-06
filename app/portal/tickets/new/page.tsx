'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import KBDeflectionPanel from '@/components/portal/KBDeflectionPanel';
import { useKBDeflection } from '@/components/portal/hooks/useKBDeflection';

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface RequestType {
  id: number;
  name: string;
  description: string | null;
  defaultImpact: string;
  defaultUrgency: string;
}

export default function NewPortalTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { suggestions } = useKBDeflection(title);

  useEffect(() => {
    void fetch('/api/categories')
      .then(r => r.json())
      .then((d: { categories: Category[] }) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  // Load request types when category changes
  useEffect(() => {
    if (!selectedCategoryId) {
      setRequestTypes([]);
      setSelectedTypeId(null);
      return;
    }
    void fetch(`/api/categories/${selectedCategoryId}/request-types`)
      .then(r => r.json())
      .then((d: { requestTypes: RequestType[] }) => {
        setRequestTypes(d.requestTypes ?? []);
        setSelectedTypeId(null);
      })
      .catch(() => {});
  }, [selectedCategoryId]);

  const selectedType = requestTypes.find(t => t.id === selectedTypeId);

  const handleCategorySelect = (id: number) => {
    setSelectedCategoryId(selectedCategoryId === id ? null : id);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const impact = selectedType?.defaultImpact ?? 'Medium';
    const urgency = selectedType?.defaultUrgency ?? 'Medium';

    try {
      const res = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categoryId: selectedCategoryId ?? undefined,
          impact,
          urgency
        })
      });

      if (res.ok) {
        const ticket = await res.json() as { id: number };
        router.push(`/portal/tickets/${ticket.id}`);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Failed to submit request');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Submit a Request</h1>
        <p className="mt-1 text-sm text-gray-500">Describe your issue and we&apos;ll get it sorted out.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category selection */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What area does this relate to?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'border-violet-600 bg-violet-50 text-violet-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                  {cat.description && (
                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{cat.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Request type selection (shown when category has types) */}
        {requestTypes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What type of request is this?
            </label>
            <div className="space-y-2">
              {requestTypes.map(type => (
                <label
                  key={type.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTypeId === type.id
                      ? 'border-violet-600 bg-violet-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="requestType"
                    value={type.id}
                    checked={selectedTypeId === type.id}
                    onChange={() => setSelectedTypeId(type.id)}
                    className="mt-0.5 text-violet-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{type.name}</p>
                    {type.description && <p className="text-xs text-gray-500">{type.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Brief summary *
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Can't log into my email account"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        {/* KB Deflection */}
        <KBDeflectionPanel suggestions={suggestions} />

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Details *
          </label>
          <textarea
            id="description"
            required
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Please describe what's happening, any error messages, and what you've already tried..."
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
