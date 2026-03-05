'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { QueueListIcon } from '@heroicons/react/24/outline';
import type { TicketWithRelations, TicketStatus } from '@/types';
import { getSLAStatus } from '@/lib/sla';

const SLA_INDICATOR_STYLES: Record<'ok' | 'warning' | 'breached', { dot: string; label: string }> = {
  ok: { dot: 'bg-green-500', label: 'SLA OK' },
  warning: { dot: 'bg-yellow-500', label: 'SLA Warning' },
  breached: { dot: 'bg-red-500', label: 'SLA Breached' },
};

function SLAIndicator({ ticket }: { ticket: TicketWithRelations }): JSX.Element | null {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') return null;
  if (!ticket.slaResolutionDue) return null;

  const status = getSLAStatus(
    new Date(ticket.createdAt),
    new Date(ticket.slaResolutionDue),
    new Date()
  );
  const style = SLA_INDICATOR_STYLES[status];

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 border border-gray-200" title={style.label}>
      <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
      <span className={status === 'breached' ? 'text-red-700' : status === 'warning' ? 'text-yellow-700' : 'text-green-700'}>
        {style.label}
      </span>
    </span>
  );
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  New: 'bg-status-open text-white',
  Assigned: 'bg-blue-500 text-white',
  InProgress: 'bg-status-inProgress text-white',
  'On Hold': 'bg-yellow-500 text-white',
  Resolved: 'bg-status-resolved text-white',
  Closed: 'bg-status-closed text-white'
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  New: 'New',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  'On Hold': 'On Hold',
  Resolved: 'Resolved',
  Closed: 'Closed'
};

