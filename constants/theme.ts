import { Platform } from 'react-native';

export const AppColors = {
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

export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: AppColors.primary,
    icon: AppColors.tabInactive,
    tabIconDefault: AppColors.tabInactive,
    tabIconSelected: AppColors.tabActive,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
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
