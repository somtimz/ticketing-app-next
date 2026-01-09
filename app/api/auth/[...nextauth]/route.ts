import { type NextRequest } from 'next/server';
import { handlers } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response> {
  return handlers.GET(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return handlers.POST(req);
}
