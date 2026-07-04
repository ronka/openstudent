import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipField } from '@/components/form-fields';
import { FormSheet, SheetButton } from '@/components/form-sheet';
import { CourseCatalogList } from '@/components/course-catalog-list';
import { Spacing } from '@/constants/theme';
import { catalogEntryByNumber, type CourseCatalogEntry } from '@/data/catalog';
import { SEMESTERS } from '@/data/constants';
import { deriveCourseStatus, getCurrentSemester, getYearOptions } from '@/data/semester';
import { coursesCollection } from '@/data/store';
import type { Course, Semester } from '@/data/types';

export function CourseCatalogPicker({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after courses are created, with the new course ids/names (e.g. to launch Quick Tasks). */
  onAdded: (created: { id: string; name: string }[]) => void;
}) {
  const current = useMemo(() => getCurrentSemester(), []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [year, setYear] = useState(current.year);
  const [semester, setSemester] = useState<Semester>(current.term);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set());
    setYear(current.year);
    setSemester(current.term);
    // Only re-run when the sheet is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggle(entry: CourseCatalogEntry) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entry.courseNumber)) next.delete(entry.courseNumber);
      else next.add(entry.courseNumber);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    const now = Date.now();
    const created = Array.from(selected).map((courseNumber, index) => {
      const entry = catalogEntryByNumber(courseNumber)!;
      const course: Course = {
        id: `c-${now}-${index}`,
        name: entry.name,
        courseNumber: entry.courseNumber,
        faculty: entry.faculty,
        credits: entry.credits,
        type: entry.type,
        level: entry.level,
        status: deriveCourseStatus({ year, semester, grade: undefined }, current),
        year,
        semester,
      };
      coursesCollection.add(course);
      return { id: course.id, name: course.name };
    });
    onAdded(created);
  }

  return (
    <FormSheet visible={visible} onClose={onClose} title="הוספת קורסים">
      <View style={styles.body}>
        <CourseCatalogList selected={selected} onToggle={toggle} listStyle={styles.list} />

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
  list: {
    maxHeight: 320,
  },
});
