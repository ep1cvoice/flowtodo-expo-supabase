import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/** Matches MonthGrid inline weekday: paddingVertical 4 + lineHeight 14. */
const INLINE_WEEKDAY_HEIGHT = 22;

function expandSpring(velocity = 0) {
  'worklet';
  return {
    damping: 22,
    stiffness: 260,
    mass: 0.65,
    overshootClamping: true,
    velocity,
  };
}

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function monthFrameHeight(rowHeight: number, weekCount: number, expanded: number) {
  'worklet';
  const rows = 1 + (weekCount - 1) * expanded;
  return INLINE_WEEKDAY_HEIGHT + rowHeight * rows;
}

/**
 * Drag-to-expand behaviour for the calendar month frame: collapsed shows a single
 * week, expanded shows the full month. Owns the pan gesture, shared values and the
 * animated frame height.
 */
export function useCalendarExpandGesture(pageWidth: number, weekCount: number) {
  const panRef = useRef<GestureType | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const expandedSv = useSharedValue(0);
  const expandedTarget = useSharedValue(0);
  const dragOrigin = useSharedValue(0);
  const panActivated = useSharedValue(false);
  const rowHeightSv = useSharedValue(0);
  const weekCountSv = useSharedValue(weekCount);

  useLayoutEffect(() => {
    rowHeightSv.value = pageWidth > 0 ? pageWidth / 7 : 0;
    weekCountSv.value = weekCount;
  }, [weekCount, pageWidth, rowHeightSv, weekCountSv]);

  const frameStyle = useAnimatedStyle(() => ({
    height: monthFrameHeight(rowHeightSv.value, weekCountSv.value, expandedSv.value),
  }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withRef(panRef)
        .activeOffsetY([-10, 10])
        .failOffsetX([-16, 16])
        .onBegin(() => {
          dragOrigin.value = expandedSv.value;
          panActivated.value = false;
        })
        .onStart(() => {
          panActivated.value = true;
        })
        .onUpdate((event) => {
          const range = Math.max(rowHeightSv.value * (weekCountSv.value - 1), 1);
          expandedSv.value = clamp01(dragOrigin.value + event.translationY / range);
        })
        .onEnd((event, success) => {
          if (!success) return;
          const range = Math.max(rowHeightSv.value * (weekCountSv.value - 1), 1);
          const open = expandedSv.value + (event.velocityY / range) * 0.12 > 0.5;
          expandedTarget.value = open ? 1 : 0;
          expandedSv.value = withSpring(open ? 1 : 0, expandSpring(event.velocityY / range));
          runOnJS(setExpanded)(open);
        })
        .onFinalize((_event, success) => {
          if (success || !panActivated.value) return;
          panActivated.value = false;
          const open = expandedTarget.value > 0.5;
          expandedSv.value = withSpring(open ? 1 : 0, expandSpring());
          runOnJS(setExpanded)(open);
        }),
    [dragOrigin, expandedSv, expandedTarget, panActivated, rowHeightSv, weekCountSv]
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((open) => {
      const next = !open;
      expandedTarget.value = next ? 1 : 0;
      expandedSv.value = withSpring(next ? 1 : 0, expandSpring());
      return next;
    });
  }, [expandedSv, expandedTarget]);

  return { pan, panRef, expanded, expandedSv, rowHeightSv, frameStyle, toggleExpanded };
}
