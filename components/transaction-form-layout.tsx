import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { CalculatorPad } from "@/components/calculator-pad";
import { Card, Chip, SectionLabel, SegmentedControl } from "@/components/ui";
import { formatMoneyINR } from "@/types";
import type { PendingRecovery } from "@/db/queries/settlements";

export type UIType = "income" | "expense" | "transfer" | "settlement";

type PickerItem = { id: number; name: string; icon: string };

type Props = {
  uiType: UIType;
  onChangeType: (t: UIType) => void;

  accounts: PickerItem[];
  accountId: number | null;
  onSelectAccount: (id: number) => void;

  toAccounts: PickerItem[];
  toAccountId: number | null;
  onSelectToAccount: (id: number) => void;

  categories: PickerItem[];
  categoryId: number | null;
  onSelectCategory: (id: number) => void;

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

function ChipSection({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: PickerItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionLabel>{label}</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {items.map((item) => (
          <Chip
            key={item.id}
            label={item.name}
            icon={item.icon}
            selected={item.id === selectedId}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Shared single-page Add/Edit Transaction layout. The amount readout, type
 * toggle, and keypad are meant to stay fixed without the page needing to
 * scroll, and account/category pickers are single-row horizontal scrollers
 * (never wrap) so the layout stays stable regardless of how many
 * accounts/categories exist. It's still wrapped in a ScrollView (with a
 * `flexGrow: 1` content container so it doesn't visibly scroll in the normal
 * case) purely so focusing the Note field can scroll it above the keyboard.
 */
export function TransactionFormLayout({
  uiType,
  onChangeType,
  accounts,
  accountId,
  onSelectAccount,
  toAccounts,
  toAccountId,
  onSelectToAccount,
  categories,
  categoryId,
  onSelectCategory,
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
  const actionEnabled = canSave;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableOpacity activeOpacity={1} onPress={onCancel} style={[styles.swipeHandleWrap, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={[styles.swipeHandle, { backgroundColor: theme.border }]} />
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedControl style={styles.typeSegment} options={TYPE_OPTIONS} value={uiType} onChange={onChangeType} />

        <View style={styles.amountWrap}>
          <Text style={[styles.amountText, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
            ₹{amountStr}
          </Text>
        </View>

        {isTransfer ? (
          <>
            <ChipSection label="From" items={accounts} selectedId={accountId} onSelect={onSelectAccount} />
            <ChipSection label="To" items={toAccounts} selectedId={toAccountId} onSelect={onSelectToAccount} />
          </>
        ) : (
          <ChipSection label="Account" items={accounts} selectedId={accountId} onSelect={onSelectAccount} />
        )}

        {!isTransfer && !isSettlement && (
          <ChipSection label="Category" items={categories} selectedId={categoryId} onSelect={onSelectCategory} />
        )}

        {isSettlement && (
          <View style={styles.section}>
            <SectionLabel>Select recoveries</SectionLabel>
            {pendingRecoveries.length === 0 ? (
              <Text style={[styles.mutedText, { color: theme.textSecondary }]}>No pending recoveries available.</Text>
            ) : (
              <ScrollView style={styles.recoveriesScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <View style={styles.recoveriesList}>
                  {pendingRecoveries.map((r) => {
                    const checked = selectedRecoveries.has(r.tx.id);
                    return (
                      <View key={r.tx.id} style={[styles.recoveryRow, { borderColor: checked ? theme.primary : theme.border }]}>
                        <TouchableOpacity style={styles.recoveryRowSelect} onPress={() => onToggleRecovery(r.tx.id)}>
                          <MaterialIcons
                            name={checked ? "check-box" : "check-box-outline-blank"}
                            size={22}
                            color={checked ? theme.primary : theme.textSecondary}
                          />
                          <View style={styles.recoveryRowInfo}>
                            <Text style={[styles.recoveryRowMerchant, { color: theme.text }]} numberOfLines={1}>{r.tx.merchant}</Text>
                            <Text style={[styles.recoveryRowRemaining, { color: theme.expense }]}>
                              Remaining: {formatMoneyINR(r.remaining)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {checked && (
                          <TextInput
                            style={[styles.recoveryAllocInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                            value={allocations[r.tx.id] ?? ""}
                            onChangeText={(v) => onChangeAllocation(r.tx.id, v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={theme.textSecondary}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
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
              placeholder="Add a note"
              placeholderTextColor={theme.textTertiary}
              numberOfLines={1}
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
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
            )}
          </View>
        )}

      </ScrollView>

      <View style={[styles.bottomFixed, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <CalculatorPad value={amountStr} onChange={onChangeAmount} />
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: actionEnabled ? theme.primary : theme.segmentTrackBg }]}
          disabled={!actionEnabled}
          onPress={onSave}
        >
          <Text style={[styles.actionBtnText, { color: actionEnabled ? "#FFFFFF" : theme.textSecondary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  swipeHandleWrap: {
    alignItems: "center",
    paddingBottom: Spacing.sm,
  },
  swipeHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  typeSegment: {
    marginBottom: Spacing.md,
  },
  amountWrap: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  amountText: {
    ...Typography.hero,
    fontSize: 44,
  },
  section: {
    marginBottom: Spacing.sm,
    gap: 6,
  },
  mutedText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  chipScroll: {
    paddingVertical: 2,
  },
  recoveriesScroll: {
    maxHeight: 130,
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
  bottomFixed: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  actionBtn: {
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
