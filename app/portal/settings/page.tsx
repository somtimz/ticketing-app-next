'use client';

import { useState, useEffect } from 'react';

export default function PortalSettingsPage() {
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me/preferences');
        if (res.ok) {
          const data = await res.json() as { emailNotificationsEnabled: boolean };
          setEmailNotificationsEnabled(data.emailNotificationsEnabled);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotificationsEnabled })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-center py-12 text-sm text-gray-500">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your notification preferences</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-900">Email Notifications</h2>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Status updates</p>
            <p className="text-xs text-gray-500 mt-0.5">Receive an email when your ticket status changes</p>
          </div>
          <button
            type="button"
            onClick={() => setEmailNotificationsEnabled(!emailNotificationsEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
              emailNotificationsEnabled ? 'bg-violet-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={emailNotificationsEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                emailNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          {saved && <p className="text-sm text-green-600">Preferences saved.</p>}
          {!saved && <span />}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
