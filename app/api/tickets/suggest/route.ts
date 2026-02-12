/**
 * Similar tickets suggestions API
 * Provides suggestions based on similar resolved tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireAuth } from '@/lib/api-error';
import { findSimilarTickets, getSuggestedSolution } from '@/lib/suggestions';

// GET /api/tickets/similar - Find similar tickets
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '3');

    if (!title && !description) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Title or description is required' },
        { status: 400 }
      );
    }

    const similar = await findSimilarTickets(
      title || '',
      description || '',
      categoryId ? parseInt(categoryId) : undefined,
      limit
    );

    return NextResponse.json({ similar });
  } catch (error) {
    console.error('Error finding similar tickets:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to find similar tickets' },
      { status: 500 }
    );
  }
}

// GET /api/tickets/suggest-solution - Get suggested solution from similar tickets
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireAuth(session);

    const body = await req.json();
    const { title, description, categoryId } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Title and description are required' },
        { status: 400 }
      );
    }

    const suggestion = await getSuggestedSolution(
      title,
      description,
      categoryId
    );

    if (!suggestion) {
      return NextResponse.json({ suggestion: null });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Error getting suggested solution:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to get suggested solution' },
      { status: 500 }
    );
  }
}
