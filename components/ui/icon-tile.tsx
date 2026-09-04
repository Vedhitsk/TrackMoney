import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  emoji: string;
  color?: string;
  size?: number;
  style?: ViewStyle;
};

/** Colored rounded-square tile wrapping an emoji glyph (category/merchant icon). */
export function IconTile({ emoji, color, size = 44, style }: Props) {
  const theme = useAppTheme();
  const bg = color ? `${color}33` : theme.primaryMuted;

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
