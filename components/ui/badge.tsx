import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius } from '@/constants/theme';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

type Props = {
  label: string;
  tone?: Tone;
};

/** Small status pill, e.g. transaction review status, over/under-budget. */
export function Badge({ label, tone = 'neutral' }: Props) {
  const theme = useAppTheme();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: `${theme.progressGreen}22`, fg: theme.progressGreen },
    warning: { bg: `${theme.primary}22`, fg: theme.primary },
    danger: { bg: `${theme.progressRed}22`, fg: theme.progressRed },
    neutral: { bg: theme.borderLight, fg: theme.textSecondary },
  };
  const c = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderRadius: Radius.pill }]}>
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
