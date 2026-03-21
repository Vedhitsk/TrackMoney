import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/theme";

type Slice = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  data: Slice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 28,
  centerLabel,
  centerSub,
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  if (total === 0) {
    return (
      <View style={[styles.wrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={AppColors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <View style={styles.center}>
          <ThemedText style={styles.centerLabel}>{centerLabel ?? "0"}</ThemedText>
          {centerSub ? <ThemedText style={styles.centerSub}>{centerSub}</ThemedText> : null}
        </View>
      </View>
    );
  }

  let cumAngle = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sweep = (d.value / total) * 360;
      const startAngle = cumAngle;
      cumAngle += sweep;
      return { ...d, startAngle, endAngle: cumAngle, sweep };
    });

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {slices.map((s, i) => {
          if (s.sweep >= 359.99) {
            return (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke={s.color}
                strokeWidth={strokeWidth}
                fill="none"
              />
            );
          }
          return (
            <Path
              key={i}
              d={arcPath(cx, cy, r, s.startAngle, s.endAngle)}
              stroke={s.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={styles.center}>
        <ThemedText style={styles.centerLabel}>{centerLabel ?? "0"}</ThemedText>
        {centerSub ? <ThemedText style={styles.centerSub}>{centerSub}</ThemedText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.text,
  },
  centerSub: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
});
