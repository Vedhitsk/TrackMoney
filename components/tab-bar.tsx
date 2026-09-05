import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { TAB_BAR_HEIGHT } from '@/constants/theme';
import { GlassScrim } from '@/components/glass-scrim';
import { GradientButton } from '@/components/ui/gradient-button';

const ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  index: 'home',
  activity: 'receipt-long',
  insights: 'insights',
  manage: 'apps',
};

/**
 * Four-tab bar with the FAB floating between Activity and Insights. The FAB is
 * an action (opens Add Transaction), not a fifth route.
 *
 * The bar is absolutely positioned so content scrolls *underneath* it, ghosted
 * through the blurred scrim — EXPERIENCE.md § Chrome & Scroll Contract, rule
 * C3. Every tab surface must therefore pad its scroll content container by
 * `useTabBarHeight()`; a surface that forgets will hide its last row.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const height = TAB_BAR_HEIGHT + insets.bottom;

  const onFabPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/transaction/new');
  };

  return (
    <GlassScrim edge="bottom" height={height} pointerEvents="box-none">
      <View style={[styles.row, { height, paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const isFocused = state.index === index;
          const iconName = ICONS[route.name] ?? 'circle';

          const onPress = () => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <React.Fragment key={route.key}>
              {index === 2 ? (
                <View style={styles.fabSlot}>
                  <GradientButton
                    size="fab"
                    icon="add"
                    onPress={onFabPress}
                    accessibilityLabel="Add transaction"
                    style={styles.fab}
                  />
                </View>
              ) : null}
              <Pressable
                onPress={onPress}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
              >
                <MaterialIcons
                  name={iconName}
                  size={24}
                  color={isFocused ? theme.tabActive : theme.tabInactive}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? theme.tabActive : theme.tabInactive },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </GlassScrim>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    minHeight: 48,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    marginTop: -26,
  },
});
