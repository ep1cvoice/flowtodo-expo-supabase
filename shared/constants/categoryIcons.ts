import {
  Briefcase,
  Book,
  Camera,
  Car,
  Code,
  Coffee,
  Dumbbell,
  Gamepad2,
  Globe,
  Heart,
  Home,
  Leaf,
  Music,
  Palette,
  Plane,
  ShoppingCart,
  Star,
  Target,
  Users,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export const CATEGORY_ICONS = [
  'Briefcase',
  'Home',
  'Book',
  'Heart',
  'Star',
  'ShoppingCart',
  'Dumbbell',
  'Code',
  'Music',
  'Camera',
  'Plane',
  'Car',
  'Coffee',
  'Gamepad2',
  'Palette',
  'Globe',
  'Leaf',
  'Zap',
  'Target',
  'Users',
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_ICON_MAP: Record<CategoryIcon, LucideIcon> = {
  Briefcase,
  Home,
  Book,
  Heart,
  Star,
  ShoppingCart,
  Dumbbell,
  Code,
  Music,
  Camera,
  Plane,
  Car,
  Coffee,
  Gamepad2,
  Palette,
  Globe,
  Leaf,
  Zap,
  Target,
  Users,
};

export function getCategoryIcon(icon: string | null | undefined): LucideIcon {
  if (icon && icon in CATEGORY_ICON_MAP) {
    return CATEGORY_ICON_MAP[icon as CategoryIcon];
  }
  return Briefcase;
}
