import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius } from '@/constants/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
};

/** Pill-shaped segmented control — the inverted-contrast active pill pattern
 * used throughout the reference designs (Week·Month·Year, Expense·Income·Transfer, etc). */
export function SegmentedControl<T extends string>({ options, value, onChange, style }: Props<T>) {
  const theme = useAppTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.segmentTrackBg }, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && { backgroundColor: theme.segmentActiveBg },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? theme.segmentActiveText : theme.segmentInactiveText },
              ]}
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
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
