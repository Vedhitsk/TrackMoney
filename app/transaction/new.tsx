import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { CalculatorPad } from "@/components/calculator-pad";
import { DatePickerModal, TimePickerModal } from "@/components/date-time-picker";
import { useTransactionStore } from "@/store/useTransactionStore";
import { insertTransaction } from "@/db/queries/transactions";
import type { TransactionType } from "@/types";
import { formatMoneyINR } from "@/types";

import { listPendingRecoveries, createSettlements, type PendingRecovery } from "@/db/queries/settlements";

type UIType = "income" | "expense" | "transfer" | "settlement";

export default function NewTransactionScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const {
    categories,
    loadCategories,
    accounts,
    loadAccounts,
  } = useTransactionStore();

  const [uiType, setUiType] = useState<UIType>("expense");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [amountStr, setAmountStr] = useState("0");
  const [isShared, setIsShared] = useState(false);
  const [actualAmountStr, setActualAmountStr] = useState("0");
  const [txDate, setTxDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Recovery mapping state
  const [pendingRecoveries, setPendingRecoveries] = useState<PendingRecovery[]>([]);
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [selectedRecoveries, setSelectedRecoveries] = useState<Set<number>>(new Set());

  useEffect(() => {
    void loadCategories();
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (uiType === "settlement") {
      void listPendingRecoveries().then((res) => {
        setPendingRecoveries(res.filter(r => r.remaining > 0));
      });
    } else {
      setSelectedRecoveries(new Set());
      setAllocations({});
    }
  }, [uiType]);

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && accountId === null) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  const amount = useMemo(() => {
    const v = Number(amountStr.replace(/[×÷+\-]/g, ""));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [amountStr]);

  const actualAmount = useMemo(() => {
    if (!isShared) return amount;
    const v = Number(actualAmountStr);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [isShared, amount, actualAmountStr]);

  useEffect(() => {
    if (!isShared) setActualAmountStr(amountStr);
  }, [isShared, amountStr]);

  const handleToggleRecovery = (id: number) => {
    const newSet = new Set(selectedRecoveries);
    if (newSet.has(id)) {
      newSet.delete(id);
      const newAlloc = { ...allocations };
      delete newAlloc[id];
      setAllocations(newAlloc);
      setSelectedRecoveries(newSet);
    } else {
      newSet.add(id);
      setSelectedRecoveries(newSet);
      // Auto split
      const splitAmount = amount / newSet.size;
      const newAlloc = { ...allocations };
      for (const selId of newSet) {
        const rec = pendingRecoveries.find(r => r.tx.id === selId);
        if (rec) {
          newAlloc[selId] = String(Math.min(splitAmount, rec.remaining));
        }
      }
      setAllocations(newAlloc);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;
  const selectedToAccount = accounts.find((a) => a.id === toAccountId) ?? null;
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  const canSave = (() => {
    if (amount <= 0) return false;
    if (uiType === "transfer") {
      return accountId !== null && toAccountId !== null && accountId !== toAccountId;
    }
    if (uiType === "settlement") {
      return accountId !== null && selectedRecoveries.size > 0;
    }
    return accountId !== null && categoryId !== null;
  })();

  const handleSave = async () => {
    try {
      const mappedType: TransactionType = uiType;
      const isExcluded = uiType === "transfer" || uiType === "settlement";
      
      let finalMerchant = notes.trim() || (selectedCategory?.name ?? "");
      if (uiType === "settlement") {
        const selArr = Array.from(selectedRecoveries);
        if (selArr.length === 1) {
          const rec = pendingRecoveries.find(r => r.tx.id === selArr[0]);
          if (rec) finalMerchant = `Recovery: ${rec.tx.merchant}`;
        } else if (selArr.length > 1) {
          finalMerchant = "Multiple Recoveries";
        }
      }

      const newTx = await insertTransaction({
        rawAmount: amount,
        actualAmount: isShared ? actualAmount : amount,
        isShared: uiType === "expense" ? isShared : false,
        type: mappedType,
        categoryId: uiType !== "transfer" && uiType !== "settlement" ? categoryId : null,
        accountId,
        toAccountId: uiType === "transfer" ? toAccountId : null,
        merchant: finalMerchant,
        notes,
        date: txDate,
        source: "manual",
        isExcluded,
      });

      if (uiType === "settlement") {
        const inputs = Array.from(selectedRecoveries)
          .map((id) => ({
            incomeTxId: newTx.id,
            expenseTxId: id,
            amount: parseFloat(allocations[id] ?? "0") || 0,
          }))
          .filter((s) => s.amount > 0);
        await createSettlements(inputs);
      }

      const store = useTransactionStore.getState();
      await store.refreshAllTransactions();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Failed to save", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const dateLabel = txDate.toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const timeLabel = txDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.container}>
      {/* Top Bar: Cancel / Save */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
          <MaterialIcons name="close" size={20} color={theme.expense} />
          <ThemedText style={[styles.topBarText, { color: theme.expense }]}>CANCEL</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topBarBtn}
          disabled={!canSave}
          onPress={handleSave}>
          <MaterialIcons name="check" size={20} color={canSave ? theme.primary : theme.textSecondary} />
          <ThemedText style={[styles.topBarText, { color: canSave ? theme.primary : theme.textSecondary }]}>
            SAVE
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Toggle: INCOME | EXPENSE | TRANSFER | SETTLEMENT */}
        <View style={styles.typeRow}>
          {(["income", "expense", "transfer", "settlement"] as UIType[]).map((t) => {
            const active = uiType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => {
                  setUiType(t);
                  if (t === "transfer") {
                    setCategoryId(null);
                    setIsShared(false);
                  }
                }}>
                {active && <MaterialIcons name="check-circle" size={13} color={theme.primary} />}
                <ThemedText style={[styles.typeChipText, active && styles.typeChipActiveText]}>
                  {t === "settlement" ? "SETTLE" : t.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account & Category Pickers */}
        <View style={styles.pickerRow}>
          {/* Account (From) */}
          <View style={styles.pickerCol}>
            <ThemedText style={styles.pickerLabel}>
              {uiType === "transfer" ? "From" : "Account"}
            </ThemedText>
            <FlatList
              data={accounts}
              keyExtractor={(a) => String(a.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipList}
              renderItem={({ item }) => {
                const active = item.id === accountId;
                return (
                  <TouchableOpacity
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setAccountId(item.id)}>
                    <ThemedText style={styles.chipIcon}>{item.icon}</ThemedText>
                    <ThemedText style={[styles.chipName, active && styles.chipNameActive]} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* To Account (Transfer only) */}
          {uiType === "transfer" && (
            <View style={styles.pickerCol}>
              <ThemedText style={styles.pickerLabel}>To</ThemedText>
              <FlatList
                data={accounts.filter((a) => a.id !== accountId)}
                keyExtractor={(a) => String(a.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipList}
                renderItem={({ item }) => {
                  const active = item.id === toAccountId;
                  return (
                    <TouchableOpacity
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setToAccountId(item.id)}>
                      <ThemedText style={styles.chipIcon}>{item.icon}</ThemedText>
                      <ThemedText style={[styles.chipName, active && styles.chipNameActive]} numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Category (Income/Expense only) */}
          {uiType !== "transfer" && uiType !== "settlement" && (
            <View style={styles.pickerCol}>
              <ThemedText style={styles.pickerLabel}>Category</ThemedText>
              <FlatList
                data={categories}
                keyExtractor={(c) => String(c.id)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipList}
                renderItem={({ item }) => {
                  const active = item.id === categoryId;
                  return (
                    <TouchableOpacity
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategoryId(item.id)}>
                      <ThemedText style={styles.chipIcon}>{item.icon}</ThemedText>
                      <ThemedText style={[styles.chipName, active && styles.chipNameActive]} numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Pending Recoveries Pick List (Settlement only) */}
          {uiType === "settlement" && (
            <View style={styles.pickerCol}>
              <ThemedText style={styles.pickerLabel}>Select Recoveries</ThemedText>
              {pendingRecoveries.length === 0 ? (
                <ThemedText style={styles.noRecoveriesText}>No pending recoveries available.</ThemedText>
              ) : (
                <View style={styles.recoveriesList}>
                  {pendingRecoveries.map((r) => {
                    const isChecked = selectedRecoveries.has(r.tx.id);
                    return (
                      <View key={r.tx.id} style={[styles.recoveryRow, isChecked && styles.recoveryRowActive]}>
                        <TouchableOpacity
                          style={styles.recoveryRowSelect}
                          onPress={() => handleToggleRecovery(r.tx.id)}>
                          <MaterialIcons
                            name={isChecked ? "check-box" : "check-box-outline-blank"}
                            size={24}
                            color={isChecked ? theme.primary : theme.textSecondary}
                          />
                          <View style={styles.recoveryRowInfo}>
                            <ThemedText style={styles.recoveryRowMerchant} numberOfLines={1}>{r.tx.merchant}</ThemedText>
                            <ThemedText style={styles.recoveryRowRemaining}>
                              Remaining: {formatMoneyINR(r.remaining)}
                            </ThemedText>
                          </View>
                        </TouchableOpacity>
                        
                        {isChecked && (
                          <TextInput
                            style={styles.recoveryAllocInput}
                            value={allocations[r.tx.id] ?? ""}
                            onChangeText={(v) => setAllocations((prev) => ({ ...prev, [r.tx.id]: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={theme.textSecondary}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Notes */}
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={theme.textSecondary}
          multiline
        />

        {/* Shared Expense (Expense only) */}
        {uiType === "expense" && (
          <View style={styles.sharedRow}>
            <TouchableOpacity
              style={styles.sharedToggle}
              onPress={() => setIsShared((v) => !v)}>
              <MaterialIcons
                name={isShared ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={isShared ? theme.primary : theme.textSecondary}
              />
              <ThemedText style={styles.sharedLabel}>Shared expense</ThemedText>
            </TouchableOpacity>
            {isShared && (
              <View style={styles.sharedInput}>
                <ThemedText style={styles.sharedSubLabel}>Your share:</ThemedText>
                <TextInput
                  style={styles.shareAmountInput}
                  value={actualAmountStr}
                  onChangeText={setActualAmountStr}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            )}
          </View>
        )}

        {/* Calculator */}
        <CalculatorPad value={amountStr} onChange={setAmountStr} />

        {/* Date / Time */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowDatePicker(true)}>
            <MaterialIcons name="calendar-today" size={16} color={theme.primary} />
            <ThemedText style={styles.dateText}>{dateLabel}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowTimePicker(true)}>
            <MaterialIcons name="access-time" size={16} color={theme.primary} />
            <ThemedText style={styles.dateText}>{timeLabel}</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        value={txDate}
        maximumDate={new Date()}
        onSelect={setTxDate}
        onClose={() => setShowDatePicker(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        value={txDate}
        onSelect={setTxDate}
        onClose={() => setShowTimePicker(false)}
      />
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 48,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  topBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  topBarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 30,
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "nowrap",
    gap: 2,
    marginHorizontal: -4,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  padInputBox: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderBottomWidth: 2,
    borderBottomColor: theme.border,
    paddingBottom: 4,
    marginBottom: 8,
  },
  padInputBoxActive: { borderBottomColor: theme.primary },
  padInputText: { fontSize: 32, fontWeight: "700", color: theme.text, letterSpacing: 1 },

  recoveriesList: { gap: 8, paddingHorizontal: 16, marginTop: 4 },
  noRecoveriesText: { paddingHorizontal: 16, color: theme.textSecondary, fontStyle: "italic" },
  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: 8,
    padding: 10,
    gap: 12,
  },
  recoveryRowActive: { borderColor: theme.primary },
  recoveryRowSelect: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  recoveryRowInfo: { flex: 1 },
  recoveryRowMerchant: { fontSize: 14, fontWeight: "600", color: theme.text },
  recoveryRowRemaining: { fontSize: 11, color: theme.expense, marginTop: 2 },
  recoveryAllocInput: {
    width: 80,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: theme.text,
    textAlign: "right",
    backgroundColor: theme.background,
  },
  typeChipActive: {
    borderBottomColor: theme.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  typeChipActiveText: {
    color: theme.primary,
  },
  pickerRow: {
    gap: 10,
  },
  pickerCol: {
    gap: 6,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipList: {
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  chipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipName: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  chipNameActive: {
    color: theme.primary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: theme.surface,
    color: theme.text,
    minHeight: 52,
    textAlignVertical: "top",
  },
  sharedRow: {
    gap: 8,
  },
  sharedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sharedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  sharedInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 30,
  },
  sharedSubLabel: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  shareAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: theme.surface,
    color: theme.text,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingTop: 4,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.surface,
  },
  dateText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: "600",
  },
});
