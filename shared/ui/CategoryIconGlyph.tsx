import { createElement } from 'react';
import type { LucideProps } from 'lucide-react-native';
import { getCategoryIcon } from '@/shared/constants/categoryIcons';

type Props = LucideProps & { icon: string | null | undefined };

/**
 * Renders the icon of a category by name. The icon components come from a static map, so
 * this only picks one; going through `createElement` keeps call sites free of a component
 * looked up during render.
 */
export default function CategoryIconGlyph({ icon, ...props }: Props) {
  return createElement(getCategoryIcon(icon), props);
}
