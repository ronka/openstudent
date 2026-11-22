import { date, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const studyGroupLinks = pgTable('study_group_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseNumber: text('course_number').notNull(),
  /** Denormalized at write time so the study-groups list never depends on live catalog
   * availability. Nullable: legacy rows predate this column and fall back to
   * `courseNumber` at render time until backfilled. */
  courseName: text('course_name'),
  year: integer('year').notNull(),
  semester: text('semester').notNull(),
  platform: text('platform').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('approved'),
  reportCount: integer('report_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const studyGroupReports = pgTable('study_group_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  linkId: uuid('link_id')
    .notNull()
    .references(() => studyGroupLinks.id),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Student-contributed ממ״ן/ממ״ח deadlines. One row is one anonymous install's current
 * vote for one item (course · year · semester · type · number). The first vote is the
 * contribution; confirming or correcting is an upsert on the unique key, so an install can
 * never count twice. The winning date per item is computed at read time (see
 * `buildSharedDeadlines`). `installHash` is a SHA-256 of the on-device random id — the raw
 * id never reaches the server's storage.
 */
export const sharedDeadlineVotes = pgTable(
  'shared_deadline_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseNumber: text('course_number').notNull(),
    year: integer('year').notNull(),
    semester: text('semester').notNull(),
    type: text('type').notNull(),
    taskNumber: integer('task_number').notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    installHash: text('install_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('shared_deadline_votes_item_install_unique').on(
      table.courseNumber,
      table.year,
      table.semester,
      table.type,
      table.taskNumber,
      table.installHash
    ),
    index('shared_deadline_votes_course_idx').on(table.courseNumber, table.year, table.semester),
    index('shared_deadline_votes_install_idx').on(table.installHash, table.updatedAt),
  ]
);
