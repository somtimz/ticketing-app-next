'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  categoryId: number | null;
  categoryName: string | null;
  createdBy: number;
  authorName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KBArticlePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // voted tracks local vote state; counts are read directly from article to avoid duplicating state
  const [voted, setVoted] = useState<'helpful' | 'not_helpful' | null>(null);

  const userRole = session?.user?.role as string | undefined;
  const userId = session?.user?.id;
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';
  const isAdmin = userRole === 'Admin';
  const canEdit = article && (isAdmin || (isAgent && String(article.createdBy) === userId));

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/kb/articles/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Article not found.' : 'Failed to load article.');
          return;
        }
        const data = await res.json() as KBArticle;
        setArticle(data);

        // Check localStorage for prior vote
        const storedVote = localStorage.getItem(`kb-vote-${id}`);
        if (storedVote === 'helpful' || storedVote === 'not_helpful') {
          setVoted(storedVote);
        }
      } catch {
        setError('Failed to load article.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleFeedback = async (vote: 'helpful' | 'not_helpful') => {
    if (voted) return;
    try {
      const res = await fetch(`/api/kb/articles/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote })
      });
      if (res.ok) {
        const data = await res.json() as { helpfulCount: number; notHelpfulCount: number };
        setArticle(prev => prev ? { ...prev, helpfulCount: data.helpfulCount, notHelpfulCount: data.notHelpfulCount } : null);
        setVoted(vote);
        localStorage.setItem(`kb-vote-${id}`, vote);
      }
    } catch {
      console.error('Failed to submit feedback');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
    );
  }

  if (error || !article) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error ?? 'Article not found.'}</p>
        <Link href="/dashboard/kb" className="text-sm text-primary-600 hover:underline">
          ← Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back link */}
      <Link href="/dashboard/kb" className="text-sm text-primary-600 hover:underline">
        ← Knowledge Base
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {article.categoryName && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                  {article.categoryName}
                </span>
              )}
              {isAgent && !article.isPublished && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                  Draft
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{article.title}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
              {article.authorName && <span>By {article.authorName}</span>}
              <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
              <span>{article.viewCount} views</span>
              <span>{article.helpfulCount} found helpful</span>
            </div>
          </div>
          {canEdit && (
            <Link
              href={`/dashboard/kb/${id}/edit`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="prose prose-sm max-w-none text-gray-800 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600 [&_a]:text-primary-600 [&_a]:underline [&_hr]:border-gray-200">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Was this article helpful?</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleFeedback('helpful')}
            disabled={!!voted}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ${
              voted === 'helpful'
                ? 'bg-green-50 border-green-300 text-green-700'
                : voted
                ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            👍 Yes ({article.helpfulCount})
          </button>
          <button
            onClick={() => void handleFeedback('not_helpful')}
            disabled={!!voted}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ${
              voted === 'not_helpful'
                ? 'bg-red-50 border-red-300 text-red-700'
                : voted
                ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            👎 No ({article.notHelpfulCount})
          </button>
          {voted && (
            <span className="text-xs text-gray-500">Thanks for your feedback!</span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          Still need help?{' '}
          <Link
            href="/dashboard/issue-logging/new"
            className="font-medium underline hover:no-underline"
          >
            Create a support ticket
          </Link>
        </p>
      </div>
    </div>
  );
}
