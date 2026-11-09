import { strings } from '@/shared/lib/strings';
import { type ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { ListTodo, CheckCircle2, Settings, Calendar, type LucideIcon } from 'lucide-react-native';
import { Text, useWindowDimensions, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MainTabBar from '@/shared/ui/navigation/MainTabBar';
import BrandLogo from '@/shared/ui/BrandLogo';
import { tokens } from '@/shared/constants/theme';
import { CreateTaskProvider } from '@/features/tasks/CreateTaskContext';
import { useTheme } from '@/shared/providers/ThemeContext';
import { platformSelect } from '@/shared/lib/platform';

const HEADER_ICONS: Record<string, LucideIcon> = {
  active: ListTodo,
  completed: CheckCircle2,
  settings: Settings,
  calendar: Calendar,
};

function DesktopConstrainedHeader({
  title,
  routeName,
  headerRight,
}: {
  title?: string;
  routeName?: string;
  headerRight?: (props: { canGoBack: boolean }) => ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const HeaderIcon = routeName ? HEADER_ICONS[routeName] : undefined;
  const right = headerRight?.({ canGoBack: false });
  const showTitle = Boolean(title);

  return (
    <View
      style={[
        styles.headerBg,
        {
          backgroundColor: colors.chrome,
          borderBottomColor: colors.borderColor,
          paddingTop: insets.top,
        },
      ]}>
      <View style={styles.headerInner}>
        {showTitle ? (
          <View style={styles.headerTitleRow}>
            {HeaderIcon ? (
              <HeaderIcon size={22} color={colors.primary} strokeWidth={2.2} />
            ) : null}
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : null}
        {right ? (
          <View style={[styles.headerRight, !showTitle && styles.headerRightFull]}>{right}</View>
        ) : (
          <BrandLogo />
        )}
      </View>
    </View>
  );
}

export default function MainTabsLayout() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= tokens.desktopBreakpoint;
  const isCompactTabBar = !isDesktop && height < 700;

  return (
    <CreateTaskProvider>
    <Tabs
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        header: ({ options, route }) => (
          <DesktopConstrainedHeader
            title={options.title}
            routeName={route.name}
            headerRight={options.headerRight}
          />
        ),
        headerShown: true,
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        // Keep labels on normal phone screens so the iOS home-indicator inset
        // feels intentional. Only hide them when the viewport is too short.
        tabBarShowLabel: !isCompactTabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'visible',
        },
        tabBarItemStyle: isDesktop
          ? {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
            }
          : {
              paddingVertical: 2,
            },
        tabBarIconStyle: isDesktop
          ? {
              marginTop: 0,
              marginBottom: 0,
            }
          : undefined,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          ...(isDesktop
            ? {
                marginLeft: 6,
                marginTop: 0,
              }
            : {
                marginTop: 2,
              }),
        },
      }}>
      <Tabs.Screen
        name="active"
        options={{
          title: strings.nav.allTab,
          tabBarLabel: strings.nav.allTasks,
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: strings.nav.calendar,
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: strings.nav.completed,
          tabBarLabel: 'Completed',
          tabBarIcon: ({ color, size }) => (
            <CheckCircle2 size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: strings.nav.settings,
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
    </CreateTaskProvider>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    ...platformSelect({
      web: {
        zIndex: 10,
      },
      default: {},
    }),
  },
  headerInner: {
    width: '100%',
    maxWidth: tokens.contentMaxWidth,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleRow: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    maxWidth: '48%',
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  headerRightFull: {
    flexGrow: 1,
    maxWidth: '100%',
  },
});
