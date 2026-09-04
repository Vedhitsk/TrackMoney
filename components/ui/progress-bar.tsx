import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  /** 0-1 fraction (values outside are clamped). */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
};

export function ProgressBar({ progress, color, trackColor, height = 6, style }: Props) {
  const theme = useAppTheme();
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? theme.borderLight,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.primary,
        }}
      />
    </View>
  );
}
