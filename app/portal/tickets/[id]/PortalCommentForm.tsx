'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalCommentForm({ ticketId }: { ticketId: number }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);

    await fetch(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, isInternal: false })
    });

    setBody('');
    setSubmitting(false);
    router.refresh();
  };

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-2">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        placeholder="Add a comment..."
      />
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50"
      >
        {submitting ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
}
