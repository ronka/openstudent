import type { CourseCatalogEntry } from '@/data/catalog';

export interface CatalogPage {
  rows: CourseCatalogEntry[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export async function fetchCatalogPage({
  q,
  faculty,
  page,
  pageSize,
}: {
  q?: string;
  faculty?: string;
  page: number;
  pageSize?: number;
}): Promise<CatalogPage> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (faculty) params.set('faculty', faculty);
  params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));

  const response = await fetch(`/api/catalog?${params.toString()}`);
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  return response.json();
}

/** Resolves a course number to its full catalog entry. */
export async function fetchCatalogEntry(courseNumber: string): Promise<CourseCatalogEntry | undefined> {
  const response = await fetch(`/api/catalog?ids=${encodeURIComponent(courseNumber)}`);
  if (!response.ok) throw new Error(`Catalog lookup failed: ${response.status}`);
  const data: { rows: CourseCatalogEntry[] } = await response.json();
  return data.rows[0];
}
