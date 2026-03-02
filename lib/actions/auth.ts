'use server';

import { signOut } from '@/lib/auth';

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
