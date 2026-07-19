import { Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundColor, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
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

  if (props.empty) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 })]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), muted]}>המבחן הבא</Text>
        <Spacer />
        <Text modifiers={[font({ size: 15 }), muted]}>אין מבחנים קרובים</Text>
        <Spacer />
      </VStack>
    );
  }

  const accent = props.daysLeft <= 3 ? (isDark ? '#FF6467' : '#E7000B') : (isDark ? '#FBBF24' : '#B45309');

  return (
    <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 16 })]}>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), muted]}>המבחן הבא</Text>
      <Spacer />
      <Text modifiers={[font({ size: 28, weight: 'bold', design: 'rounded' }), foregroundColor(accent)]}>
        {props.daysLabel}
      </Text>
      <Spacer />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{props.courseName}</Text>
      <Text modifiers={[font({ size: 12 }), muted, lineLimit(1)]}>{props.title}</Text>
    </VStack>
  );
};

export const examWidget = createWidget<ExamProps>('ExamWidget', ExamWidget);
