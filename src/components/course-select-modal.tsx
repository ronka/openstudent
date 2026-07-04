import { SelectField, SelectFilterChip, SelectModal, type SelectSource } from '@/components/select-modal';
import type { Course } from '@/data/types';

/** Shared config that maps a `Course` list into the generic `SelectModal` shape:
 * search by name or course number, subtitle shows the course number. */
function courseSource(courses: Course[]): SelectSource<Course> {
  return {
    items: courses,
    getKey: (course) => course.id,
    getLabel: (course) => course.name,
    getSublabel: (course) => course.courseNumber,
    matches: (course, q) => course.name.includes(q) || (course.courseNumber?.includes(q) ?? false),
    title: 'בחירת קורס',
    searchPlaceholder: 'חיפוש לפי שם או מספר קורס',
    emptyLabel: 'לא נמצאו קורסים',
  };
}

/** Searchable single-select course picker over the user's enrolled courses. */
export function CourseSelectModal({
  visible,
  onClose,
  courses,
  selectedCourseId,
  onSelect,
  title,
  clearLabel,
  onClear,
}: {
  visible: boolean;
  onClose: () => void;
  courses: Course[];
  selectedCourseId?: string;
  onSelect: (courseId: string) => void;
  title?: string;
  clearLabel?: string;
  onClear?: () => void;
}) {
  return (
    <SelectModal
      {...courseSource(courses)}
      title={title ?? 'בחירת קורס'}
      visible={visible}
      onClose={onClose}
      selectedKey={selectedCourseId}
      onSelect={onSelect}
      clearLabel={clearLabel}
      onClear={onClear}
    />
  );
}

/** Labeled form field whose value opens the enrolled-course picker. */
export function CourseSelectField({
  label,
  courses,
  selectedCourseId,
  onSelect,
  placeholder = 'בחרו קורס',
}: {
  label: string;
  courses: Course[];
  selectedCourseId?: string;
  onSelect: (courseId: string) => void;
  placeholder?: string;
}) {
  return (
    <SelectField
      {...courseSource(courses)}
      label={label}
      placeholder={placeholder}
      selectedKey={selectedCourseId}
      onSelect={onSelect}
    />
  );
}

/** Chip-style trigger for filter bars over the user's enrolled courses. */
export function CourseFilterChip({
  courses,
  selectedCourseId,
  onChange,
  clearLabel,
}: {
  courses: Course[];
  selectedCourseId: string | undefined;
  onChange: (courseId: string | undefined) => void;
  clearLabel: string;
}) {
  return (
    <SelectFilterChip
      {...courseSource(courses)}
      selectedKey={selectedCourseId}
      onChange={onChange}
      clearLabel={clearLabel}
    />
  );
}
