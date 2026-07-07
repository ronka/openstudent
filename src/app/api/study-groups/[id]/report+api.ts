import { eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { studyGroupLinks, studyGroupReports } from '@/db/schema';

export async function POST(request: Request, { id }: Record<string, string>) {
  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === 'string' ? body.reason : null;
  if (!reason) {
    return Response.json({ error: 'reason is required' }, { status: 400 });
  }

  const [link] = await db.select().from(studyGroupLinks).where(eq(studyGroupLinks.id, id));
  if (!link) {
    return Response.json({ error: 'Link not found' }, { status: 404 });
  }

  await db.insert(studyGroupReports).values({ linkId: id, reason });
  const [updated] = await db
    .update(studyGroupLinks)
    .set({ reportCount: sql`${studyGroupLinks.reportCount} + 1` })
    .where(eq(studyGroupLinks.id, id))
    .returning();

  return Response.json(updated, { status: 201 });
}
