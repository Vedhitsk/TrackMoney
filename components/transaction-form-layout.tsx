import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { CalculatorPad } from "@/components/calculator-pad";
import { PickerSheet, type PickerItem } from "@/components/picker-sheet";
import { Card, FieldCard, GradientButton, SectionLabel, SegmentedControl } from "@/components/ui";
import { formatMoneyINR } from "@/types";
import type { PendingRecovery } from "@/db/queries/settlements";

export type UIType = "income" | "expense" | "transfer" | "settlement";

type Props = {
  uiType: UIType;
  onChangeType: (t: UIType) => void;

  accounts: PickerItem[];
  accountId: number | null;
  onSelectAccount: (id: number) => void;
  onCreateAccount: (name: string) => Promise<void>;

  toAccounts: PickerItem[];
  toAccountId: number | null;
  onSelectToAccount: (id: number) => void;

  categories: PickerItem[];
  categoryId: number | null;
  onSelectCategory: (id: number) => void;
  onCreateCategory: (name: string) => Promise<void>;

  pendingRecoveries: PendingRecovery[];
  selectedRecoveries: Set<number>;
  allocations: Record<number, string>;
  onToggleRecovery: (id: number) => void;
  onChangeAllocation: (id: number, value: string) => void;

  notes: string;
  onChangeNotes: (v: string) => void;

  isShared: boolean;
  onToggleShared: () => void;
  actualAmountStr: string;
  onChangeActualAmount: (v: string) => void;

  amountStr: string;
  onChangeAmount: (v: string) => void;

  dateLabel: string;
  timeLabel: string;
  onPressDate: () => void;
  onPressTime: () => void;

  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
};

const TYPE_OPTIONS: { value: UIType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "settlement", label: "Settle" },
];

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/**
 * Add / Edit Transaction.
 *
 * THREE FIXED BANDS — this structure is the fix for the note-focus bug, not a
 * stylistic choice. See EXPERIENCE.md § Keyboard & Keypad Contract.
 *
 *   header  grab bar, type segment, amount readout — never scrolls, never moves
 *   middle  the only scrollable region; shrinks by the keyboard height
 *   footer  keypad + action — anchored, never moves, occluded by the keyboard
 *
 * The previous version put all of this inside one ScrollView wrapped in a
 * KeyboardAvoidingView with behavior="height". That resizes the whole screen,
 * and because the keypad was a sibling inside the same avoiding view it rode
 * up with everything else — which is exactly what the bug report described.
 * There is no KeyboardAvoidingView here at all; the middle band listens to
 * keyboard height directly and nothing else reacts.
 */
