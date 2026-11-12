import { strings } from '@/shared/lib/strings';
import { createElement } from 'react';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { tokens } from '@/shared/constants/theme';
import { useCreateTask } from '@/features/tasks/CreateTaskContext';
import { useTheme } from '@/shared/providers/ThemeContext';
import { webInteractive } from '@/shared/lib/pressableWeb';
import { usePomodoroState } from '@/features/pomodoro/PomodoroContext';
import PomodoroMiniBar from '@/features/pomodoro/components/PomodoroMiniBar';
import { isWeb } from '@/shared/lib/platform';

const PLUS_SIZE = 66;
const PLUS_SLOT_WIDTH = 76;

// While the pomodoro strip is pinned above the tab row, the upper half of the + button
// (the part overlapping the strip) turns into a translucent red shadow, a shade darker than the strip, and the
// lower half stays solid.
function PlusHalves({ color, shadow }: { color: string; shadow: string }) {
  const circle = {
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    borderRadius: PLUS_SIZE / 2,
    backgroundColor: color,
  };
  return (
    <>
      <View style={[styles.plusHalf, styles.plusHalfTop]} pointerEvents="none">
        <View style={[circle, { backgroundColor: shadow }]} />
      </View>
      <View style={[styles.plusHalf, styles.plusHalfBottom]} pointerEvents="none">
        <View style={[circle, { marginTop: -PLUS_SIZE / 2 }]} />
      </View>
    </>
  );
}

export default function MainTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const chromeColor = colors.chrome;
  const { openCreate } = useCreateTask();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const isCompact = !isDesktop && height < 700;
  const contentHeight = isDesktop || isCompact ? 56 : 64;
  const focusedRoute = state.routes[state.index]?.name ?? 'active';
  const { activePomo } = usePomodoroState();
  // The + button overlaps the top edge of the tab bar, i.e. the pinned pomodoro strip.
  const pomoBarVisible = !!activePomo && focusedRoute !== 'pomodoro';

  const bar = (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: chromeColor,
          borderTopColor: colors.borderColor,
          paddingBottom: insets.bottom,
          borderTopWidth: isDesktop ? 0 : StyleSheet.hairlineWidth,
        },
      ]}>
      <PomodoroMiniBar
        hidden={focusedRoute === 'pomodoro'}
        onOpen={() => navigation.navigate('pomodoro')}
      />
      <View style={[styles.row, { height: contentHeight }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          // Routes declared with `href: null` are reachable but not shown in the bar.
          if (StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') return null;
          const focused = state.index === index;
          const color = focused ? options.tabBarActiveTintColor : options.tabBarInactiveTintColor;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const item = (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed, hovered }) => [
                styles.item,
                isDesktop && styles.itemDesktop,
                (pressed || hovered) && { backgroundColor: colors.todoHighlight },
              ]}>
              {options.tabBarIcon?.({ focused, color: color ?? colors.textSecondary, size: 24 })}
              {options.tabBarShowLabel === false ? null : (
                <Text
                  style={[
                    styles.label,
                    isDesktop && styles.labelDesktop,
                    { color: color ?? colors.textSecondary },
                  ]}
                  numberOfLines={1}>
                  {label}
                </Text>
              )}
            </Pressable>
          );

          if (route.name !== 'calendar') return item;

          return (
            <View key={route.key} style={styles.calendarGroup}>
              {item}
              <View style={styles.plusSlot}>
                <Pressable
                  onPress={() => openCreate(focusedRoute)}
                  accessibilityRole="button"
                  accessibilityLabel={strings.nav.createTask}
                  style={({ pressed, hovered }) => [
                    styles.plus,
                    pomoBarVisible
                      ? styles.plusOverPomo
                      : { backgroundColor: pressed || hovered ? colors.primaryHover : colors.primary },
                  ]}>
                  {({ pressed, hovered }) => (
                    <>
                      {pomoBarVisible ? (
                        <PlusHalves
                          color={pressed || hovered ? colors.primaryHover : colors.primary}
                          shadow={isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)'}
                        />
                      ) : null}
                      <Plus size={28} color="#fff" strokeWidth={2.4} />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      {isWeb
        ? createElement('style', {
            dangerouslySetInnerHTML: {
              __html: `
              [role="tab"] {
                cursor: pointer !important;
                border-radius: 12px !important;
                transition: background-color 120ms ease !important;
              }
            `,
            },
          })
        : null}
    </View>
  );

  if (!isDesktop) return bar;

  return (
    <View
      style={[
        styles.chromeBg,
        { backgroundColor: chromeColor, borderTopColor: colors.borderColor },
      ]}>
      <View style={styles.chromeInner}>{bar}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  chromeBg: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 20,
  },
  chromeInner: {
    width: '100%',
    maxWidth: tokens.contentMaxWidth,
    overflow: 'visible',
  },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'visible',
  },
  calendarGroup: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'visible',
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    gap: 2,
    ...webInteractive,
  },
  itemDesktop: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  labelDesktop: {
    fontSize: 12,
    marginTop: 0,
  },
  plusSlot: {
    width: PLUS_SLOT_WIDTH,
    alignItems: 'center',
    overflow: 'visible',
  },
  plus: {
    position: 'absolute',
    top: -PLUS_SIZE / 2,
    left: (PLUS_SLOT_WIDTH - PLUS_SIZE) / 2,
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    borderRadius: PLUS_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    ...webInteractive,
  },
  plusOverPomo: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  plusHalf: {
    position: 'absolute',
    left: 0,
    width: PLUS_SIZE,
    height: PLUS_SIZE / 2,
    overflow: 'hidden',
  },
  plusHalfTop: { top: 0 },
  plusHalfBottom: { top: PLUS_SIZE / 2 },
});
