import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme() ?? 'light';
  
  if (hasHydrated) {
    return theme === 'system' ? colorScheme : theme;
  }

  return 'light';
}
