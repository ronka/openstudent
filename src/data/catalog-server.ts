import type { CourseCatalogEntry } from '@/data/catalog';

// Shared server-side catalog access for API routes. Deliberately outside `src/app/` —
// Expo Router treats every file under `src/app/` as a route regardless of naming
// (no underscore-prefix convention to opt out), so this must live elsewhere to avoid
// being exposed as a page. Isolation from the client bundle follows the import graph
// from the `+api.ts` route handlers that import this, not this file's location.
import catalogJson from '@/app/api/catalog.generated.json';

export const catalog = catalogJson as CourseCatalogEntry[];

export function findCatalogEntry(courseNumber: string): CourseCatalogEntry | undefined {
  return catalog.find((entry) => entry.courseNumber === courseNumber);
}
