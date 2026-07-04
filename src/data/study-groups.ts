import type { Semester } from './types';

/**
 * Study-group chat links, classified by course · academic year · semester.
 * MVP: this list is mocked (no persistence) and submissions are only logged.
 */

export type GroupPlatform = 'whatsapp' | 'telegram';

export interface StudyGroupLink {
  id: string;
  /** Ties to COURSE_CATALOG via `catalogEntryByNumber`. */
  courseNumber: string;
  year: number;
  semester: Semester;
  platform: GroupPlatform;
  url: string;
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

// Mocked links across a handful of real catalog course numbers, spanning both
// platforms and a couple of year/semester combinations.
export const STUDY_GROUP_LINKS: StudyGroupLink[] = [
  {
    id: 'sg-1',
    courseNumber: '20441',
    year: 2025,
    semester: 'א',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/JavaIntro2025A',
  },
  {
    id: 'sg-2',
    courseNumber: '20441',
    year: 2025,
    semester: 'א',
    platform: 'telegram',
    url: 'https://t.me/joinchat/JavaIntro2025A',
  },
  {
    id: 'sg-3',
    courseNumber: '20407',
    year: 2025,
    semester: 'ב',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/DataStructures2025B',
  },
  {
    id: 'sg-4',
    courseNumber: '20417',
    year: 2025,
    semester: 'ב',
    platform: 'telegram',
    url: 'https://t.me/algorithms2025b',
  },
  {
    id: 'sg-5',
    courseNumber: '20594',
    year: 2026,
    semester: 'א',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/OperatingSystems2026A',
  },
  {
    id: 'sg-6',
    courseNumber: '20474',
    year: 2025,
    semester: 'א',
    platform: 'telegram',
    url: 'https://t.me/+calculus1_2025a',
  },
  {
    id: 'sg-7',
    courseNumber: '20109',
    year: 2025,
    semester: 'ג',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/LinearAlgebra1Summer',
  },
  {
    id: 'sg-8',
    courseNumber: '20417',
    year: 2026,
    semester: 'א',
    platform: 'whatsapp',
    url: 'https://chat.whatsapp.com/Algorithms2026A',
  },
];

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
