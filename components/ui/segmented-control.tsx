import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Bloom, Gradients, Radius } from '@/constants/theme';
import { GradientFill } from './gradient-button';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
};

/** Pill-shaped segmented control with a smoothly sliding active indicator —
 * the inverted-contrast active pill pattern used throughout the reference
 * designs (Week·Month·Year, Expense·Income·Transfer, etc). */
export function SegmentedControl<T extends string>({ options, value, onChange, style }: Props<T>) {
  const theme = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const indexAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(indexAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      friction: 10,
      tension: 90,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const trackPadding = 4;
  const segmentWidth = options.length > 0 ? (trackWidth - trackPadding * 2) / options.length : 0;
  const translateX = indexAnim.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => trackPadding + i * segmentWidth),
  });

  return (
    <View
      style={[styles.track, { backgroundColor: theme.segmentTrackBg }, style]}
      onLayout={onTrackLayout}
    >
      {trackWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              // The bloom, one step lighter than a CTA — a segment is chrome
              // inside chrome and should not compete with the Save button.
              shadowColor: Gradients.primary.mid,
              shadowOpacity: Bloom.segment.opacity,
              shadowRadius: Bloom.segment.radius,
              shadowOffset: { width: 0, height: Bloom.segment.offsetY },
              elevation: Bloom.segment.elevation,
              transform: [{ translateX }],
            },
          ]}
        >
          <GradientFill radius={Radius.pill} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} style={styles.segment}>
            <Text
              style={[styles.label, { color: active ? theme.segmentActiveText : theme.segmentInactiveText }]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: Radius.pill,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
