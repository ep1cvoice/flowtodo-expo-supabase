import { Platform, type ViewStyle } from 'react-native';

/** Cursor + short transition for desktop web interactive controls. */
export const webInteractive: ViewStyle = Platform.select({
  web: {
    cursor: 'pointer',
    // RN-web CSS props
    transitionProperty: 'background-color, opacity, border-color, transform',
    transitionDuration: '120ms',
  } as ViewStyle,
  default: {},
});
