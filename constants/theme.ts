import { Platform } from 'react-native';

export const LightColors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#888888',
  expense: '#C62828',
  income: '#2E7D32',
  primary: '#1B6B52',
  primaryLight: '#E8F5E9',
  border: '#E8E0D8',
  borderLight: '#F0EBE4',
  progressGreen: '#43A047',
  progressRed: '#E53935',
  calculator: '#7BA68C',
  calculatorDark: '#5E8A6E',
  fab: '#1B6B52',
  tabActive: '#1B6B52',
  tabInactive: '#999999',
  white: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.08)',
};

export const DarkColors = {
  background: '#121212',
  surface: '#1E1E22',
  text: '#EDEDED',
  textSecondary: '#A1A1AA',
  expense: '#EF4444',
  income: '#22C55E',
  primary: '#10B981',
  primaryLight: '#064E3B',
  border: '#2E2E33',
  borderLight: '#3F3F46',
  progressGreen: '#22C55E',
  progressRed: '#EF4444',
  calculator: '#059669',
  calculatorDark: '#047857',
  fab: '#10B981',
  tabActive: '#10B981',
  tabInactive: '#71717A',
  white: '#1E1E22',
  shadow: 'rgba(0,0,0,0.5)',
};

export type ThemeColors = typeof LightColors;

export const AppColors = LightColors; // Temporary fallback

export const Colors = {
  light: {
    text: LightColors.text,
    background: LightColors.background,
    tint: LightColors.primary,
    icon: LightColors.tabInactive,
    tabIconDefault: LightColors.tabInactive,
    tabIconSelected: LightColors.tabActive,
  },
  dark: {
    text: DarkColors.text,
    background: DarkColors.background,
    tint: DarkColors.primary,
    icon: DarkColors.tabInactive,
    tabIconDefault: DarkColors.tabInactive,
    tabIconSelected: DarkColors.tabActive,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
