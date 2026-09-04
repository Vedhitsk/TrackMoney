import React from "react";
import {
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

function AccountChips({
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
  const theme = useAppTheme();
  return (
    <View style={styles.listRow}>
      <Text style={[styles.listRowLabel, { color: theme.textSecondary }]}>{label}</Text>
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
 * Shared single-page Add/Edit Transaction layout. Deliberately NOT wrapped in
 * a page-level ScrollView: the amount readout, type toggle, and keypad stay
 * fixed, and the account/category pickers are single-row horizontal
 * scrollers (never wrap) so the whole screen stays visible with no scroll
 * regardless of how many accounts/categories exist.
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 12) + 12,
        },
      ]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onCancel} style={styles.topBarBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: canSave ? theme.primary : theme.borderLight }]}
          disabled={!canSave}
          onPress={onSave}>
          <Text style={[styles.saveBtnText, { color: canSave ? "#FFFFFF" : theme.textSecondary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <SegmentedControl style={styles.typeSegment} options={TYPE_OPTIONS} value={uiType} onChange={onChangeType} />

      <View style={styles.amountWrap}>
        <Text style={[styles.amountText, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
          ₹{amountStr}
        </Text>
      </View>

      {!isTransfer && !isSettlement && (
        <View style={styles.section}>
          <SectionLabel>Category</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} icon={c.icon} selected={c.id === categoryId} onPress={() => onSelectCategory(c.id)} />
            ))}
          </ScrollView>
        </View>
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
        {isTransfer ? (
          <>
            <AccountChips label="From" items={accounts} selectedId={accountId} onSelect={onSelectAccount} />
            <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
            <AccountChips label="To" items={toAccounts} selectedId={toAccountId} onSelect={onSelectToAccount} />
          </>
        ) : (
          <AccountChips label="Account" items={accounts} selectedId={accountId} onSelect={onSelectAccount} />
        )}

        <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
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

      <View style={styles.calculatorWrap}>
        <CalculatorPad value={amountStr} onChange={onChangeAmount} showDisplay={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  topBarBtn: {
    padding: 4,
  },
  saveBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  typeSegment: {
    marginBottom: Spacing.lg,
  },
  amountWrap: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  amountText: {
    ...Typography.hero,
    fontSize: 40,
  },
  section: {
    marginBottom: Spacing.md,
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
  listRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 6,
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
    paddingVertical: 12,
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
    marginBottom: Spacing.md,
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
  calculatorWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
