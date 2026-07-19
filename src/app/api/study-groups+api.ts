import { and, eq } from 'drizzle-orm';

import { findCatalogEntry } from '@/data/catalog-server';
import { db } from '@/db/client';
import { studyGroupLinks } from '@/db/schema';
import { detectPlatform } from '@/data/study-groups';
import type { Semester } from '@/data/types';

const SEMESTERS: Semester[] = ['א', 'ב', 'ג'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const course = url.searchParams.get('course');
  const year = url.searchParams.get('year');
  const semester = url.searchParams.get('semester');

  const conditions = [eq(studyGroupLinks.status, 'approved')];
  if (course) conditions.push(eq(studyGroupLinks.courseNumber, course));
  if (year) conditions.push(eq(studyGroupLinks.year, Number(year)));
  if (semester) conditions.push(eq(studyGroupLinks.semester, semester));

  const links = await db
    .select()
    .from(studyGroupLinks)
    .where(and(...conditions));

  return Response.json(links);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { courseNumber, year, semester, url } = body as Record<string, unknown>;

  if (typeof courseNumber !== 'string' || !courseNumber) {
    return Response.json({ error: 'courseNumber is required' }, { status: 400 });
  }
  if (typeof year !== 'number' || !Number.isInteger(year)) {
    return Response.json({ error: 'year must be an integer' }, { status: 400 });
  }
  if (typeof semester !== 'string' || !SEMESTERS.includes(semester as Semester)) {
    return Response.json({ error: 'semester must be one of א, ב, ג' }, { status: 400 });
  }
  if (typeof url !== 'string') {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return Response.json({ error: 'url must be a valid WhatsApp or Telegram invite link' }, { status: 400 });
  }

  const [created] = await db
    .insert(studyGroupLinks)
    .values({
      courseNumber,
      courseName: findCatalogEntry(courseNumber)?.name,
      year,
      semester,
      url: url.trim(),
      platform,
      status: 'approved',
    })
    .returning();

  return Response.json(created, { status: 201 });
}
