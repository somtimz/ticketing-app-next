'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateTicketRequest } from '@/types';

export default function NewIssuePage(): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    // Build request object
    const requestData: CreateTicketRequest = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string | undefined,
      impact: formData.get('impact') as 'Low' | 'Medium' | 'High',
      urgency: formData.get('urgency') as 'Low' | 'Medium' | 'High',
      callerName: formData.get('callerName') as string,
      callerEmail: formData.get('callerEmail') as string | undefined,
      callerPhone: formData.get('callerPhone') as string | undefined,
      callerEmployeeId: formData.get('callerEmployeeId') as string | undefined
    };

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        router.push('/dashboard/issue-logging');
      } else {
        const data = (await response.json()) as { error?: string };
        setError(data.error || 'Failed to create ticket');
      }
    } catch {
      setError('An error occurred while creating the ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Issue</h1>
        <p className="mt-1 text-sm text-gray-500">Log a new issue from a caller</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 space-y-6"
      >
        {/* Caller Information */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Caller Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="callerName" className="block text-sm font-medium text-gray-700">
                Caller Name *
              </label>
              <input
                type="text"
                id="callerName"
                name="callerName"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="callerEmployeeId" className="block text-sm font-medium text-gray-700">
                Employee ID (if applicable)
              </label>
              <input
                type="text"
                id="callerEmployeeId"
                name="callerEmployeeId"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="callerEmail" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="callerEmail"
                name="callerEmail"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="callerPhone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="text"
                id="callerPhone"
                name="callerPhone"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Issue Details */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Issue Details
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select a category</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Network">Network</option>
                  <option value="Printer">Printer</option>
                  <option value="Temperature">Temperature</option>
                  <option value="Noise">Noise</option>
                </select>
              </div>
              <div>
                <label htmlFor="impact" className="block text-sm font-medium text-gray-700">
                  Impact *
                </label>
                <select
                  id="impact"
                  name="impact"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium" selected>
                    Medium
                  </option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
                  Urgency *
                </label>
                <select
                  id="urgency"
                  name="urgency"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium" selected>
                    Medium
                  </option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
