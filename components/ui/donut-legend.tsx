import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatMoneyINR } from '@/types';

type Item = { label: string; value: number; color: string };

type Props = {
  data: Item[];
  /** Show a formatted amount next to the percentage (default true). */
  showAmount?: boolean;
};

/** Side/below legend for DonutChart: colored dot + label + amount + share %. */
export function DonutLegend({ data, showAmount = true }: Props) {
  const theme = useAppTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const rows = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
        return (
          <View key={row.label} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
              {row.label}
            </Text>
            {showAmount ? (
              <Text style={[styles.amount, { color: theme.textSecondary }]}>
                {formatMoneyINR(row.value)}
              </Text>
            ) : null}
            <Text style={[styles.pct, { color: theme.textSecondary }]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 13,
    fontWeight: '500',
  },
  pct: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});
