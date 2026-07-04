import { SelectField, SelectFilterChip, type SelectSource } from '@/components/select-modal';
import { COURSE_CATALOG, type CourseCatalogEntry } from '@/data/catalog';

/** Maps the full course catalog into the generic `SelectModal` shape, keyed by course
 * number — so study-group discovery/submission works for any course, not just enrolled ones. */
const catalogSource: SelectSource<CourseCatalogEntry> = {
  items: COURSE_CATALOG,
  getKey: (entry) => entry.courseNumber,
  getLabel: (entry) => entry.name,
  getSublabel: (entry) => entry.courseNumber,
  matches: (entry, q) => entry.name.includes(q) || entry.courseNumber.includes(q),
  title: 'בחירת קורס',
  searchPlaceholder: 'חיפוש לפי שם או מספר קורס',
  emptyLabel: 'לא נמצאו קורסים',
};

/** Labeled form field for picking a catalog course (by course number). */
export function CatalogSelectField({
  label,
  selectedCourseNumber,
  onSelect,
  placeholder = 'בחרו קורס',
}: {
  label: string;
  selectedCourseNumber?: string;
  onSelect: (courseNumber: string) => void;
  placeholder?: string;
}) {
  return (
    <SelectField
      {...catalogSource}
      label={label}
      placeholder={placeholder}
      selectedKey={selectedCourseNumber}
      onSelect={onSelect}
    />
  );
}

/** Chip-style trigger for filter bars over the catalog. */
export function CatalogFilterChip({
  selectedCourseNumber,
  onChange,
  clearLabel,
}: {
  selectedCourseNumber: string | undefined;
  onChange: (courseNumber: string | undefined) => void;
  clearLabel: string;
}) {
  return (
    <SelectFilterChip
      {...catalogSource}
      selectedKey={selectedCourseNumber}
      onChange={onChange}
      clearLabel={clearLabel}
    />
  );
}
