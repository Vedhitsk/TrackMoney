import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';

export function useColorScheme(): 'light' | 'dark' {
  const osTheme = useNativeColorScheme() ?? 'light';
  const { theme } = useThemeStore();
  
  return theme === 'system' ? osTheme : theme;
}
