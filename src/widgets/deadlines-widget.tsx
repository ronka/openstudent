import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundColor, foregroundStyle, lineLimit, minimumScaleFactor, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DeadlinesProps } from './props';

/**
 * Upcoming deadlines widget (systemSmall + systemMedium).
 *
 * The `'widget'` directive makes babel serialize this function's *source* into a
 * layout string that WidgetKit re-evaluates natively. Consequences:
 *   - It must be self-contained: only `props`, `environment`, imported `@expo/ui`
 *     components/modifiers, and inline literals — no references to app-module helpers.
 *   - All data/labels are pre-computed in `props.ts`; this view only formats.
 *
 * Layout uses natural `leading` alignment: on the Hebrew (RTL) devices these users
 * run, the widget extension inherits RTL and mirrors automatically. (On an LTR-locale
 * device the Hebrew text left-aligns — acceptable for v1; flagged in WIDGETS_PLAN.md.)
 */
const DeadlinesWidget = (props: DeadlinesProps, environment: WidgetEnvironment) => {
  'widget';
  const isMedium = environment.widgetFamily === 'systemMedium';
  const isDark = environment.colorScheme === 'dark';
  const muted = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
  const danger = isDark ? '#FF6467' : '#E7000B';
  const warning = isDark ? '#FBBF24' : '#B45309';

  const items = (props.items ?? []).slice(0, isMedium ? 3 : 1);

  const title = (
    <Text modifiers={[font({ size: 13, weight: 'semibold' }), muted, lineLimit(1), minimumScaleFactor(0.7)]}>
      מטלות קרובות
    </Text>
  );

  if (items.length === 0) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 })]}>
        {title}
        <Spacer />
        <Text modifiers={[font({ size: 15 }), muted]}>אין מטלות פתוחות</Text>
        <Spacer />
      </VStack>
    );
  }

  // NOTE: children must be a *flat* list of element nodes. The widget jsx runtime does
  // not flatten nested arrays, and the native side (DynamicView.swift) does
  // `children.compactMap { $0 as? [String: Any] }` — so a nested array produced by
  // `items.map(...)` is silently dropped and the widget renders blank. We therefore
  // emit each row as an individual child (null entries are safely dropped by compactMap).
  const renderRow = (item: DeadlinesProps['items'][number], index: number) => {
    const urgent = item.daysLeft !== null && item.daysLeft <= 1;
    return (
      <VStack key={index} alignment="leading" spacing={2}>
        <HStack spacing={6}>
          <Text
            modifiers={[
              font({ size: isMedium ? 15 : 17, weight: 'semibold' }),
              lineLimit(1),
              minimumScaleFactor(0.8),
            ]}>
            {item.name}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 13, weight: 'medium' }),
              foregroundColor(urgent ? danger : warning),
              lineLimit(1),
            ]}>
            {item.daysLabel}
          </Text>
        </HStack>
        <Text modifiers={[font({ size: 12 }), muted, lineLimit(1)]}>{item.courseName}</Text>
      </VStack>
    );
  };

  return (
    <VStack alignment="leading" spacing={isMedium ? 10 : 6} modifiers={[padding({ all: 16 })]}>
      {title}
      {items[0] ? renderRow(items[0], 0) : null}
      {items[1] ? renderRow(items[1], 1) : null}
      {items[2] ? renderRow(items[2], 2) : null}
      <Spacer />
    </VStack>
  );
};

export const deadlinesWidget = createWidget<DeadlinesProps>('DeadlinesWidget', DeadlinesWidget);
