import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useResponsiveListHeight } from '@/components/async-list-area';
import { CourseCatalogList } from '@/components/course-catalog-list';
import { ChipField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { Spacing } from '@/constants/theme';
import type { CourseCatalogEntry } from '@/data/catalog';
import { SEMESTERS } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester, getYearOptions } from '@/data/semester';
import { coursesCollection } from '@/data/store';
import type { Course, Semester } from '@/data/types';
import { posthog } from '@/utils/analytics';

export function CourseCatalogPicker({
  visible,
  onClose,
  onAdded,
  source = 'courses_list',
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after courses are created, with the new course ids/names (e.g. to launch Quick Tasks). */
  onAdded: (created: { id: string; name: string }[]) => void;
  /** Entry point this picker was opened from, tagged onto `course_created` events. */
  source?: 'courses_list' | 'plan';
}) {
  const current = useMemo(() => getCurrentSemester(), []);
  const listHeight = useResponsiveListHeight();

  // Capture-at-selection: the tapped search-result row *is* the entry, so it's stored
  // directly instead of re-resolving by number later.
  const [selected, setSelected] = useState<Map<string, CourseCatalogEntry>>(new Map());
  const selectedCourseNumbers = useMemo(() => new Set(selected.keys()), [selected]);
  const [year, setYear] = useState(current.year);
  const [semester, setSemester] = useState<Semester>(current.term);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Map());
    setYear(current.year);
    setSemester(current.term);
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggle(entry: CourseCatalogEntry) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(entry.courseNumber)) next.delete(entry.courseNumber);
      else next.set(entry.courseNumber, entry);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    const now = Date.now();
    const created = Array.from(selected.values()).map((entry, index) => {
      const course: Course = {
        id: `c-${now}-${index}`,
        name: entry.name,
        courseNumber: entry.courseNumber,
        faculty: entry.faculty[0],
        credits: entry.credits,
        type: entry.type,
        level: entry.level,
        status: deriveCourseStatus({ year, semester, grade: undefined }, current),
        year,
        semester,
      };
      coursesCollection.add(course);
      posthog.capture('course_created', { course_number: course.courseNumber ?? null, source });
      return { id: course.id, name: course.name };
    });
    onAdded(created);
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title="הוספת קורסים">
      <View style={styles.body}>
        <CourseCatalogList selected={selectedCourseNumbers} onToggle={toggle} listStyle={{ height: listHeight }} />

        <ChipField
          label="סמסטר"
          options={SEMESTERS}
          getLabel={(option) => option}
          isSelected={(option) => semester === option}
          onSelect={setSemester}
        />
        <ChipField
          label="שנה"
          scroll
          reverse
          options={YEAR_OPTIONS}
          getLabel={String}
          isSelected={(option) => year === option}
          onSelect={setYear}
        />

        <SheetButton
          label={selected.size > 0 ? `הוספת ${selected.size} קורסים` : 'בחרו קורסים להוספה'}
          onPress={handleAdd}
          disabled={selected.size === 0}
        />
      </View>
    </FormSheet>
  );
}

const YEAR_OPTIONS = getYearOptions();

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
});
