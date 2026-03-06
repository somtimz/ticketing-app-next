'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TicketStatusBadge from '@/components/portal/TicketStatusBadge';

interface Comment {
  id: number;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: number; fullName: string; role: string };
}

interface Attachment {
  id: number;
  filename: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { id: number; fullName: string };
}

interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string } | null;
  assignedAgent: { id: number; fullName: string; email: string } | null;
}

const PRIORITY_LABELS: Record<string, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Standard',
  P4: 'Low'
};

export default function PortalTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [ticketRes, commentsRes, attachmentsRes] = await Promise.all([
        fetch(`/api/tickets/${ticketId}`),
        fetch(`/api/tickets/${ticketId}/comments`),
        fetch(`/api/tickets/${ticketId}/attachments`)
      ]);

      if (!ticketRes.ok) {
        setError('Ticket not found');
        return;
      }

      const ticketData = await ticketRes.json() as { ticket: Ticket };
      const commentsData = await commentsRes.json() as { comments: Comment[] };
      const attachmentsData = await attachmentsRes.json() as { attachments: Attachment[] };

      setTicket(ticketData.ticket);
      setComments(commentsData.comments ?? []);
      setAttachments(attachmentsData.attachments ?? []);
    } catch {
      setError('Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [ticketId]);

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setIsSubmittingComment(true);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody, isInternal: false })
      });

      if (res.ok) {
        setCommentBody('');
        await loadData();
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Mark this request as closed?')) return;
    setIsClosing(true);

    try {
      await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed', notes: 'Closed by submitter' })
      });
      await loadData();
    } finally {
      setIsClosing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        body: formData
      });
      await loadData();
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) return <div className="text-center py-12 text-sm text-gray-500">Loading...</div>;
  if (error || !ticket) return <div className="text-center py-12 text-sm text-red-600">{error || 'Ticket not found'}</div>;

  const isClosed = ticket.status === 'Closed';
  const isResolved = ticket.status === 'Resolved';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/portal/tickets" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        My Requests
      </Link>

      {/* Ticket header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gray-400 font-mono">{ticket.ticketNumber}</span>
              <TicketStatusBadge status={ticket.status} />
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
            {ticket.category && (
              <p className="mt-1 text-sm text-gray-500">{ticket.category.name}</p>
            )}
          </div>

          {!isClosed && (isResolved || ticket.status !== 'New') && (
            <button
              onClick={handleClose}
              disabled={isClosing}
              className="shrink-0 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isClosing ? 'Closing...' : 'Close Request'}
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
          {ticket.description}
        </div>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>Submitted {new Date(ticket.createdAt).toLocaleDateString()}</span>
          {ticket.assignedAgent && <span>Assigned to {ticket.assignedAgent.fullName}</span>}
        </div>

        {/* Resolution */}
        {ticket.resolution && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-800 mb-1">Resolution</p>
            <p className="text-sm text-green-900">{ticket.resolution}</p>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Attachments</h2>
          {!isClosed && (
            <label className="cursor-pointer text-xs text-violet-600 hover:underline">
              {isUploading ? 'Uploading...' : 'Attach file'}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          )}
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400">No attachments</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map(att => (
              <li key={att.id} className="flex items-center gap-3">
                <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-600 hover:underline flex-1 truncate">
                  {att.filename}
                </a>
                <span className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversation</h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No messages yet.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                  {comment.author.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{comment.author.fullName}</span>
                    {comment.author.role !== 'Employee' && (
                      <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">Support</span>
                    )}
                    <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isClosed && (
          <form onSubmit={handleAddComment} className="flex gap-3">
            <div className="flex-1">
              <textarea
                rows={3}
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                placeholder="Add a reply..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div className="shrink-0">
              <button
                type="submit"
                disabled={isSubmittingComment || !commentBody.trim()}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {isSubmittingComment ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
