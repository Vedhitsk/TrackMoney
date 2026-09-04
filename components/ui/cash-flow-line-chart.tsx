import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius } from '@/constants/theme';

type Point = { label: string; value: number };

type Props = {
  data: Point[];
  height?: number;
  color?: string;
  /** Index of the point to draw the dashed marker + callout bubble for (defaults to the max value). */
  calloutIndex?: number;
  calloutLabel?: string;
};

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/** Smoothed line + gradient-fill area chart with a peak-value callout, used for Home's net cash flow graph. */
export function CashFlowLineChart({ data, height = 160, color, calloutIndex, calloutLabel }: Props) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const lineColor = color ?? theme.primary;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (data.length === 0 || width === 0) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const padTop = 30;
  const padBottom = 8;
  const usableH = height - padTop - padBottom;

  const points = data.map((d, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * width : width / 2,
    y: padTop + usableH - ((d.value - min) / range) * usableH,
  }));

  const linePath = buildSmoothPath(points);
  const floorY = height - padBottom;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${floorY} L ${points[0].x} ${floorY} Z`;

  const peakIdx = calloutIndex ?? values.indexOf(max);
  const peak = points[peakIdx];
  const calloutWidth = 96;
  const calloutLeft = peak ? Math.min(Math.max(peak.x - calloutWidth / 2, 0), width - calloutWidth) : 0;

  return (
    <View style={{ height }} onLayout={onLayout}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.35} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#cashFlowFill)" stroke="none" />
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {peak ? (
          <>
            <Line
              x1={peak.x}
              y1={peak.y}
              x2={peak.x}
              y2={floorY}
              stroke={theme.border}
              strokeWidth={1}
              strokeDasharray="3,4"
            />
            <Circle cx={peak.x} cy={peak.y} r={4} fill={lineColor} />
          </>
        ) : null}
      </Svg>
      {peak && calloutLabel ? (
        <View pointerEvents="none" style={[styles.calloutWrap, { left: calloutLeft, top: Math.max(peak.y - 28, 0) }]}>
          <Text
            style={[
              styles.calloutText,
              { color: theme.text, backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}
            numberOfLines={1}
          >
            {calloutLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  calloutWrap: {
    position: 'absolute',
    width: 96,
    alignItems: 'center',
  },
  calloutText: {
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
