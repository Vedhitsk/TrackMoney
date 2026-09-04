import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

type Point = { label: string; value: number };

type Props = {
  data: Point[];
  height?: number;
  highlightIndex?: number;
  /** Top-to-bottom axis labels, e.g. ['$5k', '$2k', '$0']. */
  yAxisLabels?: string[];
};

/** Simple vertical bar chart (e.g. Insights' "last 12 months" spending view). */
export function BarChart({ data, height = 160, highlightIndex, yAxisLabels }: Props) {
  const theme = useAppTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  const activeIdx = highlightIndex ?? data.length - 1;

  return (
    <View style={styles.wrapper}>
      {yAxisLabels ? (
        <View style={[styles.yAxis, { height }]}>
          {yAxisLabels.map((l) => (
            <Text key={l} style={[styles.axisLabel, { color: theme.textTertiary }]}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => {
          const pct = d.value / max;
          const active = i === activeIdx;
          return (
            <View key={i} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(pct * 100, 2)}%`,
                      backgroundColor: active ? theme.primary : theme.border,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.xLabel, { color: theme.textTertiary }]} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'flex-end' },
  yAxis: { justifyContent: 'space-between', marginRight: 8, paddingBottom: 18 },
  axisLabel: { fontSize: 11, fontWeight: '500' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '60%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 2 },
  xLabel: { fontSize: 10, marginTop: 6 },
});
