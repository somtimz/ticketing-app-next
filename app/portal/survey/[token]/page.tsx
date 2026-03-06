'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SurveyData {
  token: string;
  submittedAt: string | null;
  rating: number | null;
  ticket: { ticketNumber: string; title: string } | null;
}

const RATINGS = [
  { value: 1, label: 'Very dissatisfied' },
  { value: 2, label: 'Dissatisfied' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Satisfied' },
  { value: 5, label: 'Very satisfied' }
];

export default function SurveyPage() {
  const params = useParams();
  const token = params.token as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/portal/survey/${token}`, { signal: controller.signal });
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json() as { survey: SurveyData };
        setSurvey(data.survey);
        if (data.survey.submittedAt) setSubmitted(true);
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedRating) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/portal/survey/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selectedRating, feedback: feedback.trim() || undefined })
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Failed to submit');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Survey not found or link has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-800">IT Help Desk</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank you!</h2>
              <p className="text-sm text-gray-500">Your feedback helps us improve our support.</p>
              <Link href="/portal" className="inline-block mt-6 text-sm text-violet-600 hover:underline">
                Back to Help Desk Portal
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">How did we do?</h2>
                {survey?.ticket && (
                  <p className="text-sm text-gray-500 mt-1">
                    {survey.ticket.ticketNumber} — {survey.ticket.title}
                  </p>
                )}
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">{error}</div>}

              {/* Star rating */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3 text-center">Rate your experience</p>
                <div className="flex justify-center gap-2">
                  {RATINGS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedRating(r.value)}
                      title={r.label}
                      className={`text-3xl transition-transform hover:scale-110 ${
                        selectedRating !== null && r.value <= selectedRating
                          ? 'opacity-100'
                          : 'opacity-30'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {selectedRating && (
                  <p className="text-center text-xs text-gray-500 mt-2">
                    {RATINGS.find(r => r.value === selectedRating)?.label}
                  </p>
                )}
              </div>

              {/* Optional feedback */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional comments (optional)
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="What went well? What could we improve?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!selectedRating || isSubmitting}
                className="w-full py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
