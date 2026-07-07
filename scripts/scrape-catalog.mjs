#!/usr/bin/env node
/**
 * Scrapes the Open University Computer Science department (307) course catalog and
 * regenerates the COURSE_CATALOG array in src/data/catalog.ts.
 *
 * The endpoint is paginated; we increment `page` until it returns an empty array.
 *
 * Run with: npm run scrape:catalog
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, '../src/data/catalog.ts');

const API =
  'https://academic.openu.ac.il/_layouts/15/OpenU_WWW/Handlers/GetCoursesBySiteCodeHandler.ashx';
const PARAMS = {
  sitecode: '307',
  sitetype: '1',
  subject: '',
  level: '',
  semesterfrom: '-1',
  semesterto: '-1',
  marchivdaat: '',
  freeText: '',
  departmentcode: '307',
};

function buildUrl(page) {
  const url = new URL(API);
  url.searchParams.set('page', String(page));
  for (const [key, value] of Object.entries(PARAMS)) url.searchParams.set(key, value);
  return url.toString();
}

async function fetchAllCourses() {
  const rows = [];
  for (let page = 1; ; page++) {
    const res = await fetch(buildUrl(page));
    if (!res.ok) throw new Error(`Page ${page} request failed: ${res.status} ${res.statusText}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    process.stdout.write(`\rFetched page ${page} — ${rows.length} courses so far`);
  }
  process.stdout.write('\n');
  return rows;
}

// --- Field mapping ---------------------------------------------------------

/** Strip leading zeros so '04101' matches the existing '4101' style. */
function normalizeCourseNumber(courseIDField) {
  const stripped = String(courseIDField ?? '').replace(/^0+/, '');
  return stripped || '0';
}

/** Remove RTL/LTR control marks and surrounding whitespace from a course name. */
function cleanName(courseNameField) {
  return String(courseNameField ?? '')
    .replace(/[‎‏‪-‮]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Faculty is constrained to the two the app models; prefer CS, then Math. */
function mapFaculty(row) {
  const subjects = (row.subjectsField ?? []).map((s) => s.teurField);
  if (subjects.includes('מדעי המחשב')) return 'מדעי המחשב';
  if (subjects.includes('מתמטיקה')) return 'מתמטיקה';
  return undefined;
}

function mapLevel(levelField) {
  if (!levelField) return undefined;
  if (levelField.includes('תואר שני') || levelField.includes('מתקדם')) return 'מ';
  if (levelField.includes('רגיל')) return 'ר';
  return undefined;
}

function isSeminar(row) {
  if (row.seminarField === 'כ') return true;
  const name = cleanName(row.courseNameField);
  return name.startsWith('סמינר') || name.startsWith('סדנה');
}

function toEntry(row) {
  const credits = row.creditsField != null ? Number(row.creditsField) : NaN;
  return {
    courseNumber: normalizeCourseNumber(row.courseIDField),
    name: cleanName(row.courseNameField),
    faculty: mapFaculty(row),
    credits: Number.isFinite(credits) ? credits : undefined,
    type: isSeminar(row) ? 'סמינר' : 'בחירה',
    level: mapLevel(row.levelField),
  };
}

// --- Serialization ---------------------------------------------------------

function quote(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function serializeEntry(entry) {
  const parts = [`courseNumber: ${quote(entry.courseNumber)}`, `name: ${quote(entry.name)}`];
  if (entry.faculty) parts.push(`faculty: ${quote(entry.faculty)}`);
  if (entry.credits != null) parts.push(`credits: ${entry.credits}`);
  parts.push(`type: ${quote(entry.type)}`);
  if (entry.level) parts.push(`level: ${quote(entry.level)}`);
  return `  { ${parts.join(', ')} },`;
}

async function main() {
  const rows = await fetchAllCourses();

  const seen = new Set();
  const entries = [];
  for (const row of rows) {
    const entry = toEntry(row);
    if (seen.has(entry.courseNumber)) continue;
    seen.add(entry.courseNumber);
    entries.push(entry);
  }

  const body = entries.map(serializeEntry).join('\n');
  const replacement = `export const COURSE_CATALOG: CourseCatalogEntry[] = [\n${body}\n];`;

  const source = await readFile(CATALOG_PATH, 'utf8');
  const arrayRegex = /export const COURSE_CATALOG: CourseCatalogEntry\[\] = \[[\s\S]*?\n\];/;
  if (!arrayRegex.test(source)) {
    throw new Error('Could not locate the COURSE_CATALOG array in src/data/catalog.ts');
  }

  await writeFile(CATALOG_PATH, source.replace(arrayRegex, replacement));
  console.log(`Wrote ${entries.length} courses to ${CATALOG_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
