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
    rowHeightSv.set(pageWidth > 0 ? pageWidth / 7 : 0);
    weekCountSv.set(weekCount);
  }, [weekCount, pageWidth, rowHeightSv, weekCountSv]);

  const frameStyle = useAnimatedStyle(() => ({
    height: monthFrameHeight(rowHeightSv.get(), weekCountSv.get(), expandedSv.get()),
  }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Only hands the ref object to the gesture handler; `.current` is not read here.
        // eslint-disable-next-line react-hooks/refs
        .withRef(panRef)
        .activeOffsetY([-10, 10])
        .failOffsetX([-16, 16])
        .onBegin(() => {
          dragOrigin.set(expandedSv.get());
          panActivated.set(false);
        })
        .onStart(() => {
          panActivated.set(true);
        })
        .onUpdate((event) => {
          const range = Math.max(rowHeightSv.get() * (weekCountSv.get() - 1), 1);
          expandedSv.set(clamp01(dragOrigin.get() + event.translationY / range));
        })
        .onEnd((event, success) => {
          if (!success) return;
          const range = Math.max(rowHeightSv.get() * (weekCountSv.get() - 1), 1);
          const open = expandedSv.get() + (event.velocityY / range) * 0.12 > 0.5;
          expandedTarget.set(open ? 1 : 0);
          expandedSv.set(withSpring(open ? 1 : 0, expandSpring(event.velocityY / range)));
          runOnJS(setExpanded)(open);
        })
        .onFinalize((_event, success) => {
          if (success || !panActivated.get()) return;
          panActivated.set(false);
          const open = expandedTarget.get() > 0.5;
          expandedSv.set(withSpring(open ? 1 : 0, expandSpring()));
          runOnJS(setExpanded)(open);
        }),
    [dragOrigin, expandedSv, expandedTarget, panActivated, rowHeightSv, weekCountSv]
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((open) => {
      const next = !open;
      expandedTarget.set(next ? 1 : 0);
      expandedSv.set(withSpring(next ? 1 : 0, expandSpring()));
      return next;
    });
  }, [expandedSv, expandedTarget, setExpanded]);

  return { pan, panRef, expanded, expandedSv, rowHeightSv, frameStyle, toggleExpanded };
}
