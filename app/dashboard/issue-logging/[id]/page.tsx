'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { TicketWithRelations, TicketStatus, TicketPriority } from '@/types';
import { getSLAStatus } from '@/lib/sla';

// ─── Type helpers ────────────────────────────────────────────────────────────

interface Comment {
  id: number;
  body: string;
  isInternal: boolean;
  createdAt: string | Date;
  author: { id: number; fullName: string; role: string };
}

// ─── Colour maps ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TicketStatus, string> = {
  New: 'bg-status-open text-white',
  Assigned: 'bg-blue-500 text-white',
  InProgress: 'bg-status-inProgress text-white',
  Pending: 'bg-yellow-500 text-white',
  Resolved: 'bg-status-resolved text-white',
  Closed: 'bg-status-closed text-white'
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  New: 'New',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  Pending: 'Pending',
  Resolved: 'Resolved',
  Closed: 'Closed'
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  P1: 'bg-priority-critical text-white',
  P2: 'bg-priority-high text-white',
  P3: 'bg-priority-medium text-white',
  P4: 'bg-priority-low text-white'
};

// ─── SLA Badge ───────────────────────────────────────────────────────────────

function SLABadge({ ticket }: { ticket: TicketWithRelations }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!ticket.slaResolutionDue || ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return null;
  }

  const due = new Date(ticket.slaResolutionDue);
  const created = new Date(ticket.createdAt);
  const slaStatus = getSLAStatus(created, due, now);

  const diffMs = due.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const hours = Math.floor(absDiffMs / 3_600_000);
  const minutes = Math.floor((absDiffMs % 3_600_000) / 60_000);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const styles = {
    ok: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    breached: 'bg-red-100 text-red-800 border-red-300'
  };

  const labels = {
    ok: `SLA: ${timeStr} remaining`,
    warning: `SLA warning: ${timeStr} remaining`,
    breached: `SLA breached by ${timeStr}`
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[slaStatus]}`}>
      {labels[slaStatus]}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TicketDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Status update
  const [newStatus, setNewStatus] = useState<TicketStatus>('New');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Resolve
  const [resolution, setResolution] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Assign
  const [agents, setAgents] = useState<{ id: number; fullName: string; role: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Log call
  const [showCallForm, setShowCallForm] = useState(false);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [callDuration, setCallDuration] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<'resolved' | 'escalated' | 'follow_up'>('follow_up');
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  const userRole = (session?.user as any)?.role as string | undefined;
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      const data = await res.json() as TicketWithRelations;
      setTicket(data);
      setNewStatus(data.status);
    } catch {
      setError('Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`);
      if (!res.ok) return;
      const data = await res.json() as { comments: Comment[] };
      setComments(data.comments);
    } catch {
      // non-fatal
    }
  }, [ticketId]);

  useEffect(() => {
    void fetchTicket();
    void fetchComments();
  }, [fetchTicket, fetchComments]);

  useEffect(() => {
    if (!isAgent) return;
    void (async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json() as { agents: { id: number; fullName: string; role: string }[] };
        setAgents(data.agents ?? []);
      } catch {
        // non-fatal
      }
    })();
  }, [isAgent]);

  const handleStatusUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: statusNotes })
      });
      if (res.ok) {
        await fetchTicket();
        setStatusNotes('');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsResolving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
      if (res.ok) {
        await fetchTicket();
        setResolution('');
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleAddComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody, isInternal })
      });
      if (res.ok) {
        setCommentBody('');
        setIsInternal(false);
        await fetchComments();
      }
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleAssign = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: parseInt(selectedAgentId) })
      });
      if (res.ok) {
        await fetchTicket();
        setSelectedAgentId('');
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleLogCall = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggingCall(true);
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket?.id,
          callDirection,
          duration: parseInt(callDuration) || 0,
          notes: callNotes,
          callOutcome
        })
      });
      if (res.ok) {
        setShowCallForm(false);
        setCallNotes('');
        setCallDuration('');
        setCallOutcome('follow_up');
        await fetchTicket();
      }
    } finally {
      setIsLoggingCall(false);
    }
  };

  // ─── Loading / error states ───────────────────────────────────────────────

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
        <button onClick={() => router.back()} className="mt-4 text-primary-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const isOpen = ticket.status !== 'Resolved' && ticket.status !== 'Closed';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">{ticket.ticketNumber}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[ticket.status]}`}>
              {STATUS_LABELS[ticket.status]}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${PRIORITY_COLORS[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <SLABadge ticket={ticket} />
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ticket Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</dd>
            </div>
            {ticket.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{ticket.category.name}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Priority</dt>
              <dd className="mt-1 text-sm text-gray-900">{ticket.impact} impact / {ticket.urgency} urgency → {ticket.priority}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</dd>
            </div>
            {ticket.slaFirstResponseDue && (
              <div>
                <dt className="text-sm font-medium text-gray-500">First Response Due</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(ticket.slaFirstResponseDue).toLocaleString()}</dd>
              </div>
            )}
            {ticket.slaResolutionDue && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolution Due</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(ticket.slaResolutionDue).toLocaleString()}</dd>
              </div>
            )}
            {ticket.resolvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(ticket.resolvedAt).toLocaleString()}</dd>
              </div>
            )}
            {ticket.resolution && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolution</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{ticket.resolution}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Caller Information */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Caller Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{ticket.caller?.fullName ?? '—'}</dd>
            </div>
            {ticket.caller?.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{ticket.caller.email}</dd>
              </div>
            )}
            {ticket.caller?.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{ticket.caller.phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Assigned Agent</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {ticket.assignedAgent ? ticket.assignedAgent.fullName : (
                  <span className="text-gray-400 italic">Unassigned</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Comments {comments.length > 0 && <span className="text-gray-400 text-base font-normal">({comments.length})</span>}
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 italic mb-4">No comments yet.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`rounded-lg p-4 ${comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.author.fullName}
                    {comment.isInternal && (
                      <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">Internal note</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment form */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <textarea
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex items-center justify-between">
            {isAgent && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={e => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                Internal note (not visible to caller)
              </label>
            )}
            <button
              type="submit"
              disabled={isPostingComment || !commentBody.trim()}
              className="ml-auto px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isPostingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>

      {/* Call History */}
      {ticket.calls && ticket.calls.length > 0 && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Call History</h2>
          <div className="space-y-4">
            {ticket.calls.map(call => (
              <div key={call.id} className="border-l-4 border-primary-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {call.callDirection} call — {call.agent.fullName}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(call.createdAt).toLocaleString()}</p>
                    {call.notes && <p className="mt-1 text-sm text-gray-700">{call.notes}</p>}
                    <span className="mt-1 inline-block text-xs text-gray-500 capitalize">
                      Outcome: {call.callOutcome.replace('_', ' ')}
                    </span>
                  </div>
                  {call.duration != null && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {isOpen && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
          <div className="space-y-6">

            {/* Status Update */}
            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Update Status</h3>
              <div className="flex gap-3 flex-wrap">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as TicketStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>

            {/* Assign / Reassign (agents only) */}
            {isAgent && (
              <form onSubmit={handleAssign} className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  {ticket.assignedAgent ? 'Reassign Ticket' : 'Assign Ticket'}
                </h3>
                {ticket.assignedAgent && (
                  <p className="text-xs text-gray-500">
                    Currently assigned to <span className="font-medium text-gray-700">{ticket.assignedAgent.fullName}</span>
                  </p>
                )}
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    required
                    className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select agent...</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={String(agent.id)}>
                        {agent.fullName} ({agent.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isAssigning || !selectedAgentId}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </form>
            )}

            {/* Resolve */}
            <form onSubmit={handleResolve} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Resolve Ticket</h3>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Enter resolution details..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                type="submit"
                disabled={isResolving}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {isResolving ? 'Resolving...' : 'Resolve Ticket'}
              </button>
            </form>

            {/* Log Call (agents only) */}
            {isAgent && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Log Phone Call</h3>
                  <button
                    type="button"
                    onClick={() => setShowCallForm(v => !v)}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    {showCallForm ? 'Cancel' : '+ Log Call'}
                  </button>
                </div>

                {showCallForm && (
                  <form onSubmit={handleLogCall} className="space-y-3 border border-gray-200 rounded-md p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
                        <select
                          value={callDirection}
                          onChange={e => setCallDirection(e.target.value as 'inbound' | 'outbound')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="inbound">Inbound</option>
                          <option value="outbound">Outbound</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Duration (seconds)</label>
                        <input
                          type="number"
                          min="0"
                          value={callDuration}
                          onChange={e => setCallDuration(e.target.value)}
                          placeholder="e.g. 300"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
                      <select
                        value={callOutcome}
                        onChange={e => setCallOutcome(e.target.value as typeof callOutcome)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="follow_up">Follow-up needed</option>
                        <option value="resolved">Resolved on call</option>
                        <option value="escalated">Escalated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <textarea
                        value={callNotes}
                        onChange={e => setCallNotes(e.target.value)}
                        placeholder="What was discussed..."
                        rows={2}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoggingCall}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoggingCall ? 'Logging...' : 'Log Call'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
