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

import { useAppTheme } from "@/hooks/useAppTheme";
import { Radius, Spacing, ThemeColors } from "@/constants/theme";
import { CalculatorPad } from "@/components/calculator-pad";
import { Chip, SectionLabel } from "@/components/ui";
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
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
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

      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => {
          const active = uiType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.typePill, active && { backgroundColor: theme.segmentActiveBg }]}
              onPress={() => onChangeType(opt.value)}>
              <Text style={[styles.typePillText, { color: active ? theme.segmentActiveText : theme.segmentInactiveText }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.pickerCol}>
        <SectionLabel>{uiType === "transfer" ? "From" : "Account"}</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {accounts.map((a) => (
            <Chip key={a.id} label={a.name} icon={a.icon} selected={a.id === accountId} onPress={() => onSelectAccount(a.id)} />
          ))}
        </ScrollView>
      </View>

      {uiType === "transfer" && (
        <View style={styles.pickerCol}>
          <SectionLabel>To</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {toAccounts.map((a) => (
              <Chip key={a.id} label={a.name} icon={a.icon} selected={a.id === toAccountId} onPress={() => onSelectToAccount(a.id)} />
            ))}
          </ScrollView>
        </View>
      )}

      {uiType !== "transfer" && uiType !== "settlement" && (
        <View style={styles.pickerCol}>
          <SectionLabel>Category</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} icon={c.icon} selected={c.id === categoryId} onPress={() => onSelectCategory(c.id)} />
            ))}
          </ScrollView>
        </View>
      )}

      {uiType === "settlement" && (
        <View style={styles.pickerCol}>
          <SectionLabel>Select recoveries</SectionLabel>
          {pendingRecoveries.length === 0 ? (
            <Text style={styles.mutedText}>No pending recoveries available.</Text>
          ) : (
            <ScrollView style={styles.recoveriesScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <View style={styles.recoveriesList}>
                {pendingRecoveries.map((r) => {
                  const checked = selectedRecoveries.has(r.tx.id);
                  return (
                    <View key={r.tx.id} style={[styles.recoveryRow, checked && { borderColor: theme.primary }]}>
                      <TouchableOpacity style={styles.recoveryRowSelect} onPress={() => onToggleRecovery(r.tx.id)}>
                        <MaterialIcons
                          name={checked ? "check-box" : "check-box-outline-blank"}
                          size={22}
                          color={checked ? theme.primary : theme.textSecondary}
                        />
                        <View style={styles.recoveryRowInfo}>
                          <Text style={styles.recoveryRowMerchant} numberOfLines={1}>{r.tx.merchant}</Text>
                          <Text style={[styles.recoveryRowRemaining, { color: theme.expense }]}>
                            Remaining: {formatMoneyINR(r.remaining)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {checked && (
                        <TextInput
                          style={styles.recoveryAllocInput}
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

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Note</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Add a note"
          placeholderTextColor={theme.textTertiary}
          numberOfLines={1}
        />
      </View>

      {uiType === "expense" && (
        <View style={styles.sharedRow}>
          <TouchableOpacity style={styles.sharedToggle} onPress={onToggleShared}>
            <MaterialIcons
              name={isShared ? "check-box" : "check-box-outline-blank"}
              size={20}
              color={isShared ? theme.primary : theme.textSecondary}
            />
            <Text style={styles.sharedLabel}>Shared expense</Text>
          </TouchableOpacity>
          {isShared && (
            <View style={styles.sharedInputWrap}>
              <Text style={styles.detailLabel}>Your share</Text>
              <TextInput
                style={styles.shareAmountInput}
                value={actualAmountStr}
                onChangeText={onChangeActualAmount}
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.datePill} onPress={onPressDate}>
          <MaterialIcons name="calendar-today" size={14} color={theme.textSecondary} />
          <Text style={styles.dateText}>{dateLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.datePill} onPress={onPressTime}>
          <MaterialIcons name="access-time" size={14} color={theme.textSecondary} />
          <Text style={styles.dateText}>{timeLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calculatorWrap}>
        <CalculatorPad value={amountStr} onChange={onChangeAmount} />
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 48,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.sm,
  },
  topBarBtn: {
    padding: 4,
  },
  saveBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "row",
    backgroundColor: theme.segmentTrackBg,
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: "center",
  },
  typePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pickerCol: {
    marginBottom: Spacing.sm,
    gap: 6,
  },
  chipScroll: {
    paddingVertical: 2,
  },
  mutedText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontStyle: "italic",
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
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Radius.md,
    padding: 10,
    gap: 10,
  },
  recoveryRowSelect: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
  recoveryRowInfo: { flex: 1 },
  recoveryRowMerchant: { fontSize: 13, fontWeight: "600", color: theme.text },
  recoveryRowRemaining: { fontSize: 11, marginTop: 2 },
  recoveryAllocInput: {
    width: 74,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: theme.text,
    textAlign: "right",
    backgroundColor: theme.background,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  notesInput: {
    flex: 1,
    marginLeft: Spacing.md,
    textAlign: "right",
    fontSize: 14,
    color: theme.text,
  },
  sharedRow: {
    gap: 6,
    marginBottom: Spacing.xs,
  },
  sharedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sharedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  sharedInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 28,
  },
  shareAmountInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: theme.text,
    minWidth: 90,
    textAlign: "right",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: Spacing.sm,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Radius.pill,
  },
  dateText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  calculatorWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
