import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { GradientButton } from '@/components/ui/gradient-button';

export type PickerItem = { id: number; name: string; icon: string; color?: string };

type Props = {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
  /** Shown below the list, pinned outside the scroll. */
  createLabel: string;
  onCreate: (name: string) => Promise<void> | void;
  /** Category sheets search; account sheets don't need to. */
  searchable?: boolean;
  emptyText?: string;
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 800;

/**
 * Auto-height bottom sheet, capped at 70% of the screen and scrolling past it.
 *
 * Per EXPERIENCE.md: selecting a row closes the sheet immediately — there is no
 * confirm step. The create button is pinned below the list, outside the scroll,
 * so it never scrolls away, and search never filters it out. With no match the
 * create input pre-fills from the query.
 */
export function PickerSheet({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  createLabel,
  onCreate,
  searchable,
  emptyText,
}: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;

  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const createInput = useRef<TextInput>(null);

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      setQuery('');
      setCreating(false);
      setDraftName('');
    }
  }, [visible, translateY]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const drag = Gesture.Pan()
    .onUpdate((e) => {
      // Track the finger downward; rubber-band anything upward.
      translateY.value = e.translationY > 0 ? e.translationY : e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(screenH, { duration: 200 }, () => {
          runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query, searchable]);

  const startCreate = () => {
    setDraftName(query.trim());
    setCreating(true);
    requestAnimationFrame(() => createInput.current?.focus());
  };

  const commitCreate = async () => {
    const name = draftName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await onCreate(name);
      setCreating(false);
      setDraftName('');
      setQuery('');
      Keyboard.dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.fill}>
        <Pressable
          style={[styles.fill, { backgroundColor: theme.sheetScrim }]}
          onPress={close}
          accessibilityLabel="Close"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surfaceElevated,
              maxHeight: screenH * 0.7,
              paddingBottom: Math.max(insets.bottom, 12) + kbHeight,
            },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={drag}>
            <View style={styles.grabWrap} accessibilityRole="button" accessibilityLabel="Close">
              <View style={[styles.grab, { backgroundColor: theme.border }]} />
            </View>
          </GestureDetector>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {searchable && items.length > 0 && (
            <View style={[styles.search, { backgroundColor: theme.background }]}>
              <MaterialIcons name="search" size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${title.toLowerCase()}`}
                placeholderTextColor={theme.textTertiary}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <MaterialIcons name="close" size={18} color={theme.textTertiary} />
                </Pressable>
              )}
            </View>
          )}

          <ScrollView
            style={styles.rows}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                {items.length === 0
                  ? (emptyText ?? `No ${title.toLowerCase()} yet.`)
                  : `No ${title.toLowerCase()} match.`}
              </Text>
            ) : (
              filtered.map((item) => {
                const selected = item.id === selectedId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onSelect(item.id);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.name}
                    style={[
                      styles.row,
                      selected && { backgroundColor: theme.background },
                    ]}
                  >
                    <View
                      style={[
                        styles.tile,
                        { backgroundColor: item.color ? `${item.color}2E` : theme.primaryMuted },
                      ]}
                    >
                      <Text style={styles.tileGlyph}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {selected && (
                      <MaterialIcons name="check" size={20} color={theme.primary} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
            {creating ? (
              <View style={styles.createRow}>
                <TextInput
                  ref={createInput}
                  style={[
                    styles.createInput,
                    { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder={title}
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="done"
                  onSubmitEditing={commitCreate}
                />
                <GradientButton
                  label="Add"
                  size="mini"
                  variant="secondary"
                  onPress={commitCreate}
                  disabled={!draftName.trim()}
                  loading={saving}
                />
              </View>
            ) : (
              <GradientButton
                label={createLabel}
                icon="add"
                size="mini"
                variant="secondary"
                onPress={startCreate}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  grabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    ...Typography.subtitle,
    fontWeight: '700',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    height: 42,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  rows: {
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 11,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: 48,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGlyph: { fontSize: 15 },
  rowName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
  },
  empty: {
    fontSize: 13.5,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
  },
  footer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  createInput: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 14,
  },
});
