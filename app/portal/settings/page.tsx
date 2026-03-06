'use client';

import { useState, useEffect } from 'react';

interface NotificationPreferences {
  statusChange: boolean;
  commentAdded: boolean;
  resolved: boolean;
}

const PREF_ITEMS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'statusChange', label: 'Status updates', description: 'When your ticket status changes (e.g. In Progress, Pending)' },
  { key: 'commentAdded', label: 'New replies', description: 'When an agent replies to your ticket' },
  { key: 'resolved', label: 'Resolved notifications', description: 'When your ticket is marked as resolved or closed' }
];

export default function PortalSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    statusChange: true,
    commentAdded: true,
    resolved: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me/preferences');
        if (res.ok) {
          const data = await res.json() as { preferences: NotificationPreferences };
          setPrefs(data.preferences);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
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
        <div>
          <h2 className="text-base font-semibold text-gray-900">Email Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose which emails you receive about your requests</p>
        </div>

        <div className="space-y-5 divide-y divide-gray-100">
          {PREF_ITEMS.map(({ key, label, description }) => (
            <div key={key} className="flex items-start justify-between gap-4 pt-5 first:pt-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                  prefs[key] ? 'bg-violet-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={prefs[key]}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    prefs[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          {saved ? <p className="text-sm text-green-600">Preferences saved.</p> : <span />}
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
