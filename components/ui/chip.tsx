import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius } from '@/constants/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
};

/** Selectable pill chip — category/account pickers, filter rows. */
export function Chip({ label, selected, onPress, icon, style }: Props) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.chipActiveBg : theme.chipBg },
        style,
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text
        style={[styles.label, { color: selected ? theme.chipActiveText : theme.chipText }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    marginRight: 8,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
