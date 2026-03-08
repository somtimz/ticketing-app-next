import { db } from '@/lib/db';
import { knowledgeBaseArticles } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PortalKBArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const article = await db
    .select()
    .from(knowledgeBaseArticles)
    .where(
      and(
        eq(knowledgeBaseArticles.id, parseInt(id)),
        isNotNull(knowledgeBaseArticles.publishedAt),
        eq(knowledgeBaseArticles.isAgentOnly, false)
      )
    )
    .limit(1);

  if (!article.length) notFound();

  const a = article[0];

  return (
    <div className="max-w-2xl">
      <Link href="/portal/kb" className="text-xs text-violet-600 hover:underline mb-4 block">← Back to Knowledge Base</Link>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">{a.title}</h1>
      {a.publishedAt && (
        <p className="text-xs text-gray-400 mb-6">Published {new Date(a.publishedAt).toLocaleDateString()}</p>
      )}
      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{a.content}</div>
    </div>
  );
}
