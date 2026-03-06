import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketSatisfactionSurveys, tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const submitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional()
});

// GET /api/portal/survey/[token] - get survey info (no auth required — token is the secret)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const survey = await db.query.ticketSatisfactionSurveys.findFirst({
    where: eq(ticketSatisfactionSurveys.token, token)
  });

  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  // Get ticket info
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, survey.ticketId),
    columns: { ticketNumber: true, title: true }
  });

  return NextResponse.json({
    survey: {
      token: survey.token,
      submittedAt: survey.submittedAt,
      rating: survey.rating,
      ticket: ticket ?? null
    }
  });
}

// POST /api/portal/survey/[token] - submit survey response
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const survey = await db.query.ticketSatisfactionSurveys.findFirst({
    where: eq(ticketSatisfactionSurveys.token, token)
  });

  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  if (survey.submittedAt) return NextResponse.json({ error: 'Survey already submitted' }, { status: 409 });

  try {
    const body = await req.json();
    const data = submitSchema.parse(body);

    const [updated] = await db
      .update(ticketSatisfactionSurveys)
      .set({
        rating: data.rating,
        feedback: data.feedback ?? null,
        submittedAt: new Date()
      })
      .where(eq(ticketSatisfactionSurveys.token, token))
      .returning();

    return NextResponse.json({ survey: updated });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
