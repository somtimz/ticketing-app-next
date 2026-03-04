'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CustomerSummary {
  id: number;
  name: string;
  company: string | null;
}

interface Props {
  srId: number;
  initialCustomer: CustomerSummary | null;
  isAgent: boolean;
}

export default function CustomerSection({ srId, initialCustomer, isAgent }: Props): JSX.Element {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerSummary | null>(initialCustomer);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json() as { customers: CustomerSummary[] };
        setResults(data.customers);
      }
    } catch {
      // non-fatal
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (c: CustomerSummary) => {
    setIsLinking(true);
    try {
      const res = await fetch(`/api/service-requests/${srId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: c.id })
      });
      if (res.ok) {
        setCustomer(c);
        setShowSearch(false);
        setSearchQuery('');
        setResults([]);
        router.refresh();
      }
    } catch {
      // non-fatal
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Remove customer link from this service request?')) return;
    try {
      const res = await fetch(`/api/service-requests/${srId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: null })
      });
      if (res.ok) {
        setCustomer(null);
        router.refresh();
      }
    } catch {
      // non-fatal
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</h2>
        {isAgent && !customer && (
          <button
            onClick={() => setShowSearch(v => !v)}
            className="text-xs text-violet-600 hover:underline"
          >
            {showSearch ? 'Cancel' : 'Link'}
          </button>
        )}
      </div>

      {customer ? (
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/dashboard/admin/customers/${customer.id}`}
              className="text-sm font-medium text-violet-600 hover:underline"
            >
              {customer.name}
            </Link>
            {customer.company && (
              <p className="text-xs text-gray-500">{customer.company}</p>
            )}
          </div>
          {isAgent && (
            <button
              onClick={() => void handleUnlink()}
              className="text-xs text-red-600 hover:underline ml-2"
            >
              Unlink
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">None linked.</p>
      )}

      {isAgent && showSearch && (
        <div className="pt-1">
          <input
            type="text"
            value={searchQuery}
            onChange={e => void handleSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {isSearching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
          {results.length > 0 && (
            <ul className="mt-1 border border-gray-200 rounded divide-y divide-gray-100 max-h-36 overflow-auto">
              {results.map(c => (
                <li key={c.id}>
                  <button
                    onClick={() => void handleLink(c)}
                    disabled={isLinking}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-violet-50 disabled:opacity-50"
                  >
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.company && <span className="text-gray-500 text-xs ml-1">— {c.company}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!isSearching && searchQuery && results.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">No customers found.</p>
          )}
        </div>
      )}
    </div>
  );
}
