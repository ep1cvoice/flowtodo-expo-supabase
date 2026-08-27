import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import DataSection from '@/components/settings/DataSection';
import LabelsSection from '@/components/settings/LabelsSection';
import PreferencesSection from '@/components/settings/PreferencesSection';
import ProductivitySection from '@/components/settings/ProductivitySection';
import ProfileSection from '@/components/settings/ProfileSection';
import { useSettingsStyles } from '@/components/settings/settingsStyles';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { useAuth } from '@/context/AuthContext';
import { useKeyboardBottomInset } from '@/lib/useKeyboardBottomInset';

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
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
