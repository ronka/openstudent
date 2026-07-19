import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundColor, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { ProgressProps } from './props';

/**
 * Degree-progress widget (systemSmall): completion % + credits + GPA.
 *
 * Serialized via the `'widget'` directive — see the note in `deadlines-widget.tsx`.
 * Self-contained: percentage/credits/GPA are pre-formatted in props.
 */
const ProgressWidget = (props: ProgressProps, environment: WidgetEnvironment) => {
  'widget';
  const isDark = environment.colorScheme === 'dark';
  const muted = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
  const good = isDark ? '#4ADE80' : '#15803D';

  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 })]}>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), muted]}>התקדמות בתואר</Text>
      <Spacer />
      <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundColor(good)]}>
        {props.degreePctLabel}
      </Text>
      <Text modifiers={[font({ size: 12 }), muted]}>{`${props.creditsLabel} נק״ז`}</Text>
      <Spacer />
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 13 }), muted]}>ממוצע</Text>
        <Spacer />
        <Text modifiers={[font({ size: 17, weight: 'semibold' })]}>{props.gpaLabel}</Text>
      </HStack>
    </VStack>
  );
};

export const progressWidget = createWidget<ProgressProps>('ProgressWidget', ProgressWidget);