interface Agent {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

type SlaRiskFilter = 'all' | 'breach' | 'at-risk' | 'healthy';

const SLA_RISK_CHIPS: { value: SlaRiskFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { value: 'breach', label: 'Breach', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'at-risk', label: 'At Risk', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { value: 'healthy', label: 'Healthy', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
];

export default function AllTicketsPage(): JSX.Element {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');
  const [slaRisk, setSlaRisk] = useState<SlaRiskFilter>('all');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bulk action bar state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bulkAction, setBulkAction] = useState<'assign' | 'status' | 'priority'>('assign');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [isBulkLoading, setIsBulkLoading] = useState<boolean>(false);
  const [bulkError, setBulkError] = useState<string>('');

  const buildUrl = useCallback((): string => {
    const params = new URLSearchParams();
    if (slaRisk !== 'all') params.set('slaRisk', slaRisk);
    return `/api/tickets${params.toString() ? '?' + params.toString() : ''}`;
  }, [slaRisk]);

  const fetchTickets = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(buildUrl());
      const data = (await response.json()) as { tickets: TicketWithRelations[] };
      setTickets(data.tickets);
    } catch {
      console.error('Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    setIsLoading(true);
    void fetchTickets();

    const intervalId = setInterval(() => {
      void fetchTickets();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchTickets]);

  // Fetch agents once for bulk assign
  useEffect(() => {
    const fetchAgents = async (): Promise<void> => {
      try {
        const res = await fetch('/api/agents');
        const data = (await res.json()) as { agents: Agent[] };
        setAgents(data.agents ?? []);
      } catch {
        console.error('Failed to fetch agents');
      }
    };
    void fetchAgents();
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const openCount = tickets.filter(t => t.status === 'New' || t.status === 'Assigned').length;
  const inProgressCount = tickets.filter(t => t.status === 'InProgress' || t.status === 'On Hold').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;

  // Selection helpers
  const allFilteredIds = filteredTickets.map(t => t.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
  const someSelected = allFilteredIds.some(id => selectedIds.has(id));

  const toggleSelectAll = (): void => {
    if (allSelected) {
      const next = new Set(selectedIds);
      allFilteredIds.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      allFilteredIds.forEach(id => next.add(id));
      setSelectedIds(next);
    }
  };

  const toggleSelectOne = (id: number): void => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkApply = async (): Promise<void> => {
    if (!bulkValue) {
      setBulkError('Please select a value to apply.');
      return;
    }
    setBulkError('');
    setIsBulkLoading(true);
    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: bulkAction,
          value: bulkValue
        })
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        setBulkError(err.message ?? 'Bulk action failed');
      } else {
        setSelectedIds(new Set());
        setBulkValue('');
        await fetchTickets();
      }
    } catch {
      setBulkError('Bulk action failed. Please try again.');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const selectedCount = Array.from(selectedIds).filter(id => allFilteredIds.includes(id)).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <QueueListIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">All Tickets</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all support tickets
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-open">
            {openCount}
          </div>
          <div className="text-sm text-gray-500 mt-1">Open</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-inProgress">
            {inProgressCount}
          </div>
          <div className="text-sm text-gray-500 mt-1">In Progress</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-resolved">
            {resolvedCount}
          </div>
          <div className="text-sm text-gray-500 mt-1">Resolved</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-semibold text-status-closed">
            {closedCount}
          </div>
          <div className="text-sm text-gray-500 mt-1">Closed</div>
        </div>
      </div>

      {/* SLA Risk Filter Chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">SLA Risk:</span>
        {SLA_RISK_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => {
              setSlaRisk(chip.value);
              setSelectedIds(new Set());
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${chip.color} ${
              slaRisk === chip.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'New', 'Assigned', 'InProgress', 'On Hold', 'Resolved', 'Closed'].map(status => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setSelectedIds(new Set());
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status === 'all' ? 'All' : status === 'InProgress' ? 'In Progress' : status}
          </button>
        ))}
      </div>

      {/* Bulk Action Bar — shown when rows are selected */}
      {selectedCount > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-violet-700">
            {selectedCount} ticket{selectedCount !== 1 ? 's' : ''} selected
          </span>

          {/* Action selector */}
          <select
            value={bulkAction}
            onChange={e => {
              setBulkAction(e.target.value as 'assign' | 'status' | 'priority');
              setBulkValue('');
              setBulkError('');
            }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="assign">Assign to…</option>
            <option value="status">Set status…</option>
            <option value="priority">Set priority…</option>
          </select>

          {/* Value selector based on action */}
          {bulkAction === 'assign' && (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select agent…</option>
              {agents.map(agent => (
                <option key={agent.id} value={String(agent.id)}>
                  {agent.fullName}
                </option>
              ))}
            </select>
          )}

          {bulkAction === 'status' && (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select status…</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="InProgress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          )}

          {bulkAction === 'priority' && (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select priority…</option>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Medium</option>
              <option value="P4">P4 — Low</option>
            </select>
          )}

          <button
            onClick={() => void handleBulkApply()}
            disabled={isBulkLoading || !bulkValue}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            {isBulkLoading ? 'Applying…' : 'Apply'}
          </button>

          <button
            onClick={() => {
              setSelectedIds(new Set());
              setBulkError('');
            }}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Clear selection
          </button>

          {bulkError && (
            <span className="text-sm text-red-600 ml-2">{bulkError}</span>
          )}
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-gray-500 text-center py-8">
              No tickets found.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    aria-label="Select all tickets"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Ticket</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Caller</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Assigned To</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">SLA</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTickets.map(ticket => (
                <tr
                  key={ticket.id}
                  className={`hover:bg-gray-50 transition-colors ${selectedIds.has(ticket.id) ? 'bg-violet-50' : ''}`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => toggleSelectOne(ticket.id)}
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      aria-label={`Select ticket ${ticket.ticketNumber}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      <span className="font-medium text-primary-600">{ticket.ticketNumber}</span>
                      <p className="text-gray-900 mt-0.5 line-clamp-1">{ticket.title}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
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
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      {ticket.category?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      {ticket.caller?.fullName ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      {ticket.assignedAgent ? (
                        <span className="font-medium text-gray-700">{ticket.assignedAgent.fullName}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      <SLAIndicator ticket={ticket} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
