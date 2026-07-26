import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import {
  FOCUS_DURATION_SECONDS,
  getSecondsLeft,
  pauseTimer,
  resetTimer,
  startTimer,
  syncTimer,
  useSecondsLeft,
  useTimerState,
  type TimerStatus,
} from '@/data/pomodoro-timer';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { posthog } from '@/utils/analytics';
import { rtlFlexDirection, rtlTextAlign } from '@/utils/rtl';

const KEEP_AWAKE_TAG = 'pomodoro';

const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: 'מוכנים לסבב של 25 דקות?',
  running: 'בריכוז מלא 🎯',
  paused: 'מושהה — לוקחים נשימה',
  complete: 'כל הכבוד! זמן להפסקה 🎉',
};

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
  const timer = useTimerState();
  const isRunning = timer.status === 'running';
  const isComplete = timer.status === 'complete';

  // The timer is wall-clock based (see @/data/pomodoro-timer); this reactive read owns
  // the display refresh and flips the store to `complete` at zero. It must NOT be
  // replaced by a render-time `getSecondsLeft()` call — that read has no reactive
  // dependency, so React Compiler memoizes the JSX around it and the clock freezes.
  const secondsLeft = useSecondsLeft();

  // Resync on foreground so a session that finished while backgrounded is detected at once.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncTimer();
    });
    return () => sub.remove();
  }, []);

  // Keep the screen on while the timer is counting down, so a focus session
  // isn't interrupted by the device auto-locking.
  useEffect(() => {
    if (!isRunning) return;

    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [isRunning]);

  function handleStart() {
    startTimer();
    posthog.capture('pomodoro_started');
  }

  function handlePause() {
    posthog.capture('pomodoro_paused', { seconds_left: getSecondsLeft() });
    pauseTimer();
  }

  function handleReset() {
    resetTimer();
    posthog.capture('pomodoro_reset');
  }

  const progress = isComplete ? 1 : 1 - secondsLeft / FOCUS_DURATION_SECONDS;
  const showReset = timer.status !== 'idle';
  const primaryLabel = isRunning ? 'השהה' : isComplete ? 'סבב חדש' : timer.status === 'paused' ? 'המשך' : 'התחל';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, screenPadding]}>
        <View>
          <ThemedText type="subtitle" style={styles.headline}>
            פומודורו 🍅
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
            טיימר להתמקדות בלימודים — סבבים של 25 דקות
          </ThemedText>
        </View>

        <View style={styles.timerSection}>
          <ThemedView type={isComplete ? 'accentSoft' : 'backgroundElement'} style={styles.dial}>
            <ThemedText style={styles.timer}>{formatTime(secondsLeft)}</ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.statusLabel}>
              {STATUS_LABELS[timer.status]}
            </ThemedText>
          </ThemedView>

          <View style={styles.progress}>
            <ProgressBar value={progress} height={Spacing.one} />
          </View>

          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              onPress={isRunning ? handlePause : handleStart}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="text" style={styles.primaryButton}>
                <ThemedText themeColor="background" style={styles.buttonText}>
                  {primaryLabel}
                </ThemedText>
              </ThemedView>
            </Pressable>

            {showReset && (
              <Pressable
                accessibilityRole="button"
                onPress={handleReset}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.secondaryButton}>
                  <ThemedText style={styles.buttonText}>איפוס</ThemedText>
                </ThemedView>
              </Pressable>
            )}
          </View>
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            מה זה שיטת פומודורו?
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.paragraph}>
            טכניקת פומודורו היא שיטה לניהול זמן שפותחה על ידי פרנצ&apos;סקו סירילו בסוף שנות ה-80. הטכניקה
            משתמשת בטיימר כדי לפצל את ביצוע העבודה לפרקי זמן בני 25 דקות, המופרדים בהפסקות קצרות.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            איך ללמוד עם זה?
          </ThemedText>
          {HOW_TO_STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <ThemedView type="accentSoft" style={styles.stepBadge}>
                <ThemedText type="smallBold" themeColor="accent">
                  {index + 1}
                </ThemedText>
              </ThemedView>
              <ThemedText type="small" themeColor="textSecondary" style={styles.stepText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const DIAL_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  headline: {
    textAlign: rtlTextAlign.start,
  },
  tagline: {
    textAlign: rtlTextAlign.start,
  },
  timerSection: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  timer: {
    fontSize: 56,
    lineHeight: 68,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusLabel: {
    textAlign: rtlTextAlign.center,
  },
  progress: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.five,
  },
  controls: {
    flexDirection: rtlFlexDirection.row,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryButton: {
    minWidth: 140,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  buttonText: {
    textAlign: rtlTextAlign.center,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepBadge: {
    width: Spacing.four,
    height: Spacing.four,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    textAlign: rtlTextAlign.start,
  },
});
