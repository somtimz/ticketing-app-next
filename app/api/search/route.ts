import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  tickets,
  serviceRequests,
  knowledgeBaseArticles,
  assets,
  problems,
  changes,
} from '@/lib/db/schema';
import { ilike, or, eq, and } from 'drizzle-orm';
import { requireAuth, handleAPIError } from '@/lib/api-error';
import { hasRole } from '@/lib/rbac';

/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Global full-text search across:
 *  - Tickets (INC-xxxx)          — all authenticated users (employees see only their own)
 *  - Service Requests (REQ-xxxx) — all authenticated users (employees see only their own)
 *  - KB Articles                 — all authenticated users (public + agent-only for Agent+)
 *  - Assets (AST-xxxx)           — Agent+ only
 *  - Problems (PRB-xxxx)         — Agent+ only
 *  - Changes (CHG-xxxx)          — Agent+ only
 *
 * Returns up to `limit` (default 10, max 30) results per entity type.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const userId = parseInt(session!.user.id, 10);
    const isAgent = hasRole(session, 'Agent');

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const rawLimit = parseInt(searchParams.get('limit') ?? '8', 10);
    const limit = Math.min(Math.max(rawLimit, 1), 30);

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const like = `%${q}%`;

    // ── Tickets ────────────────────────────────────────────────────────────────
    const ticketWhere = isAgent
      ? or(ilike(tickets.title, like), ilike(tickets.ticketNumber, like), ilike(tickets.description, like))
      : and(
          eq(tickets.createdBy, userId),
          or(ilike(tickets.title, like), ilike(tickets.ticketNumber, like))
        );

    const ticketRows = await db
      .select({
        id: tickets.id,
        number: tickets.ticketNumber,
        title: tickets.title,
        status: tickets.status,
        priority: tickets.priority,
      })
      .from(tickets)
      .where(ticketWhere)
      .limit(limit);

    // ── Service Requests ───────────────────────────────────────────────────────
    const srWhere = isAgent
      ? or(ilike(serviceRequests.title, like), ilike(serviceRequests.requestNumber, like), ilike(serviceRequests.description, like))
      : and(
          eq(serviceRequests.requesterId, userId),
          or(ilike(serviceRequests.title, like), ilike(serviceRequests.requestNumber, like))
        );

    const srRows = await db
      .select({
        id: serviceRequests.id,
        number: serviceRequests.requestNumber,
        title: serviceRequests.title,
        status: serviceRequests.status,
        category: serviceRequests.category,
      })
      .from(serviceRequests)
      .where(srWhere)
      .limit(limit);

    // ── KB Articles ────────────────────────────────────────────────────────────
    const kbWhere = isAgent
      ? or(ilike(knowledgeBaseArticles.title, like), ilike(knowledgeBaseArticles.content, like))
      : and(
          eq(knowledgeBaseArticles.isPublished, true),
          eq(knowledgeBaseArticles.isAgentOnly, false),
          or(ilike(knowledgeBaseArticles.title, like), ilike(knowledgeBaseArticles.content, like))
        );

    const kbRows = await db
      .select({
        id: knowledgeBaseArticles.id,
        title: knowledgeBaseArticles.title,
        isAgentOnly: knowledgeBaseArticles.isAgentOnly,
        isPublished: knowledgeBaseArticles.isPublished,
      })
      .from(knowledgeBaseArticles)
      .where(kbWhere)
      .limit(limit);

    // ── Agent-only entity types ────────────────────────────────────────────────
    let assetRows: { id: number; number: string; title: string; assetType: string; status: string }[] = [];
    let problemRows: { id: number; number: string; title: string; status: string }[] = [];
    let changeRows: { id: number; number: string; title: string; status: string; changeType: string }[] = [];

    if (isAgent) {
      const rawAssets = await db
        .select({
          id: assets.id,
          assetTag: assets.assetTag,
          name: assets.name,
          type: assets.type,
          status: assets.status,
        })
        .from(assets)
        .where(or(ilike(assets.name, like), ilike(assets.assetTag, like), ilike(assets.serialNumber, like)))
        .limit(limit);

      assetRows = rawAssets.map(a => ({
        id: a.id,
        number: a.assetTag,
        title: a.name,
        assetType: a.type,
        status: a.status,
      }));

      const rawProblems = await db
        .select({
          id: problems.id,
          problemNumber: problems.problemNumber,
          title: problems.title,
          status: problems.status,
        })
        .from(problems)
        .where(or(ilike(problems.title, like), ilike(problems.problemNumber, like), ilike(problems.description, like)))
        .limit(limit);

      problemRows = rawProblems.map(p => ({
        id: p.id,
        number: p.problemNumber,
        title: p.title,
        status: p.status,
      }));

      const rawChanges = await db
        .select({
          id: changes.id,
          changeNumber: changes.changeNumber,
          title: changes.title,
          status: changes.status,
          changeType: changes.changeType,
        })
        .from(changes)
        .where(or(ilike(changes.title, like), ilike(changes.changeNumber, like), ilike(changes.description, like)))
        .limit(limit);

      changeRows = rawChanges.map(c => ({
        id: c.id,
        number: c.changeNumber,
        title: c.title,
        status: c.status,
        changeType: c.changeType,
      }));
    }

    // ── Collate results ────────────────────────────────────────────────────────
    const results = [
      ...ticketRows.map(r => ({ type: 'ticket' as const, ...r })),
      ...srRows.map(r => ({ type: 'service_request' as const, ...r })),
      ...kbRows.map(r => ({ type: 'kb_article' as const, id: r.id, number: '', title: r.title, isAgentOnly: r.isAgentOnly, isPublished: r.isPublished })),
      ...assetRows.map(r => ({ type: 'asset' as const, ...r })),
      ...problemRows.map(r => ({ type: 'problem' as const, ...r })),
      ...changeRows.map(r => ({ type: 'change' as const, ...r })),
    ];

    return NextResponse.json({ results, query: q });
  } catch (err) {
    return handleAPIError(err);
  }
}
