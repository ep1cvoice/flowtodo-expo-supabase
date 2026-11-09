export type ThemeMode = 'auto' | 'light' | 'dark';

export type AppColors = {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  red: string;
  redHover: string;
  green: string;
  pink: string;
  bgPageStart: string;
  bgPageMid: string;
  bgPageEnd: string;
  bgSurface: string;
  bgContent: string;
  bgTodoItem: string;
  bgAuthCard: string;
  bgCardHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  sidebarItemActiveBg: string;
  sidebarItemActiveText: string;
  sidebarItemText: string;
  sidebarLogoutText: string;
  overlayBg: string;
  todoHighlight: string;
  sidebarLogoutHover: string;
  chrome: string;
};

export const lightSplashGradient = ['#eef6f3', '#b8ddd4', '#5eead4'] as const;
export const lightSplashGlow = ['rgba(13, 148, 136, 0.18)', 'transparent'] as const;

export const lightColors: AppColors = {
  primary: '#0d9488',
  primaryHover: '#0f766e',
  primaryLight: 'rgba(13, 148, 136, 0.18)',
  red: '#ef4444',
  redHover: '#dc2626',
  green: '#22c55e',
  pink: '#fbcfe8',
  bgPageStart: '#ffffff',
  bgPageMid: '#ffffff',
  bgPageEnd: '#ffffff',
  bgSurface: '#ffffff',
  bgContent: '#ffffff',
  bgTodoItem: '#ffffff',
  bgAuthCard: 'rgba(255, 255, 255, 0.94)',
  bgCardHover: '#f4f4f5',
  textPrimary: '#0c3d38',
  textSecondary: '#3a5f59',
  textMuted: '#6b8a84',
  borderColor: 'rgba(15, 118, 110, 0.22)',
  sidebarItemActiveBg: '#0d9488',
  sidebarItemActiveText: '#ffffff',
  sidebarItemText: '#3a5f59',
  sidebarLogoutText: '#ef4444',
  overlayBg: 'rgba(0, 0, 0, 0.35)',
  todoHighlight: 'rgba(13, 148, 136, 0.12)',
  sidebarLogoutHover: 'rgba(239, 68, 68, 0.08)',
  chrome: '#d7eee6',
};

export const darkColors: AppColors = {
  primary: '#2dd4bf',
  primaryHover: '#14b8a6',
  primaryLight: 'rgba(45, 212, 191, 0.2)',
  red: '#fb7185',
  redHover: '#f43f5e',
  green: '#34d399',
  pink: 'rgba(251, 113, 133, 0.22)',
  bgPageStart: '#021c1b',
  bgPageMid: '#042f2e',
  bgPageEnd: '#0f766e',
  bgSurface: '#0a3d3a',
  bgContent: '#022c22',
  bgTodoItem: '#0f4c49',
  bgAuthCard: '#0f4c49',
  bgCardHover: '#115e59',
  textPrimary: '#ecfdf5',
  textSecondary: '#99f6e4',
  textMuted: '#5f8f88',
  borderColor: 'rgba(45, 212, 191, 0.18)',
  sidebarItemActiveBg: 'rgba(45, 212, 191, 0.28)',
  sidebarItemActiveText: '#042f2e',
  sidebarItemText: '#99f6e4',
  sidebarLogoutText: '#fb7185',
  overlayBg: 'rgba(2, 28, 27, 0.72)',
  todoHighlight: 'rgba(45, 212, 191, 0.1)',
  sidebarLogoutHover: 'rgba(251, 113, 133, 0.16)',
  chrome: '#0a3d3a',
};

export const colors = lightColors;

export const tokens = {
  borderRadius: 14,
  inputHeight: 46,
  buttonHeight: 48,
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 25,
    elevation: 4,
  },
  authCardMaxWidth: 448,
  contentMaxWidth: 760,
  desktopBreakpoint: 768,
} as const;

export const brand = {
  name: 'FlowTodo',
} as const;

export function resolveColors(mode: ThemeMode, systemDark: boolean): AppColors {
  if (mode === 'light') return lightColors;
  if (mode === 'dark') return darkColors;
  return systemDark ? darkColors : lightColors;
}
