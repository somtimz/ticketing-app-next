/**
 * File storage utility for ticket attachments
 * Supports Vercel Blob Storage (production) and local filesystem (development)
 */

import { PutBlobResult } from '@vercel/blob';

export interface UploadResult {
  url: string;
  filename: string;
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/xml': '.xml',
    'text/xml': '.xml',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/x-7z-compressed': '.7z',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };
  return extensions[mimeType] || '';
}

/**
 * Upload attachment using Vercel Blob Storage
 */
export async function uploadAttachment(
  file: File,
  ticketId: number,
  uploadedBy: number
): Promise<UploadResult> {
  // Validate file
  if (!isValidFileType(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  if (!isValidFileSize(file.size)) {
    throw new Error(`File size ${file.size} exceeds maximum of ${MAX_FILE_SIZE} bytes`);
  }

  // Create unique filename
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${ticketId}/${timestamp}-${sanitizedFilename}`;

  // Check if Vercel Blob is available
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Use Vercel Blob Storage
    const { put } = await import('@vercel/blob');
    const blob: PutBlobResult = await put(filename, file, {
      access: 'public',
    });

    return {
      url: blob.url,
      filename: file.name
    };
  } else {
    // Fallback to local storage for development
    return uploadToLocal(file, ticketId, uploadedBy);
  }
}

/**
 * Upload to local filesystem (development fallback)
 */
async function uploadToLocal(
  file: File,
  ticketId: number,
  _uploadedBy: number
): Promise<UploadResult> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tickets', String(ticketId));
  await fs.mkdir(uploadsDir, { recursive: true });

  // Create unique filename
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}-${sanitizedFilename}`;
  const filepath = path.join(uploadsDir, filename);

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  // Return public URL
  const url = `/uploads/tickets/${ticketId}/${filename}`;

  return {
    url,
    filename: file.name
  };
}

/**
 * Delete attachment
 */
export async function deleteAttachment(fileUrl: string): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Vercel Blob handles deletion automatically based on token lifecycle
    // Or we can use the del function if needed
    const { del } = await import('@vercel/blob');
    try {
      // Extract filename from URL and delete
      await del(fileUrl);
    } catch (error) {
      console.warn('Failed to delete from blob storage:', error);
    }
  } else {
    // Delete from local filesystem
    const fs = await import('fs/promises');
    const path = await import('path');
    const filepath = path.join(process.cwd(), 'public', fileUrl);

    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.warn('Failed to delete local file:', error);
    }
  }
}

/**
 * Get file info from uploaded file
 */
export function getFileInfo(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified)
  };
}
