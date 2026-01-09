'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { TicketWithRelations, TicketStatus, TicketPriority } from '@/types';

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: 'bg-status-open text-white',
  'In Progress': 'bg-status-inProgress text-white',
  Resolved: 'bg-status-resolved text-white',
  Closed: 'bg-status-closed text-white'
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  P1: 'bg-priority-critical text-white',
  P2: 'bg-priority-high text-white',
  P3: 'bg-priority-medium text-white',
  P4: 'bg-priority-low text-white'
};

export default function TicketDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Status update form
  const [newStatus, setNewStatus] = useState<TicketStatus>('Open');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Resolve form
  const [resolution, setResolution] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);

  useEffect(() => {
    const fetchTicket = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ticket');
        }
        const data = (await response.json()) as TicketWithRelations;
        setTicket(data);
      } catch {
        setError('Failed to load ticket');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTicket();
  }, [ticketId]);

  const handleStatusUpdate = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: statusNotes })
      });

      if (response.ok) {
        // Refresh ticket data
        const updatedResponse = await fetch(`/api/tickets/${ticketId}`);
        const updatedTicket = (await updatedResponse.json()) as TicketWithRelations;
        setTicket(updatedTicket);
        setStatusNotes('');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsResolving(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });

      if (response.ok) {
        // Refresh ticket data
        const updatedResponse = await fetch(`/api/tickets/${ticketId}`);
        const updatedTicket = (await updatedResponse.json()) as TicketWithRelations;
        setTicket(updatedTicket);
        setResolution('');
      }
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Ticket not found'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-primary-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {ticket.ticketNumber}
            </h1>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[ticket.status]}`}
            >
              {ticket.status}
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${PRIORITY_COLORS[ticket.priority]}`}
            >
              {ticket.priority}
            </span>
          </div>
          <p className="text-gray-600">{ticket.title}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket Information */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Ticket Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{ticket.description}</dd>
            </div>
            {ticket.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ticket.category.name}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(ticket.createdAt).toLocaleString()}
              </dd>
            </div>
            {ticket.resolvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(ticket.resolvedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {ticket.resolution && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolution</dt>
                <dd className="mt-1 text-sm text-gray-900">{ticket.resolution}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Caller Information */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Caller Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{ticket.caller.fullName}</dd>
            </div>
            {ticket.caller.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{ticket.caller.email}</dd>
              </div>
            )}
            {ticket.caller.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{ticket.caller.phone}</dd>
              </div>
            )}
            {ticket.assignedAgent && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Assigned Agent</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ticket.assignedAgent.fullName}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Call History */}
      {ticket.calls && ticket.calls.length > 0 && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Call History</h2>
          <div className="space-y-4">
            {ticket.calls.map(call => (
              <div
                key={call.id}
                className="border-l-4 border-primary-500 pl-4 py-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {call.callType} - {call.agent.fullName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(call.createdAt).toLocaleString()}
                    </p>
                    {call.notes && (
                      <p className="mt-1 text-sm text-gray-700">{call.notes}</p>
                    )}
                  </div>
                  {call.durationSeconds && (
                    <span className="text-xs text-gray-500">
                      {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>

          <div className="space-y-6">
            {/* Status Update */}
            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Update Status</h3>
              <div className="flex gap-3">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as TicketStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </form>

            {/* Resolve */}
            <form onSubmit={handleResolve} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Resolve Ticket</h3>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Enter resolution details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
              <button
                type="submit"
                disabled={isResolving}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Resolve
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
