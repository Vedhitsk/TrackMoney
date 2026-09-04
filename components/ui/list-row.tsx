import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { IconTile } from './icon-tile';

type Props = {
  emoji?: string;
  iconColor?: string;
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
};

/** icon-tile + title/subtitle + trailing content — the recurring row pattern
 * used for transaction rows, account rows, budget rows, and manage-menu links. */
export function ListRow({
  emoji,
  iconColor,
  leading,
  title,
  subtitle,
  trailing,
  showChevron,
  onPress,
  onLongPress,
  style,
}: Props) {
  const theme = useAppTheme();
  const Wrapper: any = onPress || onLongPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, style]}
      {...(Wrapper === TouchableOpacity ? { activeOpacity: 0.7 } : null)}
    >
      {leading ?? (emoji ? <IconTile emoji={emoji} color={iconColor} /> : null)}
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? (
        <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
});
