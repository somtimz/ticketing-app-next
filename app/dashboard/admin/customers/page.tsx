'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCircleIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  ticketCount: number;
  serviceRequestCount: number;
}

export default function CustomersPage(): JSX.Element {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = search ? `/api/customers?q=${encodeURIComponent(search)}` : '/api/customers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json() as { customers: Customer[] };
        setCustomers(data.customers);
      }
    } catch {
      console.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchCustomers(); }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail || null,
          phone: newPhone || null,
          company: newCompany || null,
          notes: newNotes || null
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Customer "${newName}" created.` });
        setShowForm(false);
        setNewName(''); setNewEmail(''); setNewPhone(''); setNewCompany(''); setNewNotes('');
        void fetchCustomers();
      } else {
        const d = await res.json() as { message?: string };
        setMessage({ type: 'error', text: d.message ?? 'Failed to create customer.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <UserCircleIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            External customer accounts linked to tickets and service requests
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700"
        >
          <PlusIcon className="h-4 w-4" />
          New Customer
        </button>
      </div>

      {message && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* New customer form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add New Customer</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input
                type="text"
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="Company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                type="text"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="555-0100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Any notes about this customer..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Create Customer'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {search ? 'No customers match your search.' : 'No customers yet. Create one above.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map(customer => (
                <tr
                  key={customer.id}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${customer.isActive ? '' : 'opacity-60 bg-gray-50'}`}
                  onClick={() => router.push(`/dashboard/admin/customers/${customer.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">Added {new Date(customer.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {customer.company ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {customer.email && <div className="text-sm text-gray-700">{customer.email}</div>}
                    {customer.phone && <div className="text-xs text-gray-500">{customer.phone}</div>}
                    {!customer.email && !customer.phone && <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{customer.ticketCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{customer.serviceRequestCount}</td>
                  <td className="px-6 py-4">
                    {customer.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        <CheckIcon className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <XMarkIcon className="h-3 w-3" /> Inactive
                      </span>
                    )}
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
