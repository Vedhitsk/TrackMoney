import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { LightColors, DarkColors, ThemeColors } from '@/constants/theme';

export function useAppTheme(): ThemeColors {
  const osTheme = useNativeColorScheme() ?? 'light';
  const { theme } = useThemeStore();
  
  const activeTheme = theme === 'system' ? osTheme : theme;
  return activeTheme === 'dark' ? DarkColors : LightColors;
}
