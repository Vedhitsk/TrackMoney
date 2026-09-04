import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius } from '@/constants/theme';

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  style?: ViewStyle;
};

/**
 * The mockups' dark "sparkle + message + Apply" nudge banner. Reused here for
 * REAL existing notices (pending-review count, over-budget alerts) rather
 * than generated AI insight text, which is out of scope for this app.
 */
export function InsightCard({ message, actionLabel, onAction, onPress, tone = 'default', style }: Props) {
  const theme = useAppTheme();
  const accent = tone === 'danger' ? theme.progressRed : theme.primary;
  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }, style]}>
      <MaterialIcons name={tone === 'danger' ? 'error-outline' : 'auto-awesome'} size={18} color={accent} />
      <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.action, { color: accent }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
  },
});