export function TransactionFormLayout({
  uiType,
  onChangeType,
  accounts,
  accountId,
  onSelectAccount,
  onCreateAccount,
  toAccounts,
  toAccountId,
  onSelectToAccount,
  categories,
  categoryId,
  onSelectCategory,
  onCreateCategory,
  pendingRecoveries,
  selectedRecoveries,
  allocations,
  onToggleRecovery,
  onChangeAllocation,
  notes,
  onChangeNotes,
  isShared,
  onToggleShared,
  actualAmountStr,
  onChangeActualAmount,
  amountStr,
  onChangeAmount,
  dateLabel,
  timeLabel,
  onPressDate,
  onPressTime,
  canSave,
  onSave,
  onCancel,
}: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isTransfer = uiType === "transfer";
  const isSettlement = uiType === "settlement";
  const isExpense = uiType === "expense";

  const [sheet, setSheet] = useState<null | "account" | "toAccount" | "category">(null);
  const [keyboardH, setKeyboardH] = useState(0);
  const midScroll = useRef<ScrollView>(null);

  const amountIsZero = !amountStr || amountStr === "0";
  const actionLabel = amountIsZero
    ? "Enter an amount"
    : canSave
      ? "Save"
      : isTransfer
        ? "Select both accounts"
        : isSettlement
          ? "Select a recovery"
          : "Select account & category";

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;
  const selectedToAccount = toAccounts.find((a) => a.id === toAccountId) ?? null;
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  // K2 — the keyboard rises OVER the keypad. We only need its height so the
  // middle band can shrink; nothing else on the screen responds to it.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) => setKeyboardH(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setKeyboardH(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  // K4/K5 — when the note gains focus, scroll the middle band only, and only
  // far enough to lift the focused row clear with a row of breathing space.
  const onNoteFocus = () => {
    requestAnimationFrame(() => midScroll.current?.scrollToEnd({ animated: true }));
  };

  const translateY = useSharedValue(0);

  // Drag-only dismiss. A tap is deliberately a no-op: this screen holds an
  // amount the user typed, and the bar is the only exit, so an accidental tap
  // must not throw the entry away.
  const drag = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY > 0 ? e.translationY : e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(
          Dimensions.get("window").height,
          { duration: 220 },
          () => {
            runOnJS(onCancel)();
          },
        );
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.root, { backgroundColor: theme.background }, sheetStyle]}>
      {/* ---------------- band 1 · header, fixed ---------------- */}
      <GestureDetector gesture={drag}>
        <View
          style={[styles.grabWrap, { paddingTop: Math.max(insets.top, 12) }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityHint="Drag down to discard this transaction"
        >
          <View style={[styles.grab, { backgroundColor: theme.border }]} />
        </View>
      </GestureDetector>

      <View style={styles.header}>
        <SegmentedControl
          style={styles.typeSegment}
          options={TYPE_OPTIONS}
          value={uiType}
          onChange={onChangeType}
        />
        <Text
          style={[styles.amountText, { color: amountIsZero ? theme.textTertiary : theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          ₹{amountStr}
        </Text>
      </View>

      {/* ---------------- band 2 · scrollable middle ---------------- */}
      <View style={[styles.mid, keyboardH > 0 && { marginBottom: keyboardH }]}>
        <ScrollView
          ref={midScroll}
          contentContainerStyle={styles.midContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isTransfer ? (
            <View style={styles.fieldRow}>
              <FieldCard
                label="FROM"
                value={selectedAccount?.name}
                icon={selectedAccount?.icon}
                color={selectedAccount?.color}
                onPress={() => setSheet("account")}
              />
              <FieldCard
                label="TO"
                value={selectedToAccount?.name}
                icon={selectedToAccount?.icon}
                color={selectedToAccount?.color}
                onPress={() => setSheet("toAccount")}
              />
            </View>
          ) : (
            <View style={styles.fieldRow}>
              <FieldCard
                label="ACCOUNT"
                value={selectedAccount?.name}
                icon={selectedAccount?.icon}
                color={selectedAccount?.color}
                onPress={() => setSheet("account")}
              />
              {!isSettlement && (
                <FieldCard
                  label="CATEGORY"
                  value={selectedCategory?.name}
                  icon={selectedCategory?.icon}
                  color={selectedCategory?.color}
                  onPress={() => setSheet("category")}
                />
              )}
            </View>
          )}

          {isSettlement && (
            <View style={styles.section}>
              <SectionLabel>Select recoveries</SectionLabel>
              {pendingRecoveries.length === 0 ? (
                <Text style={[styles.mutedText, { color: theme.textSecondary }]}>
                  No pending recoveries available.
                </Text>
              ) : (
                <View style={styles.recoveriesList}>
                  {pendingRecoveries.map((r) => {
                    const checked = selectedRecoveries.has(r.tx.id);
                    return (
                      <View
                        key={r.tx.id}
                        style={[
                          styles.recoveryRow,
                          { borderColor: checked ? theme.primary : theme.border },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.recoveryRowSelect}
                          onPress={() => onToggleRecovery(r.tx.id)}
                        >
                          <MaterialIcons
                            name={checked ? "check-box" : "check-box-outline-blank"}
                            size={22}
                            color={checked ? theme.primary : theme.textSecondary}
                          />
                          <View style={styles.recoveryRowInfo}>
                            <Text style={[styles.recoveryRowMerchant, { color: theme.text }]} numberOfLines={1}>
                              {r.tx.merchant}
                            </Text>
                            <Text style={[styles.recoveryRowRemaining, { color: theme.expense }]}>
                              Remaining: {formatMoneyINR(r.remaining)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {checked && (
                          <TextInput
                            style={[
                              styles.recoveryAllocInput,
                              { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
                            ]}
                            value={allocations[r.tx.id] ?? ""}
                            onChangeText={(v) => onChangeAllocation(r.tx.id, v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={theme.textTertiary}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <Card style={styles.listCard} noPadding>
            <TouchableOpacity style={styles.detailRow} onPress={onPressDate}>
              <Text style={[styles.listRowLabel, { color: theme.textSecondary }]}>Date</Text>
              <View style={styles.detailValueRow}>
                <MaterialIcons name="calendar-today" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailValue, { color: theme.text }]}>{dateLabel}</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            <TouchableOpacity style={styles.detailRow} onPress={onPressTime}>
              <Text style={[styles.listRowLabel, { color: theme.textSecondary }]}>Time</Text>
              <View style={styles.detailValueRow}>
                <MaterialIcons name="access-time" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailValue, { color: theme.text }]}>{timeLabel}</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.listRowLabel, { color: theme.textSecondary }]}>Note</Text>
              <TextInput
                style={[styles.noteInput, { color: theme.text }]}
                value={notes}
                onChangeText={onChangeNotes}
                onFocus={onNoteFocus}
                placeholder="Add a note"
                placeholderTextColor={theme.textTertiary}
                numberOfLines={1}
                returnKeyType="done"
              />
            </View>
          </Card>

          {isExpense && (
            <View style={styles.sharedSection}>
              <TouchableOpacity style={styles.sharedToggle} onPress={onToggleShared}>
                <MaterialIcons
                  name={isShared ? "check-box" : "check-box-outline-blank"}
                  size={20}
                  color={isShared ? theme.primary : theme.textSecondary}
                />
                <Text style={[styles.sharedLabel, { color: theme.text }]}>Shared expense</Text>
              </TouchableOpacity>
              {isShared && (
                <View style={styles.sharedInputWrap}>
                  <Text style={[styles.listRowLabel, { color: theme.textSecondary }]}>Your share</Text>
                  <TextInput
                    style={[styles.shareAmountInput, { borderColor: theme.border, color: theme.text }]}
                    value={actualAmountStr}
                    onChangeText={onChangeActualAmount}
                    onFocus={onNoteFocus}
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ---------------- band 3 · footer, anchored ---------------- */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <CalculatorPad value={amountStr} onChange={onChangeAmount} />
        <GradientButton
          label={actionLabel}
          size="cta"
          onPress={onSave}
          disabled={!canSave}
          style={styles.action}
        />
      </View>

      <PickerSheet
        visible={sheet === "account" || sheet === "toAccount"}
        title={sheet === "toAccount" ? "To account" : "Account"}
        items={sheet === "toAccount" ? toAccounts : accounts}
        selectedId={sheet === "toAccount" ? toAccountId : accountId}
        onSelect={sheet === "toAccount" ? onSelectToAccount : onSelectAccount}
        onClose={() => setSheet(null)}
        createLabel="New account"
        onCreate={onCreateAccount}
      />

      <PickerSheet
        visible={sheet === "category"}
        title="Category"
        items={categories}
        selectedId={categoryId}
        onSelect={onSelectCategory}
        onClose={() => setSheet(null)}
        createLabel="New category"
        onCreate={onCreateCategory}
        searchable
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  grabWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    // Drawn small, targeted large — 44pt of vertical hit area.
    minHeight: 44,
    paddingBottom: Spacing.sm,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  header: {
    paddingHorizontal: Spacing.lg,
  },
  typeSegment: {
    marginBottom: Spacing.md,
  },
  amountText: {
    ...Typography.hero,
    fontSize: 44,
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: Spacing.md,
  },

  mid: {
    flex: 1,
  },
  midContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  fieldRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  section: {
    marginBottom: Spacing.sm,
    gap: 6,
  },
  mutedText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  recoveriesList: {
    gap: 8,
  },
  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 10,
    gap: 10,
  },
  recoveryRowSelect: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
  recoveryRowInfo: { flex: 1 },
  recoveryRowMerchant: { fontSize: 13, fontWeight: "600" },
  recoveryRowRemaining: { fontSize: 11, marginTop: 2 },
  recoveryAllocInput: {
    width: 74,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    textAlign: "right",
  },

  listCard: {
    marginBottom: Spacing.sm,
  },
  listRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  noteInput: {
    flex: 1,
    marginLeft: Spacing.md,
    textAlign: "right",
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },

  sharedSection: {
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sharedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  sharedLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  sharedInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 28,
  },
  shareAmountInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 90,
    textAlign: "right",
  },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  action: {
    width: "100%",
  },
});
