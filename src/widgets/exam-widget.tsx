import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundColor, foregroundStyle, lineLimit, minimumScaleFactor, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { ExamProps } from './props';

/**
 * Next-exam countdown widget (systemSmall).
 *
 * Serialized via the `'widget'` directive — see the note in `deadlines-widget.tsx`.
 * Self-contained: all values (including the Hebrew `daysLabel`) come pre-computed in props.
 */
const ExamWidget = (props: ExamProps, environment: WidgetEnvironment) => {
  'widget';
  const isDark = environment.colorScheme === 'dark';
  const muted = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

  const title = (
    <Text modifiers={[font({ size: 13, weight: 'semibold' }), muted, lineLimit(1), minimumScaleFactor(0.7)]}>
      המבחן הבא
    </Text>
  );

  if (props.empty) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 })]}>
        {title}
        <Spacer />
        <Text modifiers={[font({ size: 15 }), muted]}>אין מבחנים קרובים</Text>
        <Spacer />
      </VStack>
    );
  }

  const accent = props.daysLeft <= 3 ? (isDark ? '#FF6467' : '#E7000B') : (isDark ? '#FBBF24' : '#B45309');

  // A full sentence ("בעוד N ימים") at display size clips in a systemSmall widget, so
  // for 2+ days we show the number huge with a small "ימים" unit; the short one-word
  // labels (היום / מחר / באיחור) are shown as-is, scaled down only if they'd overflow.
  const countdown =
    props.daysLeft >= 2 ? (
      <HStack alignment="firstTextBaseline" spacing={4}>
        <Text modifiers={[font({ size: 48, weight: 'bold', design: 'rounded' }), foregroundColor(accent)]}>
          {`${props.daysLeft}`}
        </Text>
        <Text modifiers={[font({ size: 16, weight: 'semibold' }), muted]}>ימים</Text>
      </HStack>
    ) : (
      <Text
        modifiers={[
          font({ size: 34, weight: 'bold', design: 'rounded' }),
          foregroundColor(accent),
          lineLimit(1),
          minimumScaleFactor(0.6),
        ]}>
        {props.daysLabel}
      </Text>
    );

  return (
    <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 16 })]}>
      {title}
      <Spacer />
      {countdown}
      <Spacer />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.8)]}>
        {props.courseName}
      </Text>
      <Text modifiers={[font({ size: 12 }), muted, lineLimit(1)]}>{props.title}</Text>
    </VStack>
  );
};

export const examWidget = createWidget<ExamProps>('ExamWidget', ExamWidget);
