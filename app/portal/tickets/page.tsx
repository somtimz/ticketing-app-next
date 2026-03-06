'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import TicketStatusBadge from '@/components/portal/TicketStatusBadge';

interface PortalTicket {
  id: number;
  ticketNumber: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  category: { id: number; name: string } | null;
  assignedAgent: { id: number; fullName: string } | null;
}

const PRIORITY_LABELS: Record<string, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Standard',
  P4: 'Low'
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-800',
  P2: 'bg-orange-100 text-orange-800',
  P3: 'bg-blue-100 text-blue-800',
  P4: 'bg-gray-100 text-gray-700'
};

const FILTER_TABS = [
  { label: 'Active', value: 'active' },
  { label: 'All', value: 'all' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' }
];

const ACTIVE_STATUSES = ['New', 'Assigned', 'InProgress', 'Pending'];

export default function PortalTicketsPage() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [query, setQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTickets = async (q = '') => {
    setIsLoading(true);
    setError('');
    try {
      const url = q ? `/api/portal/tickets?q=${encodeURIComponent(q)}` : '/api/portal/tickets';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json() as { tickets: PortalTicket[] };
      setTickets(data.tickets ?? []);
    } catch {
      setError('Could not load your requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTickets();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchTickets(value);
    }, 400);
  };

  const filtered = tickets.filter(t => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(t.status);
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage your support requests</p>
        </div>
        <Link
          href="/portal/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Request
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search your requests..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
        />
      </div>

      {/* Filter tabs (hidden during search) */}
      {!query && (
        <div className="flex gap-1 border-b border-gray-200">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.value
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Ticket list */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">
              {query ? `No requests found for "${query}"` : 'No requests found.'}
            </p>
            {!query && (
              <Link href="/portal/tickets/new" className="mt-3 inline-block text-sm text-violet-600 hover:underline">
                Submit your first request
              </Link>
            )}
          </div>
        ) : (
          filtered.map(ticket => (
            <Link key={ticket.id} href={`/portal/tickets/${ticket.id}`} className="block px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-mono">{ticket.ticketNumber}</span>
                    <TicketStatusBadge status={ticket.status} />
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100 text-gray-700'}`}>
                      {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">{ticket.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    {ticket.category && <span>{ticket.category.name}</span>}
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.assignedAgent && <span>Assigned to {ticket.assignedAgent.fullName}</span>}
                  </div>
                </div>
                <svg className="h-4 w-4 text-gray-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
