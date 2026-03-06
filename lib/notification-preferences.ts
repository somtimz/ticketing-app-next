import { z } from 'zod';

export interface NotificationPreferences {
  statusChange: boolean;
  commentAdded: boolean;
  resolved: boolean;
}

export const notificationPrefsSchema = z.object({
  statusChange: z.boolean(),
  commentAdded: z.boolean(),
  resolved: z.boolean()
});

export function parseNotificationPreferences(
  raw: string | null,
  fallback: boolean
): NotificationPreferences {
  if (!raw) return { statusChange: fallback, commentAdded: fallback, resolved: fallback };
  try {
    return notificationPrefsSchema.parse(JSON.parse(raw));
  } catch {
    return { statusChange: fallback, commentAdded: fallback, resolved: fallback };
  }
}
