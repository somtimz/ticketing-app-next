'use client';

import { useState } from 'react';

export default function SendInviteButton({ customerId, defaultEmail }: { customerId: number; defaultEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');

  const handleSend = async () => {
    setSending(true);
    setError('');
    const res = await fetch('/api/clients/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, email, name })
    });
    const data = await res.json() as { inviteUrl?: string; message?: string };
    if (res.ok && data.inviteUrl) {
      setInviteUrl(data.inviteUrl);
    } else {
      setError(data.message ?? 'Failed to send invite.');
    }
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
      >
        Send Portal Invite
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Portal Invite</h2>

            {inviteUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-green-700 bg-green-50 rounded p-3">Invite created! Share this link:</p>
                <input readOnly value={inviteUrl} className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-gray-50" onClick={e => (e.target as HTMLInputElement).select()} />
                <button onClick={() => { setOpen(false); setInviteUrl(''); }} className="w-full py-2 bg-violet-600 text-white text-sm rounded-lg">Done</button>
              </div>
            ) : (
              <div className="space-y-3">
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Contact name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-gray-300 text-sm rounded-lg">Cancel</button>
                  <button onClick={() => void handleSend()} disabled={sending || !email || !name} className="flex-1 py-2 bg-violet-600 text-white text-sm rounded-lg disabled:opacity-50">
                    {sending ? 'Sending...' : 'Create Invite'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
