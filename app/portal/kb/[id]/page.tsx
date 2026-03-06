'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface KBArticle {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  category: { id: number; name: string } | null;
}

export default function PortalKBArticlePage() {
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<KBArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/kb/articles/${articleId}`);
        if (!res.ok) return;
        const data = await res.json() as { article: KBArticle };
        setArticle(data.article);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [articleId]);

  const sendFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (feedback) return;
    setFeedback(type);
    try {
      await fetch(`/api/kb/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful: type === 'helpful' })
      });
    } catch {
      // non-fatal
    }
  };

  if (isLoading) return <div className="text-center py-12 text-sm text-gray-500">Loading...</div>;
  if (!article) return <div className="text-center py-12 text-sm text-gray-500">Article not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/portal/kb" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Help Center
      </Link>

      {/* Article */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        {article.category && (
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide mb-2">{article.category.name}</p>
        )}
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">{article.title}</h1>
        <p className="text-xs text-gray-400 mb-6">
          Last updated {new Date(article.updatedAt).toLocaleDateString()}
        </p>

        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {article.content}
        </div>

        {/* Feedback */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          {feedback ? (
            <p className="text-sm text-gray-500 text-center">Thanks for your feedback!</p>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">Was this article helpful?</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => void sendFeedback('helpful')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                  </svg>
                  Yes, helpful
                </button>
                <button
                  onClick={() => void sendFeedback('not_helpful')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
                  </svg>
                  Not helpful
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Need more help? */}
      <div className="bg-violet-50 rounded-xl border border-violet-100 p-6 text-center">
        <p className="text-sm text-violet-800 font-medium">Still need help?</p>
        <p className="text-sm text-violet-600 mt-1">Our support team is ready to assist you.</p>
        <Link
          href="/portal/tickets/new"
          className="inline-block mt-3 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Submit a Request
        </Link>
      </div>
    </div>
  );
}
