/**
 * Attachments API for tickets
 * Handles file uploads and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { attachments, tickets } from '@/lib/db/schema';
import { requireAuth } from '@/lib/api-error';
import { uploadAttachment, isValidFileType, isValidFileSize, MAX_FILE_SIZE } from '@/lib/storage';
import { eq } from 'drizzle-orm';
import { handleAPIError } from '@/lib/api-error';

// GET /api/tickets/[id]/attachments - List attachments for a ticket
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, parseInt(id))
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketAttachments = await db.query.attachments.findMany({
      where: eq(attachments.ticketId, parseInt(id)),
      with: {
        uploadedBy: {
          columns: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: (attachments, { asc }) => [asc(attachments.createdAt)]
    });

    return NextResponse.json({ attachments: ticketAttachments });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/tickets/[id]/attachments - Upload attachment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id } = await params;

    // Verify ticket exists
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, parseInt(id))
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Parse form data with files
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const commentId = formData.get('commentId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'validation_error', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    if (!isValidFileType(file.type)) {
      return NextResponse.json(
        {
          error: 'invalid_file_type',
          message: `File type ${file.type} is not allowed. Allowed types: ${Array.from(new Set([
            'Images (JPEG, PNG, GIF, WebP, SVG)',
            'Documents (PDF, TXT, CSV, JSON, XML)',
            'Archives (ZIP, RAR, 7Z)',
            'Office documents (DOC, DOCX, XLS, XLSX)'
          ])).join(', ')}`
        },
        { status: 400 }
      );
    }

    if (!isValidFileSize(file.size)) {
      return NextResponse.json(
        {
          error: 'file_too_large',
          message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        { status: 400 }
      );
    }

    // Upload file
    const { url } = await uploadAttachment(file, parseInt(id), parseInt(session!.user.id));

    // Create attachment record
    const [attachment] = await db.insert(attachments).values({
      ticketId: parseInt(id),
      commentId: commentId ? parseInt(commentId) : null,
      filename: file.name,
      fileUrl: url,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: parseInt(session!.user.id)
    }).returning();

    // Update ticket's lastActivityAt
    await db.update(tickets)
      .set({
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tickets.id, parseInt(id)));

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
