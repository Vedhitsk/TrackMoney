import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets.bottom);

  return (
    <View pointerEvents="box-none" style={styles.outerContainer}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // Graceful fallback if haptics unavailable
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = isFocused ? theme.warning : theme.textSecondary;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabSlot}
            >
              <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color,
                  size: 24,
                })}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors, bottomInset: number) =>
  StyleSheet.create({
    outerContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: Math.max(bottomInset, 12) + 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceElevated,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 6,
      width: '100%',
      maxWidth: 420,
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    tabSlot: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    iconContainerActive: {
      backgroundColor: theme.warningMuted,
    },
  });

