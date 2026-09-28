import { createElement } from 'react';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { tokens } from '@/constants/theme';
import { useCreateTask } from '@/context/CreateTaskContext';
import { useTheme } from '@/context/ThemeContext';
import { webInteractive } from '@/utils/pressableWeb';

const PLUS_SIZE = 66;
const PLUS_SLOT_WIDTH = 76;

export default function MainTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { openCreate } = useCreateTask();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const isCompact = !isDesktop && height < 700;
  const contentHeight = isDesktop || isCompact ? 56 : 64;
  const focusedRoute = state.routes[state.index]?.name ?? 'active';

  const bar = (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderColor,
          paddingBottom: insets.bottom,
          borderTopWidth: isDesktop ? 0 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={[styles.row, { height: contentHeight }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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
                  accessibilityLabel="Create new task"
                  style={({ pressed, hovered }) => [
                    styles.plus,
                    { backgroundColor: pressed || hovered ? colors.primaryHover : colors.primary },
                  ]}>
                  <Plus size={28} color="#fff" strokeWidth={2.4} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      {Platform.OS === 'web'
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
        { backgroundColor: colors.bgSurface, borderTopColor: colors.borderColor },
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
});
