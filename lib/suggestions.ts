/**
 * Similar ticket suggestions
 * Finds similar resolved tickets based on title, description, and category
 */

import { db } from './db';
import { tickets, categories, users } from './db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';

export interface SimilarTicket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  resolution: string | null;
  categoryId: number | null;
  categoryName: string | null;
  priority: string;
  status: string;
  resolvedAt: Date | null;
  similarity: number;
}

/**
 * Extract meaningful keywords from text
 * Removes common words and short terms
 */
function extractKeywords(text: string): string[] {
  const stopWords = [
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why',
    'how', 'get', 'got', 'getting', 'does', 'doing', 'did', 'not'
  ];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));

  return [...new Set(words)]; // Remove duplicates
}

/**
 * Calculate similarity score between two text strings
 * Returns a score between 0 and 100
 */
function calculateSimilarity(
  title1: string,
  description1: string,
  title2: string,
  description2: string
): number {
  const keywords1 = extractKeywords(`${title1} ${description1}`);
  const keywords2 = extractKeywords(`${title2} ${description2}`);

  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0;
  }

  // Count matching keywords
  let matches = 0;
  for (const keyword of keywords1) {
    if (keywords2.includes(keyword)) {
      matches++;
    }
  }

  // Jaccard similarity coefficient
  const union = new Set([...keywords1, ...keywords2]).size;
  const intersection = new Set(keywords1.filter(k => keywords2.includes(k))).size;

  const keywordSimilarity = union > 0 ? (intersection / union) * 100 : 0;

  // Title exact match bonus
  let titleBonus = 0;
  const title1Lower = title1.toLowerCase();
  const title2Lower = title2.toLowerCase();
  if (title1Lower === title2Lower) {
    titleBonus = 50;
  } else if (title1Lower.includes(title2Lower) || title2Lower.includes(title1Lower)) {
    titleBonus = 25;
  }

  return Math.min(100, Math.round(keywordSimilarity * 0.7 + titleBonus));
}

/**
 * Find similar resolved tickets
 * @param title - Ticket title
 * @param description - Ticket description
 * @param categoryId - Optional category filter
 * @param limit - Maximum number of results (default: 3)
 */
export async function findSimilarTickets(
  title: string,
  description: string,
  categoryId?: number,
  limit: number = 3
): Promise<SimilarTicket[]> {
  const keywords = extractKeywords(`${title} ${description}`);

  if (keywords.length === 0) {
    return [];
  }

  // Build search conditions for each keyword
  const searchConditions = keywords.flatMap(keyword => [
    ilike(tickets.title, `%${keyword}%`),
    ilike(tickets.description, `%${keyword}%`)
  ]);

  // Build where conditions
  const whereConditions = [
    eq(tickets.status, 'Resolved'),
    ...(categoryId ? [eq(tickets.categoryId, categoryId)] : []),
    ...(searchConditions.length > 0 ? [or(...searchConditions)] : [])
  ];

  // Query for similar resolved tickets
  const results = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      resolution: tickets.resolution,
      categoryId: tickets.categoryId,
      categoryName: categories.name,
      priority: tickets.priority,
      status: tickets.status,
      resolvedAt: tickets.resolvedAt
    })
    .from(tickets)
    .leftJoin(categories, eq(tickets.categoryId, categories.id))
    .where(and(...whereConditions))
    .orderBy(desc(tickets.resolvedAt))
    .limit(limit * 3); // Get more candidates, then filter by similarity

  // Calculate similarity scores and filter
  const scored = results
    .map(ticket => ({
      ...ticket,
      similarity: calculateSimilarity(title, description, ticket.title, ticket.description)
    }))
    .filter(ticket => ticket.similarity > 20) // Only return tickets with >20% similarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

/**
 * Get suggested solution from similar tickets
 * Returns the highest-rated similar ticket's resolution
 */
export async function getSuggestedSolution(
  title: string,
  description: string,
  categoryId?: number
): Promise<SimilarTicket | null> {
  const similar = await findSimilarTickets(title, description, categoryId, 1);

  if (similar.length === 0) {
    return null;
  }

  const bestMatch = similar[0];

  // Only suggest if there's a resolution text
  if (!bestMatch.resolution || bestMatch.resolution.trim().length === 0) {
    return null;
  }

  return bestMatch;
}

/**
 * Find recurring issues (same title/description pattern appearing multiple times)
 */
export async function findRecurringIssues(
  daysBack: number = 30,
  minOccurrences: number = 3
): Promise<Array<{
  pattern: string;
  count: number;
  tickets: Array<{
    id: number;
    ticketNumber: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
}>> {
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const recentTickets = await db.query.tickets.findMany({
    where: sql`${tickets.createdAt} >= ${cutoffDate}`,
    columns: {
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      createdAt: tickets.createdAt
    },
    orderBy: [desc(tickets.createdAt)]
  }) as any[];

  // Extract keywords from all tickets and count occurrences
  const keywordCounts = new Map<string, {
    count: number;
    tickets: typeof recentTickets;
  }>();

  for (const ticket of recentTickets) {
    const keywords = extractKeywords(`${ticket.title} ${ticket.description}`);

    for (const keyword of keywords) {
      if (!keywordCounts.has(keyword)) {
        keywordCounts.set(keyword, {
          count: 0,
          tickets: []
        });
      }

      const entry = keywordCounts.get(keyword)!;
      entry.count++;
      entry.tickets.push(ticket);
    }
  }

  // Filter by minimum occurrences and sort by count
  const recurring = Array.from(keywordCounts.entries())
    .filter(([_, data]) => data.count >= minOccurrences)
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      tickets: data.tickets.slice(0, 5) // Limit to 5 example tickets
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return recurring;
}
