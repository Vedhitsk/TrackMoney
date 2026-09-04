import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatMoneyINR } from '@/types';

type Props = {
  amount: number;
  type?: 'expense' | 'income' | 'neutral';
  showSign?: boolean;
  style?: TextStyle;
};

/** Formats a ₹ amount with the correct sign and semantic color. */
export function AmountText({ amount, type = 'neutral', showSign = true, style }: Props) {
  const theme = useAppTheme();
  const color = type === 'expense' ? theme.expense : type === 'income' ? theme.income : theme.text;
  const sign = showSign ? (type === 'expense' ? '-' : type === 'income' ? '+' : '') : '';

  return (
    <Text style={[{ fontWeight: '700', color }, style]}>
      {sign}
      {formatMoneyINR(Math.abs(amount))}
    </Text>
  );
}
