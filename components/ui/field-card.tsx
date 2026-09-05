import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Typography } from '@/constants/theme';

type Props = {
  /** Uppercase micro-label above the card. Also the empty-state placeholder. */
  label: string;
  value?: string | null;
  icon?: string | null;
  color?: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * One half of the Account | Category row on Add Transaction.
 *
 * Unset, the value slot shows the field's own name — "Account", "Category" —
 * in textTertiary. That placeholder is chrome and must never appear as a row
 * inside the sheet it opens.
 */
export function FieldCard({ label, value, icon, color, onPress, style }: Props) {
  const theme = useAppTheme();
  const empty = !value;

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={empty ? `${label}, not selected` : `${label}, ${value}`}
        style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        {icon ? (
          <View
            style={[
              styles.tile,
              { backgroundColor: color ? `${color}2E` : theme.primaryMuted },
            ]}
          >
            <Text style={styles.tileGlyph}>{icon}</Text>
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.value, { color: empty ? theme.textTertiary : theme.text }]}
        >
          {empty ? label.charAt(0) + label.slice(1).toLowerCase() : value}
        </Text>
        <MaterialIcons name="expand-more" size={18} color={theme.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...Typography.label,
    marginBottom: 5,
  },
  box: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 11,
  },
  tile: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGlyph: { fontSize: 12 },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
