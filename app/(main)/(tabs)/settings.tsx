import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  User,
  SlidersHorizontal,
  Tags,
  Zap,
  Trash2,
  LogOut,
  Plus,
  AlertTriangle,
} from 'lucide-react-native';
import ChangePasswordModal from '@/components/settings/ChangePasswordModal';
import CategoryModal from '@/components/tasks/CategoryModal';
import PomodoroHistory from '@/components/tasks/PomodoroHistory';
import TagModal from '@/components/tasks/TagModal';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTasks } from '@/context/TasksContext';
import type { CategoryIcon } from '@/types';
import type { ThemeMode } from '@/constants/theme';
import { tokens } from '@/constants/theme';
import { webInteractive } from '@/utils/pressableWeb';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey = 'profile' | 'preferences' | 'labels' | 'data' | 'productivity';

export default function SettingsScreen() {
  const { user, updateProfile, updatePassword, deleteAccount, logout } = useAuth();
  const { theme, setTheme, colors } = useTheme();
  const {
    activeTasks,
    completedTasks,
    categories,
    tags,
    addCategory,
    addTag,
    deleteCategory,
    deleteTag,
    deleteAllActive,
    deleteAllCompleted,
  } = useTasks();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [pomodoroTime, setPomodoroTime] = useState<string>(
    String(user?.settings?.pomodoroTime ?? 25)
  );
  const [pomodoroMsg, setPomodoroMsg] = useState('');
  const [pomodoroErr, setPomodoroErr] = useState('');
  const [pomodoroSaving, setPomodoroSaving] = useState(false);
  const [themeMsg, setThemeMsg] = useState('');
  const [themeErr, setThemeErr] = useState('');
  const [accountMsg, setAccountMsg] = useState('');
  const [accountErr, setAccountErr] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, tasks, categories, and tags. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAccountMsg('');
            setAccountErr('');
            setDeletingAccount(true);
            const { error } = await deleteAccount();
            setDeletingAccount(false);
            if (error) {
              setAccountErr(error);
              return;
            }
            router.replace('/(auth)/login' as Href);
          },
        },
      ]
    );
  };

  const handlePomodoroSave = async () => {
    setPomodoroMsg('');
    setPomodoroErr('');
    const value = Number(pomodoroTime);
    if (!Number.isFinite(value) || value < 1 || value > 60) {
      setPomodoroErr('Time must be between 1 and 60 minutes');
      return;
    }

    setPomodoroSaving(true);
    const { error } = await updateProfile({ pomodoroTime: value });
    setPomodoroSaving(false);

    if (error) {
      setPomodoroErr(error);
      return;
    }
    setPomodoroMsg('Pomodoro time saved.');
  };

  const handleThemeChange = async (next: ThemeMode) => {
    if (next === theme) return;
    setThemeMsg('');
    setThemeErr('');
    const { error } = await setTheme(next);
    if (error) {
      setThemeErr(error);
      return;
    }
    setThemeMsg('Theme saved.');
  };

  const confirmDeleteAllActive = () => {
    if (activeTasks.length === 0) {
      Alert.alert('Nothing to delete', 'There are no active tasks.');
      return;
    }
    Alert.alert(
      'Delete all active tasks?',
      `This will remove ${activeTasks.length} active task(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAllActive },
      ]
    );
  };

  const confirmDeleteAllCompleted = () => {
    if (completedTasks.length === 0) {
      Alert.alert('Nothing to delete', 'There are no completed tasks.');
      return;
    }
    Alert.alert(
      'Delete all completed tasks?',
      `This will remove ${completedTasks.length} completed task(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAllCompleted },
      ]
    );
  };

  const confirmDeleteCategory = (id: number, name: string) => {
    Alert.alert(
      'Remove category?',
      `Remove "${name}"? Tasks keep their title; this category will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteCategory(id) },
      ]
    );
  };

  const confirmDeleteTag = (id: number, name: string) => {
    Alert.alert(
      'Remove tag?',
      `Remove "#${name}"? It will be removed from any tasks that use it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteTag(id) },
      ]
    );
  };

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <ScreenBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.panel}>
      {/* PROFILE */}
      <View style={styles.section}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.sectionHeader,
            openSection === 'profile' && styles.sectionHeaderActive,
            openSection !== 'profile' && hovered && styles.sectionHeaderHovered,
            pressed && styles.controlPressed,
          ]}
          onPress={() => toggleSection('profile')}>
          <View style={styles.sectionHeaderStart}>
            <User
              size={22}
              color={openSection === 'profile' ? colors.sidebarItemActiveText : colors.textSecondary}
            />
            <Text
              style={[
                styles.sectionTitle,
                openSection === 'profile' && styles.sectionTitleActive,
              ]}>
              Profile
            </Text>
          </View>
          <Plus
            size={22}
            color={openSection === 'profile' ? colors.sidebarItemActiveText : colors.textSecondary}
            style={openSection === 'profile' ? styles.iconRotated : undefined}
          />
        </Pressable>
        {openSection === 'profile' && (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.description}>{user?.username ?? '—'}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
            <Text style={styles.description}>{user?.email ?? '—'}</Text>

            <Pressable
              style={({ pressed, hovered }) => [
                styles.secondaryBtn,
                (hovered || pressed) && styles.secondaryBtnPressed,
              ]}
              onPress={() => {
                setAccountMsg('');
                setAccountErr('');
                setShowPasswordModal(true);
              }}>
              <Text style={styles.secondaryBtnText}>Change password</Text>
            </Pressable>
            {!!accountMsg && <Text style={styles.successInfo}>{accountMsg}</Text>}
            {!!accountErr && <Text style={styles.errorInfo}>{accountErr}</Text>}

            <View style={styles.dangerZone}>
              <View style={styles.dangerHeader}>
                <AlertTriangle size={18} color={colors.red} />
                <Text style={styles.dangerTitle}>Danger zone</Text>
              </View>
              <Text style={styles.description}>
                Permanently delete your account and all associated data.
              </Text>
              <Pressable
                style={({ pressed, hovered }) => [
                  styles.dangerBtn,
                  (hovered || pressed) && styles.dangerBtnPressed,
                  deletingAccount && styles.primaryBtnDisabled,
                ]}
                disabled={deletingAccount}
                onPress={confirmDeleteAccount}>
                <Text style={styles.dangerBtnText}>
                  {deletingAccount ? 'Deleting…' : 'Delete account'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* PREFERENCES */}
      <View style={styles.section}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.sectionHeader,
            openSection === 'preferences' && styles.sectionHeaderActive,
            openSection !== 'preferences' && hovered && styles.sectionHeaderHovered,
            pressed && styles.controlPressed,
          ]}
          onPress={() => toggleSection('preferences')}>
          <View style={styles.sectionHeaderStart}>
            <SlidersHorizontal
              size={22}
              color={
                openSection === 'preferences' ? colors.sidebarItemActiveText : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionTitle,
                openSection === 'preferences' && styles.sectionTitleActive,
              ]}>
              Preferences
            </Text>
          </View>
          <Plus
            size={22}
            color={
              openSection === 'preferences' ? colors.sidebarItemActiveText : colors.textSecondary
            }
            style={openSection === 'preferences' ? styles.iconRotated : undefined}
          />
        </Pressable>
        {openSection === 'preferences' && (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Theme</Text>
            <Text style={styles.description}>Auto / Light / Dark</Text>
            <View style={styles.segment}>
              {themeOptions.map((opt) => {
                const active = theme === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleThemeChange(opt.value)}
                    style={({ hovered, pressed }) => [
                      styles.segmentBtn,
                      active && styles.segmentBtnActive,
                      !active && hovered && styles.segmentBtnHovered,
                      active && hovered && styles.segmentBtnActiveHovered,
                      pressed && styles.controlPressed,
                    ]}>
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!!themeMsg && <Text style={styles.successInfo}>{themeMsg}</Text>}
            {!!themeErr && <Text style={styles.errorInfo}>{themeErr}</Text>}
          </View>
        )}
      </View>

      {/* CATEGORIES & TAGS */}
      <View style={styles.section}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.sectionHeader,
            openSection === 'labels' && styles.sectionHeaderActive,
            openSection !== 'labels' && hovered && styles.sectionHeaderHovered,
            pressed && styles.controlPressed,
          ]}
          onPress={() => toggleSection('labels')}>
          <View style={styles.sectionHeaderStart}>
            <Tags
              size={22}
              color={
                openSection === 'labels' ? colors.sidebarItemActiveText : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionTitle,
                openSection === 'labels' && styles.sectionTitleActive,
              ]}>
              Categories & Tags
            </Text>
          </View>
          <Plus
            size={22}
            color={
              openSection === 'labels' ? colors.sidebarItemActiveText : colors.textSecondary
            }
            style={openSection === 'labels' ? styles.iconRotated : undefined}
          />
        </Pressable>
        {openSection === 'labels' && (
          <View style={styles.sectionBody}>
            <View style={styles.labelBlock}>
              <View style={styles.labelBlockHeader}>
                <Text style={styles.label}>Categories</Text>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.addLinkBtn,
                    (hovered || pressed) && styles.addLinkBtnPressed,
                  ]}
                  onPress={() => setShowCategoryModal(true)}>
                  <Plus size={14} color={colors.primary} />
                  <Text style={styles.addLinkText}>Add category</Text>
                </Pressable>
              </View>
              {categories.length === 0 ? (
                <Text style={styles.description}>No categories yet.</Text>
              ) : (
                <View style={styles.manageList}>
                  {categories.map((cat) => (
                    <View key={cat.id} style={styles.manageRow}>
                      <View style={styles.manageRowStart}>
                        <View style={[styles.manageDot, { backgroundColor: cat.color }]} />
                        <Text style={styles.manageName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => confirmDeleteCategory(cat.id, cat.name)}
                        hitSlop={8}
                        style={({ pressed, hovered }) => [
                          styles.manageDeleteBtn,
                          (hovered || pressed) && styles.manageDeleteBtnPressed,
                        ]}
                        accessibilityLabel={`Remove category ${cat.name}`}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.labelBlock}>
              <View style={styles.labelBlockHeader}>
                <Text style={styles.label}>Tags</Text>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.addLinkBtn,
                    (hovered || pressed) && styles.addLinkBtnPressed,
                  ]}
                  onPress={() => setShowTagModal(true)}>
                  <Plus size={14} color={colors.primary} />
                  <Text style={styles.addLinkText}>Add tag</Text>
                </Pressable>
              </View>
              {tags.length === 0 ? (
                <Text style={styles.description}>No tags yet.</Text>
              ) : (
                <View style={styles.manageList}>
                  {tags.map((tag) => (
                    <View key={tag.id} style={styles.manageRow}>
                      <View style={styles.manageRowStart}>
                        <View style={[styles.manageDot, { backgroundColor: tag.color }]} />
                        <Text style={styles.manageName} numberOfLines={1}>
                          #{tag.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => confirmDeleteTag(tag.id, tag.name)}
                        hitSlop={8}
                        style={({ pressed, hovered }) => [
                          styles.manageDeleteBtn,
                          (hovered || pressed) && styles.manageDeleteBtnPressed,
                        ]}
                        accessibilityLabel={`Remove tag ${tag.name}`}>
                        <Trash2 size={16} color={colors.red} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* DATA */}
      <View style={styles.section}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.sectionHeader,
            openSection === 'data' && styles.sectionHeaderActive,
            openSection !== 'data' && hovered && styles.sectionHeaderHovered,
            pressed && styles.controlPressed,
          ]}
          onPress={() => toggleSection('data')}>
          <View style={styles.sectionHeaderStart}>
            <Trash2
              size={22}
              color={openSection === 'data' ? colors.sidebarItemActiveText : colors.textSecondary}
            />
            <Text
              style={[styles.sectionTitle, openSection === 'data' && styles.sectionTitleActive]}>
              Data
            </Text>
          </View>
          <Plus
            size={22}
            color={openSection === 'data' ? colors.sidebarItemActiveText : colors.textSecondary}
            style={openSection === 'data' ? styles.iconRotated : undefined}
          />
        </Pressable>
        {openSection === 'data' && (
          <View style={styles.sectionBody}>
            <Text style={styles.description}>
              Bulk delete lives here (moved out of task lists).
            </Text>
            <Pressable
              style={({ pressed, hovered }) => [
                styles.dangerBtn,
                (hovered || pressed) && styles.dangerBtnPressed,
              ]}
              onPress={confirmDeleteAllActive}>
              <Trash2 size={16} color={colors.red} />
              <Text style={styles.dangerBtnText}>
                Delete all active ({activeTasks.length})
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed, hovered }) => [
                styles.dangerBtn,
                (hovered || pressed) && styles.dangerBtnPressed,
              ]}
              onPress={confirmDeleteAllCompleted}>
              <Trash2 size={16} color={colors.red} />
              <Text style={styles.dangerBtnText}>
                Delete all completed ({completedTasks.length})
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* PRODUCTIVITY */}
      <View style={styles.section}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.sectionHeader,
            openSection === 'productivity' && styles.sectionHeaderActive,
            openSection !== 'productivity' && hovered && styles.sectionHeaderHovered,
            pressed && styles.controlPressed,
          ]}
          onPress={() => toggleSection('productivity')}>
          <View style={styles.sectionHeaderStart}>
            <Zap
              size={22}
              color={
                openSection === 'productivity' ? colors.sidebarItemActiveText : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionTitle,
                openSection === 'productivity' && styles.sectionTitleActive,
              ]}>
              Productivity
            </Text>
          </View>
          <Plus
            size={22}
            color={
              openSection === 'productivity' ? colors.sidebarItemActiveText : colors.textSecondary
            }
            style={openSection === 'productivity' ? styles.iconRotated : undefined}
          />
        </Pressable>
        {openSection === 'productivity' && (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Pomodoro</Text>
            <Text style={styles.description}>Focus duration for new sessions</Text>
            <View style={styles.pomodoroRow}>
              <TextInput
                value={pomodoroTime}
                onChangeText={(val) => {
                  if (val === '') return setPomodoroTime('');
                  if (/^\d{1,2}$/.test(val)) setPomodoroTime(val);
                }}
                keyboardType="number-pad"
                style={styles.pomodoroInput}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.description}>min</Text>
              <Pressable
                style={({ pressed, hovered }) => [
                  styles.primaryBtn,
                  (hovered || pressed) && styles.primaryBtnPressed,
                  pomodoroSaving && styles.primaryBtnDisabled,
                ]}
                disabled={pomodoroSaving}
                onPress={handlePomodoroSave}>
                <Text style={styles.primaryBtnText}>
                  {pomodoroSaving ? 'Saving…' : 'Set Time'}
                </Text>
              </Pressable>
            </View>
            {!!pomodoroMsg && <Text style={styles.successInfo}>{pomodoroMsg}</Text>}
            {!!pomodoroErr && <Text style={styles.errorInfo}>{pomodoroErr}</Text>}

            <View style={styles.historyBlock}>
              <Text style={styles.label}>Recent sessions</Text>
              <Text style={styles.description}>Last 5 Pomodoros on this device</Text>
              <PomodoroHistory />
            </View>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed, hovered }) => [
          styles.logout,
          (hovered || pressed) && styles.logoutPressed,
        ]}
        onPress={handleLogout}>
        <View style={styles.logoutStart}>
          <LogOut size={20} color={colors.sidebarLogoutText} strokeWidth={2} />
          <Text style={styles.logoutText}>Log Out</Text>
        </View>
      </Pressable>
      </View>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={async (currentPassword, newPassword) => {
          const result = await updatePassword(currentPassword, newPassword);
          if (!result.error) {
            setAccountMsg('Password updated.');
            setAccountErr('');
          }
          return result;
        }}
      />
      <CategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={(name, color, icon) => {
          void addCategory({ name, color, icon: icon as CategoryIcon });
        }}
      />
      <TagModal
        visible={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSave={(name, color) => {
          void addTag({ name, color });
        }}
      />
    </ScrollView>
    </ScreenBackground>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      alignItems: 'center',
    },
    panel: {
      width: '100%',
      maxWidth: 520,
      gap: 10,
    },
    section: {
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: tokens.borderRadius,
      backgroundColor: colors.bgTodoItem,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...webInteractive,
    },
    sectionHeaderActive: {
      backgroundColor: colors.sidebarItemActiveBg,
    },
    sectionHeaderHovered: {
      backgroundColor: colors.todoHighlight,
    },
    controlPressed: {
      opacity: 0.9,
    },
    sectionHeaderStart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sectionTitleActive: {
      color: colors.sidebarItemActiveText,
    },
    iconRotated: {
      transform: [{ rotate: '45deg' }],
    },
    sectionBody: {
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
      padding: 16,
      gap: 8,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    segment: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderColor,
      alignItems: 'center',
      backgroundColor: colors.bgSurface,
      ...webInteractive,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentBtnHovered: {
      backgroundColor: colors.todoHighlight,
      borderColor: colors.primary,
    },
    segmentBtnActiveHovered: {
      backgroundColor: colors.primaryHover,
      borderColor: colors.primaryHover,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: '#fff',
    },
    labelBlock: {
      gap: 8,
      marginTop: 4,
    },
    labelBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    addLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    addLinkBtnPressed: {
      backgroundColor: colors.todoHighlight,
    },
    addLinkText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    manageList: {
      gap: 4,
    },
    manageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.bgSurface,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    manageRowStart: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    manageDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    manageName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    manageDeleteBtn: {
      padding: 6,
      borderRadius: 8,
      ...webInteractive,
    },
    manageDeleteBtnPressed: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    secondaryBtn: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.bgSurface,
      alignItems: 'center',
      ...webInteractive,
    },
    secondaryBtnPressed: {
      backgroundColor: colors.bgCardHover,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontWeight: '500',
      fontSize: 14,
    },
    dangerZone: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.06)',
      gap: 8,
    },
    dangerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dangerTitle: {
      color: colors.red,
      fontWeight: '700',
      fontSize: 14,
    },
    dangerBtn: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      ...webInteractive,
    },
    dangerBtnPressed: {
      backgroundColor: colors.sidebarLogoutHover,
    },
    dangerBtnText: {
      color: colors.red,
      fontWeight: '600',
      fontSize: 14,
    },
    pomodoroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    historyBlock: {
      marginTop: 12,
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    pomodoroInput: {
      width: 64,
      height: 40,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: 10,
      backgroundColor: colors.bgSurface,
      color: colors.textPrimary,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
    primaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...webInteractive,
    },
    primaryBtnPressed: {
      backgroundColor: colors.primaryHover,
    },
    primaryBtnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    successInfo: {
      color: colors.green,
      fontSize: 13,
      fontWeight: '500',
    },
    errorInfo: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '500',
    },
    logout: {
      marginTop: 4,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: tokens.borderRadius,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      ...webInteractive,
    },
    logoutStart: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoutPressed: {
      backgroundColor: colors.sidebarLogoutHover,
      borderColor: colors.red,
    },
    logoutText: {
      color: colors.sidebarLogoutText,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
