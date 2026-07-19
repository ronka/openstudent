import { catalog } from '@/data/catalog-server';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const ids = url.searchParams.get('ids');

  if (ids !== null) {
    const wanted = new Set(
      ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
    const rows = catalog.filter((entry) => wanted.has(entry.courseNumber));
    return Response.json({ rows });
  }

  const q = (url.searchParams.get('q') ?? '').trim();
  const faculty = url.searchParams.get('faculty');
  const page = toPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, toPositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE));

  let items = catalog;
  if (q) items = items.filter((entry) => entry.name.includes(q) || entry.courseNumber.includes(q));
  if (faculty) items = items.filter((entry) => entry.faculty.includes(faculty));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const rows = items.slice(start, start + pageSize);

  return Response.json({ rows, page, pageSize, total, hasMore: start + pageSize < total });
}
