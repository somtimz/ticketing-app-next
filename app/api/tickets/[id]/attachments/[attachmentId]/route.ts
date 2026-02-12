import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { attachments, tickets } from '@/lib/db/schema';
import { requireAuth, handleAPIError } from '@/lib/api-error';
import { deleteAttachment } from '@/lib/storage';
import { eq } from 'drizzle-orm';

// DELETE /api/tickets/[id]/attachments/[attachmentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth();
    requireAuth(session);

    const { id, attachmentId } = await params;

    const attachment = await db.query.attachments.findFirst({
      where: eq(attachments.id, parseInt(attachmentId))
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'not_found', message: 'Attachment not found' },
        { status: 404 }
      );
    }

    const userRole = session!.user.role as string;
    if (
      attachment.uploadedBy !== parseInt(session!.user.id) &&
      !['Agent', 'TeamLead', 'Admin'].includes(userRole)
    ) {
      return NextResponse.json(
        { error: 'forbidden', message: 'You can only delete your own attachments' },
        { status: 403 }
      );
    }

    await deleteAttachment(attachment.fileUrl);
    await db.delete(attachments).where(eq(attachments.id, parseInt(attachmentId)));

    // Update ticket lastActivityAt
    await db
      .update(tickets)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(tickets.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}
