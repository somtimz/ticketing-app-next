'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  UserCircleIcon,
  CheckIcon,
  XMarkIcon,
  LinkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LinkedTicket {
  id: number;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface LinkedSR {
  id: number;
  requestNumber: string;
  title: string;
  status: string;
  category: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Assigned: 'bg-indigo-100 text-indigo-700',
  InProgress: 'bg-amber-100 text-amber-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-violet-100 text-violet-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Fulfilled: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700'
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-yellow-100 text-yellow-700',
  P4: 'bg-gray-100 text-gray-700'
};

export default function CustomerDetailPage(): JSX.Element {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tickets, setTickets] = useState<LinkedTicket[]>([]);
  const [serviceRequests, setServiceRequests] = useState<LinkedSR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Link by number
  const [linkInput, setLinkInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) return;
      const data = await res.json() as { customer: Customer; tickets: LinkedTicket[]; serviceRequests: LinkedSR[] };
      setCustomer(data.customer);
      setTickets(data.tickets);
      setServiceRequests(data.serviceRequests);
    } catch {
      console.error('Failed to fetch customer');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void fetchCustomer();
  }, [fetchCustomer]);

  const startEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditEmail(customer.email ?? '');
    setEditPhone(customer.phone ?? '');
    setEditCompany(customer.company ?? '');
    setEditNotes(customer.notes ?? '');
    setEditIsActive(customer.isActive);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
          phone: editPhone || null,
          company: editCompany || null,
          notes: editNotes || null,
          isActive: editIsActive
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Customer updated.' });
        setIsEditing(false);
        void fetchCustomer();
      } else {
        const d = await res.json() as { message?: string };
        setMessage({ type: 'error', text: d.message ?? 'Failed to update customer.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlinkTicket = async (ticketId: number) => {
    if (!confirm('Unlink this ticket from the customer?')) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: null })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Ticket unlinked.' });
        void fetchCustomer();
      } else {
        setMessage({ type: 'error', text: 'Failed to unlink ticket.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
  };

  const handleUnlinkSR = async (srId: number) => {
    if (!confirm('Unlink this service request from the customer?')) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/service-requests/${srId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: null })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Service request unlinked.' });
        void fetchCustomer();
      } else {
        setMessage({ type: 'error', text: 'Failed to unlink service request.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
  };

  const handleLinkByNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkInput.trim().toUpperCase();
    if (!trimmed) return;
    setIsLinking(true);
    setMessage(null);

    try {
      if (trimmed.startsWith('TICK-') || trimmed.startsWith('INC-')) {
        // Find ticket by number
        const searchRes = await fetch(`/api/tickets?ticketNumber=${encodeURIComponent(trimmed)}`);
        if (!searchRes.ok) throw new Error('Ticket not found');
        const searchData = await searchRes.json() as { tickets?: { id: number }[]; id?: number };
        const ticketId = searchData.id ?? searchData.tickets?.[0]?.id;
        if (!ticketId) throw new Error('Ticket not found');
        const res = await fetch(`/api/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: parseInt(customerId, 10) })
        });
        if (!res.ok) throw new Error('Failed to link');
      } else if (trimmed.startsWith('REQ-')) {
        // Find SR by number
        const searchRes = await fetch(`/api/service-requests?requestNumber=${encodeURIComponent(trimmed)}`);
        if (!searchRes.ok) throw new Error('Service request not found');
        const searchData = await searchRes.json() as { serviceRequests?: { id: number }[]; id?: number };
        const srId = searchData.id ?? searchData.serviceRequests?.[0]?.id;
        if (!srId) throw new Error('Service request not found');
        const res = await fetch(`/api/service-requests/${srId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: parseInt(customerId, 10) })
        });
        if (!res.ok) throw new Error('Failed to link');
      } else {
        throw new Error('Enter a ticket number (TICK-XXXX) or service request number (REQ-XXXX)');
      }

      setMessage({ type: 'success', text: `${trimmed} linked to this customer.` });
      setLinkInput('');
      void fetchCustomer();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to link.' });
    } finally {
      setIsLinking(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-gray-500">Loading...</div>;
  }

  if (!customer) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Customer not found.</p>
        <Link href="/dashboard/admin/customers" className="mt-2 text-violet-600 hover:underline text-sm">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircleIcon className="h-6 w-6 text-violet-600" />
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
          {customer.isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
              <CheckIcon className="h-3 w-3" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
              <XMarkIcon className="h-3 w-3" /> Inactive
            </span>
          )}
        </div>
        <Link
          href="/dashboard/admin/customers"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </Link>
      </div>

      {message && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Customer Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Customer Information</h2>
          {!isEditing && (
            <button
              onClick={startEdit}
              className="text-sm text-violet-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input
                type="text"
                value={editCompany}
                onChange={e => setEditCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customer.company && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Company</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{customer.company}</dd>
              </div>
            )}
            {customer.email && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Email</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{customer.email}</dd>
              </div>
            )}
            {customer.phone && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Phone</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{customer.phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-gray-500">Created</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{new Date(customer.createdAt).toLocaleDateString()}</dd>
            </div>
            {customer.notes && (
              <div className="md:col-span-2">
                <dt className="text-xs font-medium text-gray-500">Notes</dt>
                <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Link by number */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          <LinkIcon className="h-4 w-4 inline mr-1" />
          Link Ticket or Service Request
        </h2>
        <form onSubmit={handleLinkByNumber} className="flex gap-3">
          <input
            type="text"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            placeholder="TICK-1001 or REQ-0001"
            className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={isLinking || !linkInput.trim()}
            className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {isLinking ? 'Linking...' : 'Link'}
          </button>
        </form>
      </div>

      {/* Linked Tickets */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Linked Tickets ({tickets.length})</h2>
        </div>
        {tickets.length === 0 ? (
          <div className="p-5 text-sm text-gray-400 italic">No tickets linked to this customer.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/issue-logging/${t.id}`} className="text-sm font-mono text-violet-600 hover:underline">
                      {t.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 max-w-xs truncate">{t.title}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority] ?? 'bg-gray-100 text-gray-700'}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => void handleUnlinkTicket(t.id)}
                      className="text-xs text-red-600 hover:underline flex items-center gap-1"
                    >
                      <TrashIcon className="h-3 w-3" /> Unlink
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Linked Service Requests */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Linked Service Requests ({serviceRequests.length})</h2>
        </div>
        {serviceRequests.length === 0 ? (
          <div className="p-5 text-sm text-gray-400 italic">No service requests linked to this customer.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {serviceRequests.map(sr => (
                <tr key={sr.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/service-requests/${sr.id}`} className="text-sm font-mono text-violet-600 hover:underline">
                      {sr.requestNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 max-w-xs truncate">{sr.title}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[sr.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {sr.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{sr.category}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{new Date(sr.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => void handleUnlinkSR(sr.id)}
                      className="text-xs text-red-600 hover:underline flex items-center gap-1"
                    >
                      <TrashIcon className="h-3 w-3" /> Unlink
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
