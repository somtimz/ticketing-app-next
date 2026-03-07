'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { BookOpenIcon, PencilSquareIcon, TrashIcon, HandThumbUpIcon, HandThumbDownIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

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
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: number; name: string }[];
  articleType: 'FAQ' | 'HowTo' | 'KnownError' | 'General' | null;
  expiresAt: string | null;
  reviewStatus: 'Draft' | 'InReview' | 'Published' | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  reviewerName: string | null;
}

interface KbComment {
  id: number;
  articleId: number;
  authorId: number;
  authorName: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const ARTICLE_TYPE_STYLES: Record<string, string> = {
  FAQ: 'bg-blue-100 text-blue-700',
  HowTo: 'bg-green-100 text-green-700',
  KnownError: 'bg-red-100 text-red-700',
  General: 'bg-gray-100 text-gray-600'
};

const REVIEW_STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  InReview: 'bg-amber-100 text-amber-700',
  Published: 'bg-green-100 text-green-700'
};

export default function KBArticlePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // voted tracks local vote state; counts are read directly from article to avoid duplicating state
  const [voted, setVoted] = useState<'helpful' | 'not_helpful' | null>(null);

  // Review workflow state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<KbComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const userRole = session?.user?.role as string | undefined;
  const userId = session?.user?.id;
  const isAgent = userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';
  const isTeamLead = userRole === 'TeamLead' || userRole === 'Admin';
  const isAdmin = userRole === 'Admin';
  const canEdit = article && (isAdmin || (isAgent && String(article.createdBy) === userId));
  const canDelete = canEdit;

  // Can submit for review: agent who is author (or admin) when status is Draft or null
  const canSubmitForReview = article && isAgent && (
    isAdmin || String(article.createdBy) === userId
  ) && (article.reviewStatus === 'Draft' || article.reviewStatus === null);

  // Can approve/reject: TeamLead+ when status is InReview
  const canReview = article && isTeamLead && article.reviewStatus === 'InReview';

  const loadComments = useCallback(async () => {
    if (!isAgent) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/kb/articles/${id}/comments`);
      if (res.ok) {
        const data = await res.json() as { comments: KbComment[] };
        setComments(data.comments ?? []);
      }
    } catch {
      console.error('Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  }, [id, isAgent]);

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

  useEffect(() => {
    if (article && isAgent) {
      void loadComments();
    }
  }, [article, isAgent, loadComments]);

  // Check if article expires within 30 days
  const isExpiringSoon = article?.expiresAt
    ? (() => {
        const expires = new Date(article.expiresAt);
        const now = new Date();
        const diffMs = expires.getTime() - now.getTime();
        return diffMs > 0 && diffMs <= 30 * 24 * 60 * 60 * 1000;
      })()
    : false;

  const isExpired = article?.expiresAt
    ? new Date(article.expiresAt) < new Date()
    : false;

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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/kb/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard/kb');
      } else {
        const data = await res.json() as { message?: string };
        alert(data.message ?? 'Failed to delete article.');
        setIsDeleting(false);
      }
    } catch {
      alert('Failed to delete article.');
      setIsDeleting(false);
    }
  };

  const handleReviewAction = async (action: 'submit' | 'approve' | 'reject') => {
    setIsReviewing(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/kb/articles/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const updated = await res.json() as Partial<KBArticle>;
        setArticle(prev => prev ? { ...prev, ...updated } : null);
      } else {
        const data = await res.json() as { message?: string };
        setReviewError(data.message ?? 'Review action failed.');
      }
    } catch {
      setReviewError('Review action failed.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsPostingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/kb/articles/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        const comment = await res.json() as KbComment;
        setComments(prev => [comment, ...prev]);
        setNewComment('');
      } else {
        const data = await res.json() as { message?: string };
        setCommentError(data.message ?? 'Failed to post comment.');
      }
    } catch {
      setCommentError('Failed to post comment.');
    } finally {
      setIsPostingComment(false);
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
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back link */}
      <Link href="/dashboard/kb" className="text-sm text-primary-600 hover:underline">
        Knowledge Base
      </Link>

      {/* Expiry warning */}
      {(isExpiringSoon || isExpired) && (
        <div className={`p-3 rounded-lg border text-sm ${isExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {isExpired
            ? `This article expired on ${new Date(article.expiresAt!).toLocaleDateString()} and may be out of date.`
            : `This article expires on ${new Date(article.expiresAt!).toLocaleDateString()} (within 30 days).`}
        </div>
      )}

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
              {/* Article type badge */}
              {article.articleType && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ARTICLE_TYPE_STYLES[article.articleType] ?? 'bg-gray-100 text-gray-600'}`}>
                  {article.articleType}
                </span>
              )}
              {/* Review status badge (agents only) */}
              {isAgent && article.reviewStatus && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${REVIEW_STATUS_STYLES[article.reviewStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {article.reviewStatus === 'InReview' ? 'In Review' : article.reviewStatus}
                </span>
              )}
              {isAgent && !article.reviewStatus && (
                article.isPublished
                  ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Published</span>
                  : <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Draft</span>
              )}
              {article.tags && article.tags.length > 0 && article.tags.map(tag => (
                <span key={tag.id} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-6 w-6 text-violet-600" />
              <h1 className="text-2xl font-semibold text-gray-900">{article.title}</h1>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
              {article.authorName && <span>By {article.authorName}</span>}
              <span>
                {article.isPublished && article.publishedAt
                  ? `Published ${new Date(article.publishedAt).toLocaleDateString()}`
                  : `Updated ${new Date(article.updatedAt).toLocaleDateString()}`}
              </span>
              <span>{article.viewCount} views</span>
              <span>{article.helpfulCount} found helpful</span>
              {article.reviewedAt && article.reviewerName && (
                <span>Reviewed by {article.reviewerName} on {new Date(article.reviewedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/kb/${id}/edit`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </Link>
              {canDelete && (
                <button
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review workflow actions */}
      {isAgent && (canSubmitForReview || canReview) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Review Workflow</p>
          {reviewError && (
            <p className="text-xs text-red-600 mb-2">{reviewError}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {canSubmitForReview && (
              <button
                onClick={() => void handleReviewAction('submit')}
                disabled={isReviewing}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isReviewing ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
            {canReview && (
              <>
                <button
                  onClick={() => void handleReviewAction('approve')}
                  disabled={isReviewing}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isReviewing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => void handleReviewAction('reject')}
                  disabled={isReviewing}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isReviewing ? 'Processing...' : 'Reject'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
            <HandThumbUpIcon className="h-4 w-4" /> Yes ({article.helpfulCount})
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
            <HandThumbDownIcon className="h-4 w-4" /> No ({article.notHelpfulCount})
          </button>
          {voted && (
            <span className="text-xs text-gray-500">Thanks for your feedback!</span>
          )}
        </div>
      </div>

      {/* Comments (Agent+ only) */}
      {isAgent && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">Agent Comments</h2>
            <span className="text-xs text-gray-400">(visible to agents only)</span>
          </div>

          {/* Post new comment */}
          <form onSubmit={e => void handlePostComment(e)} className="space-y-2">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add an agent comment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
            {commentError && (
              <p className="text-xs text-red-600">{commentError}</p>
            )}
            <button
              type="submit"
              disabled={isPostingComment || !newComment.trim()}
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isPostingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </form>

          {/* Comment list */}
          {commentsLoading ? (
            <p className="text-sm text-gray-400">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400">No comments yet.</p>
          ) : (
            <div className="space-y-3 divide-y divide-gray-100">
              {comments.map(comment => (
                <div key={comment.id} className="pt-3 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{comment.authorName ?? 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
