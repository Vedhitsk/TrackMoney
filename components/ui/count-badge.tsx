import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  count: number;
  tone?: 'danger' | 'primary';
};

/** Small circular numeric counter, sized to sit flush beside a chevron (e.g. Manage menu rows). */
export function CountBadge({ count, tone = 'danger' }: Props) {
  const theme = useAppTheme();
  const bg = tone === 'danger' ? `${theme.expense}22` : `${theme.primary}22`;
  const fg = tone === 'danger' ? theme.expense : theme.primary;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
