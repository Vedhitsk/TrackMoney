import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';

const ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  index: 'home',
  activity: 'receipt-long',
  insights: 'insights',
  manage: 'apps',
};

/**
 * Custom 4-tab bar with a floating circular FAB centered between Activity and
 * Insights, matching the reference designs. The FAB is an action (opens Add
 * Transaction), not a 5th route.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const onFabPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/transaction/new');
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const isFocused = state.index === index;
        const iconName = ICONS[route.name] ?? 'circle';

        const onPress = () => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <React.Fragment key={route.key}>
            {index === 2 ? (
              <View style={styles.fabSlot}>
                <TouchableOpacity
                  style={[styles.fab, { backgroundColor: theme.fab, shadowColor: theme.primary }]}
                  onPress={onFabPress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="add" size={28} color={theme.tabActive} />
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity onPress={onPress} style={styles.tab} activeOpacity={0.7}>
              <MaterialIcons name={iconName} size={24} color={isFocused ? theme.tabActive : theme.tabInactive} />
              <Text style={[styles.label, { color: isFocused ? theme.tabActive : theme.tabInactive }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    elevation: 8,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
});
