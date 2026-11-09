import { type ViewStyle } from 'react-native';
import { platformSelect } from '@/shared/lib/platform';

/** Cursor + short transition for desktop web interactive controls. */
export const webInteractive: ViewStyle = platformSelect({
  web: {
    cursor: 'pointer',
    // RN-web CSS props
    transitionProperty: 'background-color, opacity, border-color, transform',
    transitionDuration: '120ms',
  } as ViewStyle,
  default: {},
});
