import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/** Re-export so call sites don't need to import Platform directly. */
export const platformSelect = Platform.select;
