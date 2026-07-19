import { eq, isNull } from 'drizzle-orm';

import { findCatalogEntry } from '@/data/catalog-server';

import { db } from './client';
import { studyGroupLinks } from './schema';

/** One-off backfill for rows created before `courseName` existed. New rows are
 * populated at write time by the `/api/study-groups` `POST` handler. */
async function backfillCourseNames() {
  const rows = await db.select().from(studyGroupLinks).where(isNull(studyGroupLinks.courseName));

  let updated = 0;
  let unresolved = 0;
  for (const row of rows) {
    const entry = findCatalogEntry(row.courseNumber);
    if (!entry) {
      unresolved++;
      continue;
    }
    await db.update(studyGroupLinks).set({ courseName: entry.name }).where(eq(studyGroupLinks.id, row.id));
    updated++;
  }

  console.log(`Backfilled ${updated} row(s); ${unresolved} row(s) left without a catalog match (courseNumber not in catalog.generated.json — display falls back to the number).`);
}

backfillCourseNames().then(() => process.exit(0));
