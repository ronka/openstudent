import type { Semester } from './types';

/**
 * Study-group chat links, classified by course · academic year · semester.
 * Backed by Neon Postgres via the `/api/study-groups` Expo API route.
 */

export type GroupPlatform = 'whatsapp' | 'telegram';
export type StudyGroupLinkStatus = 'approved' | 'pending';

export interface StudyGroupLink {
  id: string;
  /** Ties to COURSE_CATALOG via `catalogEntryByNumber`. */
  courseNumber: string;
  year: number;
  semester: Semester;
  platform: GroupPlatform;
  url: string;
  status: StudyGroupLinkStatus;
  reportCount: number;
  createdAt: string;
}

/** Hebrew label + emoji for each platform, for badges and hints. */
export const PLATFORM_LABELS: Record<GroupPlatform, string> = {
  whatsapp: 'וואטסאפ',
  telegram: 'טלגרם',
};

export const PLATFORM_EMOJI: Record<GroupPlatform, string> = {
  whatsapp: '💬',
  telegram: '✈️',
};

// WhatsApp group invites: https://chat.whatsapp.com/<code>
const WHATSAPP_RE = /^https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+\/?$/;
// Telegram invites: https://t.me/<name> or https://telegram.me/<name>,
// including joinchat/ and +invite forms.
const TELEGRAM_RE = /^https?:\/\/(t\.me|telegram\.me)\/(\+|joinchat\/)?[A-Za-z0-9_%-]+\/?$/;

/**
 * Validates a URL and infers its platform. Returns `null` when the URL is not a
 * recognized WhatsApp or Telegram group invite — so callers use it as the single
 * source of both validation and platform detection.
 */
export function detectPlatform(url: string): GroupPlatform | null {
  const trimmed = url.trim();
  if (WHATSAPP_RE.test(trimmed)) return 'whatsapp';
  if (TELEGRAM_RE.test(trimmed)) return 'telegram';
  return null;
}
