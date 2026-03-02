'use client';

import { useState, useEffect } from 'react';
import { UserGroupIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GuestUser {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  sponsorName: string | null;
  callerName: string | null;
  callerEmail: string | null;
  ticketCount: number;
}

export default function GuestUsersPage(): JSX.Element {
  const [guestUsers, setGuestUsers] = useState<GuestUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchGuestUsers = async () => {
    try {
      const res = await fetch('/api/admin/guest-users');
      if (res.ok) {
        const data = await res.json() as { guestUsers: GuestUser[] };
        setGuestUsers(data.guestUsers);
      }
    } catch {
      console.error('Failed to fetch guest users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchGuestUsers();
  }, []);

  const toggleActive = async (user: GuestUser) => {
    setTogglingId(user.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/guest-users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `${user.name} ${user.isActive ? 'deactivated' : 'reactivated'}.` });
        void fetchGuestUsers();
      } else {
        setMessage({ type: 'error', text: 'Failed to update guest user.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = guestUsers.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase()) ||
    g.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Guest Users</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            External callers, vendors, and contractors registered in the system
          </p>
        </div>
      </div>

      {message && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {search ? 'No guest users match your search.' : 'No guest users found.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sponsor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(user => (
                <tr key={user.id} className={user.isActive ? '' : 'bg-gray-50 opacity-60'}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">Added {new Date(user.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.company}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{user.email}</div>
                    {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {user.sponsorName ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.ticketCount}</td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        <CheckIcon className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <XMarkIcon className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => void toggleActive(user)}
                      disabled={togglingId === user.id}
                      className={`px-3 py-1 text-xs font-medium rounded border transition-colors disabled:opacity-50 ${
                        user.isActive
                          ? 'border-red-300 text-red-700 hover:bg-red-50'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {togglingId === user.id ? '...' : user.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
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
