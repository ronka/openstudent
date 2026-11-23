import { and, eq, gt, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { sharedDeadlineVotes } from '@/db/schema';

import { buildSharedDeadlines, type DeadlineKey, type DeadlineVoteInput, type SharedDeadline } from './shared-deadlines';

// Server-only (imports the database client). Lives outside `src/app/` for the same reason
// as `catalog-server.ts`: Expo Router would otherwise treat it as a route.

/** Writes allowed per install: rows created or changed in the last hour / day. */
export const HOURLY_WRITE_LIMIT = 30;
export const DAILY_WRITE_LIMIT = 100;

/** SHA-256 of the install id, so the raw id is never stored. */
export async function hashInstallId(installId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`openstudent:shared-deadlines:v1:${installId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isOverWriteQuota(installHash: string): Promise<boolean> {
  const countSince = async (ms: number) => {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sharedDeadlineVotes)
      .where(
        and(eq(sharedDeadlineVotes.installHash, installHash), gt(sharedDeadlineVotes.updatedAt, new Date(Date.now() - ms)))
      );
    return row?.count ?? 0;
  };
  if ((await countSince(60 * 60 * 1000)) >= HOURLY_WRITE_LIMIT) return true;
  return (await countSince(24 * 60 * 60 * 1000)) >= DAILY_WRITE_LIMIT;
}

/** Records (or changes) this install's vote. Re-sending the same date is a no-op. */
export async function upsertVote(vote: DeadlineVoteInput, installHash: string): Promise<void> {
  await db
    .insert(sharedDeadlineVotes)
    .values({ ...vote, installHash })
    .onConflictDoUpdate({
      target: [
        sharedDeadlineVotes.courseNumber,
        sharedDeadlineVotes.year,
        sharedDeadlineVotes.semester,
        sharedDeadlineVotes.type,
        sharedDeadlineVotes.taskNumber,
        sharedDeadlineVotes.installHash,
      ],
      set: { dueDate: vote.dueDate, updatedAt: new Date() },
      setWhere: sql`${sharedDeadlineVotes.dueDate} <> ${vote.dueDate}`,
    });
}

export async function getSharedDeadlines({ courseNumber, year, semester }: DeadlineKey): Promise<SharedDeadline[]> {
  const rows = await db
    .select()
    .from(sharedDeadlineVotes)
    .where(
      and(
        eq(sharedDeadlineVotes.courseNumber, courseNumber),
        eq(sharedDeadlineVotes.year, year),
        eq(sharedDeadlineVotes.semester, semester)
      )
    );
  return buildSharedDeadlines(
    rows.map((row) => ({
      type: row.type as SharedDeadline['type'],
      taskNumber: row.taskNumber,
      dueDate: row.dueDate,
      voterId: row.installHash,
      updatedAt: row.updatedAt.getTime(),
    }))
  );
}
