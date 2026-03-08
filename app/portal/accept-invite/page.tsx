'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid invite link.'); setLoading(false); return; }
    fetch(`/api/clients/invite/${token}`)
      .then(r => r.json())
      .then((data: { email?: string; error?: string }) => {
        if (data.email) setEmail(data.email);
        else setError('This invite link is invalid or has expired.');
      })
      .catch(() => setError('Failed to validate invite.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/clients/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (!res.ok) {
      const data = await res.json() as { message?: string };
      setError(data.message ?? 'Something went wrong.');
      setSubmitting(false);
      return;
    }

    // Sign in automatically
    await signIn('credentials', { email, password, callbackUrl: '/portal' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (error && !email) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Set your password</h1>
        <p className="text-sm text-gray-500 mb-6">Welcome! Set a password for <strong>{email}</strong></p>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? 'Setting up account...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
