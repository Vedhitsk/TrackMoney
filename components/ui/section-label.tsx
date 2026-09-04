import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Typography } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
};

/** Uppercase, letter-spaced micro-label, e.g. "NET CASH FLOW · JULY". */
export function SectionLabel({ children, color, style }: Props) {
  const theme = useAppTheme();
  return (
    <Text style={[Typography.label, { color: color ?? theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}
