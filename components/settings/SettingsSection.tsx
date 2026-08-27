import type { ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useSettingsStyles } from '@/components/settings/settingsStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SettingsSectionProps {
  title: string;
  Icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function SettingsSection({
  title,
  Icon,
  open,
  onToggle,
  children,
}: SettingsSectionProps) {
  const { colors, styles } = useSettingsStyles();
  const iconColor = open ? colors.sidebarItemActiveText : colors.textSecondary;

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={styles.section}>
      <Pressable
        style={({ hovered, pressed }) => [
          styles.sectionHeader,
          open && styles.sectionHeaderActive,
          !open && hovered && styles.sectionHeaderHovered,
          pressed && styles.controlPressed,
        ]}
        onPress={handleToggle}>
        <View style={styles.sectionHeaderStart}>
          <Icon size={22} color={iconColor} />
          <Text style={[styles.sectionTitle, open && styles.sectionTitleActive]}>{title}</Text>
        </View>
        <Plus
          size={22}
          color={iconColor}
          style={open ? styles.iconRotated : undefined}
        />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}
