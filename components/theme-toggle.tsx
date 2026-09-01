import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import { useThemeStore } from '@/store/useThemeStore';

export function ThemeToggle() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const themeStore = useThemeStore();
  
  const computedMode = themeStore.theme === 'system' 
    ? (theme.background === '#121212' ? 'dark' : 'light') 
    : themeStore.theme;
  
  const handleToggle = () => {
    const next = computedMode === 'light' ? 'dark' : 'light';
    themeStore.setTheme(next);
  };

  const animatedValue = React.useRef(new Animated.Value(computedMode === 'dark' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: computedMode === 'dark' ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [computedMode]);

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 32], 
  });

  const getIcon = () => {
    return computedMode === 'dark' ? 'dark-mode' : 'light-mode';
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handleToggle} style={styles.track}>
      {/* Background Icons */}
      <View style={styles.iconContainer}>
        <MaterialIcons name="light-mode" size={16} color={theme.textSecondary} style={{ opacity: computedMode === 'light' ? 0 : 0.5 }} />
        <MaterialIcons name="dark-mode" size={16} color={theme.textSecondary} style={{ opacity: computedMode === 'dark' ? 0 : 0.5 }} />
      </View>

      <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbPosition }] }]}>
        <MaterialIcons name={getIcon()} size={18} color={theme.primary} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  track: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.border,
    justifyContent: 'center',
    padding: 2,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    left: 0,
    zIndex: 1,
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 2,
  },
});
