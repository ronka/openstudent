import { findCatalogEntry } from '@/data/catalog-server';
import {
  getSharedDeadlines,
  hashInstallId,
  isOverWriteQuota,
  upsertVote,
} from '@/data/shared-deadlines-server';
import { isValidInstallId, validateDeadlineKey, validateDeadlineVote } from '@/data/shared-deadlines';

/**
 * Student-contributed ממ״ן/ממ״ח deadlines. Anonymous: writes carry a random on-device
 * install id (hashed before storage) used only to keep one vote per install per item.
 * Every failure is a JSON error — the app treats any non-OK response as "feature off".
 */

const isKnownCourse = (courseNumber: string) => findCatalogEntry(courseNumber) !== undefined;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = validateDeadlineKey(
    {
      courseNumber: url.searchParams.get('course'),
      year: Number(url.searchParams.get('year')),
      semester: url.searchParams.get('semester'),
    },
    { isKnownCourse }
  );
  if (!key.ok) return Response.json({ error: key.error }, { status: 400 });

  try {
    const deadlines = await getSharedDeadlines(key.value);
    return Response.json({ deadlines });
  } catch (error) {
    // Most likely the migration has not been applied yet.
    console.error('shared-deadlines GET failed', error);
    return Response.json({ error: 'Unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { installId } = body as Record<string, unknown>;
  if (!isValidInstallId(installId)) {
    return Response.json({ error: 'installId is invalid' }, { status: 400 });
  }
  const parsed = validateDeadlineVote(body, { isKnownCourse });
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const installHash = await hashInstallId(installId);
    if (await isOverWriteQuota(installHash)) {
      return Response.json({ error: 'Too many writes, try again later' }, { status: 429 });
    }
    await upsertVote(parsed.value, installHash);
    const { courseNumber, year, semester, type, taskNumber } = parsed.value;
    const deadlines = await getSharedDeadlines({ courseNumber, year, semester });
    const deadline = deadlines.find((d) => d.type === type && d.taskNumber === taskNumber);
    return Response.json({ ok: true, deadline }, { status: 200 });
  } catch (error) {
    console.error('shared-deadlines POST failed', error);
    return Response.json({ error: 'Unavailable' }, { status: 503 });
  }
}
