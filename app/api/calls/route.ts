/**
 * Phone call logging API
 * Allows agents to log inbound/outbound calls with ticket associations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calls, tickets, guestUsers, callers } from '@/lib/db/schema';
import { requireRole } from '@/lib/api-error';
import { eq, desc } from 'drizzle-orm';
import { handleAPIError } from '@/lib/api-error';

// Schema for logging a new call
const logCallSchema = z.object({
  ticketId: z.number().optional(),
  ticketNumber: z.string().optional(),
  callerId: z.number().optional(),
  guestUserId: z.number().optional(),
  // Guest caller info (for creating new guest user)
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestCompany: z.string().optional(),
  guestPhone: z.string().optional(),
  // Call details
  callDirection: z.enum(['inbound', 'outbound']),
  duration: z.number().min(0).int(), // seconds
  notes: z.string().min(1).max(5000),
  callOutcome: z.enum(['resolved', 'escalated', 'follow_up'])
});

// GET /api/calls - List calls (filtered by ticket if provided)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');

    let whereCondition;
    if (ticketId) {
      whereCondition = eq(calls.ticketId, parseInt(ticketId));
    }

    const callsList = await db.query.calls.findMany({
      where: ticketId ? eq(calls.ticketId, parseInt(ticketId)) : undefined,
      with: {
        agent: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        },
        caller: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        guestUser: true
      },
      orderBy: [desc(calls.createdAt)]
    });

    return NextResponse.json({ calls: callsList });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/calls - Log a new call
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, 'Agent');

    const body = await req.json();
    const validated = logCallSchema.parse(body);

    let ticketId = validated.ticketId;
    let guestUserId = validated.guestUserId;

    // Find ticket by number if provided
    if (!ticketId && validated.ticketNumber) {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.ticketNumber, validated.ticketNumber)
      });
      ticketId = ticket?.id;
    }

    // Handle guest user creation/lookup
    if (validated.guestName && validated.guestEmail && validated.guestCompany) {
      // Check if guest user already exists
      const existing = await db.query.guestUsers.findFirst({
        where: eq(guestUsers.email, validated.guestEmail)
      });

      if (existing) {
        guestUserId = existing.id;
        // Update existing guest user info if needed
        await db.update(guestUsers)
          .set({
            name: validated.guestName,
            company: validated.guestCompany,
            phone: validated.guestPhone || existing.phone,
            updatedAt: new Date()
          })
          .where(eq(guestUsers.id, existing.id));
      } else {
        // Create new guest user with current user as sponsor
        const [guest] = await db.insert(guestUsers).values({
          name: validated.guestName,
          email: validated.guestEmail,
          company: validated.guestCompany,
          phone: validated.guestPhone || null,
          sponsorId: parseInt(session.user.id),
          isActive: true
        }).returning();
        guestUserId = guest.id;
      }
    }

    // If we have guestUserId, ensure there's a caller entry or create one
    if (guestUserId && !validated.callerId) {
      const guestUser = await db.query.guestUsers.findFirst({
        where: eq(guestUsers.id, guestUserId)
      });

      if (guestUser) {
        // Check if caller entry exists for this guest user
        let caller = await db.query.callers.findFirst({
          where: eq(callers.guestUserId, guestUserId)
        });

        if (!caller) {
          // Create caller entry for guest user
          [caller] = await db.insert(callers).values({
            fullName: guestUser.name,
            email: guestUser.email,
            phone: guestUser.phone || null,
            guestUserId: guestUser.id,
            isGuest: true
          }).returning();
        }
        validated.callerId = caller.id;
      }
    }

    // Create call log
    const [call] = await db.insert(calls).values({
      ticketId: ticketId || null,
      callerId: validated.callerId || null,
      guestUserId: guestUserId || null,
      agentId: parseInt(session.user.id),
      callDirection: validated.callDirection,
      duration: validated.duration,
      notes: validated.notes,
      callOutcome: validated.callOutcome
    }).returning();

    // Update ticket's lastActivityAt if linked
    if (ticketId) {
      await db.update(tickets)
        .set({
          lastActivityAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tickets.id, ticketId));
    }

    return NextResponse.json({ call }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
