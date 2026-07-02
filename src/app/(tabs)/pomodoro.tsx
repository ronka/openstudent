import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const FOCUS_DURATION_SECONDS = 25 * 60;

const HOW_TO_STEPS = [
  'להחליט על המשימה שיש לעשות',
  'להגדיר את משך הפומודורו (בדרך כלל 25 דקות)',
  'לעבוד על המשימה בתוך פרק הזמן הקצוב',
  'לאחר כל צלצול לצאת להפסקה קצרה (3–5 דקות) ולחזור לשלב 2',
  'לאחר ארבעה סבבים, לצאת להפסקה ארוכה יותר (15–30 דקות) ולחזור לשלב 1',
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PomodoroScreen() {
  const screenPadding = useScreenPadding();
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          setIsComplete(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  function handleStart() {
    if (secondsLeft === 0) return;
    setIsComplete(false);
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    setIsComplete(false);
    setSecondsLeft(FOCUS_DURATION_SECONDS);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, screenPadding]}>
      <View style={styles.timerSection}>
        <ThemedText style={styles.timer}>{formatTime(secondsLeft)}</ThemedText>

        {isComplete && (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.center}>
            הפומודורו הסתיים — זמן להפסקה
          </ThemedText>
        )}

        <View style={styles.controls}>
          {isRunning ? (
            <Pressable onPress={handlePause}>
              <ThemedView type="text" style={styles.button}>
                <ThemedText themeColor="background" style={styles.buttonText}>
                  השהה
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : (
            <Pressable onPress={handleStart}>
              <ThemedView type="text" style={styles.button}>
                <ThemedText themeColor="background" style={styles.buttonText}>
                  {secondsLeft === FOCUS_DURATION_SECONDS ? 'התחל' : 'המשך'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}

          <Pressable onPress={handleReset}>
            <ThemedView type="backgroundElement" style={styles.button}>
              <ThemedText style={styles.buttonText}>איפוס</ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          מה זה שיטת פומודורו?
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.paragraph}>
          טכניקת פומודורו היא שיטה לניהול זמן שפותחה על ידי פרנצ&apos;סקו סירילו בסוף שנות ה-80. הטכניקה
          משתמשת בטיימר כדי לפצל את ביצוע העבודה לפרקי זמן בני 25 דקות, המופרדים בהפסקות קצרות.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          איך ללמוד עם זה?
        </ThemedText>
        {HOW_TO_STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <ThemedText type="smallBold">{index + 1}.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stepText}>
              {step}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  timerSection: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  timer: {
    fontSize: 64,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  center: {
    textAlign: rtlTextAlign.center,
  },
  controls: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.three,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  buttonText: {
    textAlign: rtlTextAlign.center,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textAlign: rtlTextAlign.start,
  },
  paragraph: {
    textAlign: rtlTextAlign.start,
  },
  stepRow: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.two,
  },
  stepText: {
    flex: 1,
    textAlign: rtlTextAlign.start,
  },
});
