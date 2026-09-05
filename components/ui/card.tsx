import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPadding?: boolean;
  noBorder?: boolean;
};

export function Card({ children, style, elevated, noPadding, noBorder }: Props) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: elevated ? theme.surfaceElevated : theme.surface,
          borderRadius: Radius.lg,
          borderWidth: noBorder ? 0 : 1,
          borderColor: theme.border,
          padding: noPadding ? 0 : Spacing.lg,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
