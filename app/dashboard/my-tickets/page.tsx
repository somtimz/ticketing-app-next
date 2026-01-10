'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TicketWithRelations, TicketStatus } from '@/types';

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: 'bg-status-open text-white',
  'In Progress': 'bg-status-inProgress text-white',
  Resolved: 'bg-status-resolved text-white',
  Closed: 'bg-status-closed text-white'
};

export default function MyTicketsPage(): JSX.Element {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchTickets = async (): Promise<void> => {
      try {
        const response = await fetch('/api/tickets?mine=true');
        const data = (await response.json()) as { tickets: TicketWithRelations[] };
        setTickets(data.tickets);
      } catch {
        console.error('Failed to fetch tickets');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTickets();

    const intervalId = setInterval(() => {
      void fetchTickets();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const statusCounts: Partial<Record<TicketStatus, number>> = {
    Open: tickets.filter(t => t.status === 'Open').length,
    'In Progress': tickets.filter(t => t.status === 'In Progress').length,
    Resolved: tickets.filter(t => t.status === 'Resolved').length,
    Closed: tickets.filter(t => t.status === 'Closed').length
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tickets assigned to you or created by you
          </p>
        </div>
        <Link
          href="/dashboard/issue-logging/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          New Issue
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-open">
            {statusCounts.Open || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Open</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-inProgress">
            {statusCounts['In Progress'] || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">In Progress</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-resolved">
            {statusCounts.Resolved || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Resolved</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-closed">
            {statusCounts.Closed || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Closed</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center py-8">
                No tickets found. Click &quot;New Issue&quot; to create your first
                ticket.
              </p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <Link
                key={ticket.id}
                href={`/dashboard/issue-logging/${ticket.id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-primary-600">
                          {ticket.ticketNumber}
                        </span>
                        <h3 className="text-sm font-medium text-gray-900">
                          {ticket.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[ticket.status]}`}
                        >
                          {ticket.status}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            ticket.priority === 'P1'
                              ? 'bg-red-100 text-red-800'
                              : ticket.priority === 'P2'
                                ? 'bg-orange-100 text-orange-800'
                                : ticket.priority === 'P3'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Caller:{' '}
                          <span className="font-medium text-gray-700">
                            {ticket.caller.fullName}
                          </span>
                        </span>
                        {ticket.category && (
                          <span>
                            Category:{' '}
                            <span className="font-medium text-gray-700">
                              {ticket.category.name}
                            </span>
                          </span>
                        )}
                        <span>
                          Created:{' '}
                          <span className="font-medium text-gray-700">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {ticket.assignedAgent ? (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">
                            {ticket.assignedAgent.fullName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
