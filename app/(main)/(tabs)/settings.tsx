import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import DataSection from '@/features/settings/components/DataSection';
import LabelsSection from '@/features/settings/components/LabelsSection';
import PreferencesSection from '@/features/settings/components/PreferencesSection';
import ProductivitySection from '@/features/settings/components/ProductivitySection';
import ProfileSection from '@/features/settings/components/ProfileSection';
import { useSettingsStyles } from '@/features/settings/components/settingsStyles';
import ScreenBackground from '@/shared/ui/ScreenBackground';
import { useAuth } from '@/core/auth/AuthContext';
import { useKeyboardBottomInset } from '@/shared/lib/useKeyboardBottomInset';

type SectionKey = 'profile' | 'preferences' | 'labels' | 'data' | 'productivity';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { colors, styles } = useSettingsStyles();
  const router = useRouter();
  const keyboardInset = useKeyboardBottomInset();
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const toggleSection = (key: SectionKey) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as Href);
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + keyboardInset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <ProfileSection
            open={openSection === 'profile'}
            onToggle={() => toggleSection('profile')}
          />
          <PreferencesSection
            open={openSection === 'preferences'}
            onToggle={() => toggleSection('preferences')}
          />
          <LabelsSection
            open={openSection === 'labels'}
            onToggle={() => toggleSection('labels')}
          />
          <DataSection open={openSection === 'data'} onToggle={() => toggleSection('data')} />
          <ProductivitySection
            open={openSection === 'productivity'}
            onToggle={() => toggleSection('productivity')}
          />

          <Pressable
            style={({ pressed, hovered }) => [
              styles.logout,
              (hovered || pressed) && styles.logoutPressed,
            ]}
            onPress={handleLogout}>
            <View style={styles.logoutStart}>
              <LogOut size={20} color={colors.sidebarLogoutText} strokeWidth={2} />
              <Text style={styles.logoutText}>{strings.auth.logOut}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
