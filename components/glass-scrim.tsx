import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { TAB_BAR_HEIGHT } from '@/constants/theme';

/**
 * Total height the tab bar occupies, including the bottom safe-area inset.
 *
 * The tab bar is absolutely positioned so content scrolls underneath it, which
 * means every scrolling surface has to pad its *content container* by this
 * amount. See EXPERIENCE.md § Chrome & Scroll Contract, rule C3 — a surface
 * that forgets will hide its own last row.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom;
}

/** Top padding a scrolling surface needs to start clear of the status bar. */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.top, 12);
}

type ScrimProps = {
  /** Height of the band. Defaults to the top safe-area inset. */
  height?: number;
  edge?: 'top' | 'bottom';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  pointerEvents?: 'none' | 'auto' | 'box-none';
};

/**
 * The band content passes beneath at the top and bottom of every tab surface
 * (rules C2 and C3).
 *
 * DESIGN.md specifies a 20px blur here, with the note: "degrade to a solid
 * band — never to transparent." This build ships the degraded form. `expo-blur`
 * could not be installed in this environment (npm ECONNRESET on download), so
 * the band is the theme's scrim tint at 72% opacity instead. That is enough to
 * keep content from colliding with the clock, which is the property that
 * actually matters; the ghosting is what's missing.
 *
 * To restore the blur once the network allows:
 *   npx expo install expo-blur
 * then render a <BlurView intensity={60} tint={isDark ? 'dark' : 'light'}
 * experimentalBlurMethod="dimezisBlurView" /> in StyleSheet.absoluteFill below
 * the tint View. Nothing else changes.
 */
export function GlassScrim({
  height,
  edge = 'top',
  style,
  children,
  pointerEvents = 'none',
}: ScrimProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const h = height ?? insets.top;

  const hairline =
    edge === 'top'
      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight }
      : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.borderLight };

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.band,
        edge === 'top' ? styles.top : styles.bottom,
        { height: h, backgroundColor: theme.scrim },
        hairline,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
