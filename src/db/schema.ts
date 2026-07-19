import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
