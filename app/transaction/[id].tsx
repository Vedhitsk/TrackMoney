import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { CalculatorPad } from "@/components/calculator-pad";
import { DatePickerModal, TimePickerModal } from "@/components/date-time-picker";
import { useTransactionStore } from "@/store/useTransactionStore";
import { updateTransaction } from "@/db/queries/transactions";
import { addKeywordsToCategory } from "@/db/queries/categories";
import type { TransactionType } from "@/types";
import { formatMoneyINR } from "@/types";

import { listPendingRecoveries, createSettlements, type PendingRecovery } from "@/db/queries/settlements";

type UIType = "income" | "expense" | "transfer" | "settlement";

function extractTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function txTypeToUI(type: TransactionType): UIType {
  if (type === "settlement") return "settlement";
  if (type === "income") return "income";
  if (type === "transfer") return "transfer";
  return "expense";
}

export default function EditTransactionScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const idNum = Number(params.id);

  const {
    categories,
    loadCategories,
    accounts,
    loadAccounts,
    loadingCurrentTransaction,
    draft,
    setDraftField,
  } = useTransactionStore();

  useEffect(() => {
    if (!Number.isFinite(idNum)) return;
    void loadCategories();
    void loadAccounts();
    void useTransactionStore.getState().loadTransactionById(idNum);
  }, [idNum]);

  const [amountStr, setAmountStr] = useState("0");
  const [actualStr, setActualStr] = useState("0");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Recovery mapping state
  const [pendingRecoveries, setPendingRecoveries] = useState<PendingRecovery[]>([]);
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [selectedRecoveries, setSelectedRecoveries] = useState<Set<number>>(new Set());

  const uiType: UIType = draft ? txTypeToUI(draft.type) : "expense";

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

  useEffect(() => {
    if (!draft) return;
    setAmountStr(String(draft.rawAmount));
    setActualStr(String(draft.actualAmount));
  }, [draft?.id]);

  const setUIType = (t: UIType) => {
    const mapped: TransactionType = t;
    setDraftField("type", mapped);
    if (t === "transfer") {
      setDraftField("categoryId", null);
      setDraftField("isShared", false);
    }
  };

  const amount = useMemo(() => {
    const v = Number(amountStr.replace(/[×÷+\-]/g, ""));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [amountStr]);

  useEffect(() => {
    if (!draft) return;
    setDraftField("rawAmount", amount);
    if (!draft.isShared) {
      setDraftField("actualAmount", amount);
      setActualStr(String(amount));
    }
  }, [amount]);

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

  const canSave =
    Boolean(draft) &&
    amount > 0 &&
    (draft
      ? uiType === "transfer"
        ? draft.accountId != null &&
          draft.toAccountId != null &&
          draft.accountId !== draft.toAccountId
        : uiType === "settlement"
        ? draft.accountId != null && selectedRecoveries.size > 0
        : draft.accountId != null && draft.categoryId != null
      : false);

  if (loadingCurrentTransaction) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ThemedText style={{ color: theme.textSecondary }}>Transaction not found.</ThemedText>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    try {
      let finalMerchant = draft.merchant.trim() || draft.notes.trim();
      if (uiType === "settlement") {
        const selArr = Array.from(selectedRecoveries);
        if (selArr.length === 1) {
          const rec = pendingRecoveries.find(r => r.tx.id === selArr[0]);
          if (rec) finalMerchant = `Recovery: ${rec.tx.merchant}`;
        } else if (selArr.length > 1) {
          finalMerchant = "Multiple Recoveries";
        }
      }

      const patch: Parameters<typeof updateTransaction>[1] = {
        rawAmount: draft.rawAmount,
        actualAmount: draft.isShared ? Number(actualStr) || draft.actualAmount : draft.rawAmount,
        isShared: uiType === "expense" ? draft.isShared : false,
        type: draft.type,
        categoryId: uiType !== "transfer" && uiType !== "settlement" ? draft.categoryId : null,
        accountId: draft.accountId,
        toAccountId: uiType === "transfer" ? draft.toAccountId : null,
        merchant: finalMerchant,
        notes: draft.notes,
        date: draft.date,
        isExcluded: uiType === "transfer" || draft.type === "ignored" || draft.type === "settlement",
        source: "manual",
      };
      await updateTransaction(draft.id ?? idNum, patch);

      if (uiType === "settlement") {
        const inputs = Array.from(selectedRecoveries)
          .map((id) => ({
            incomeTxId: draft.id ?? idNum,
            expenseTxId: id,
            amount: parseFloat(allocations[id] ?? "0") || 0,
          }))
          .filter((s) => s.amount > 0);
        await createSettlements(inputs);
      }

      if (uiType === "expense" && draft.categoryId) {
        // Only add the merchant name as keywords, NOT the full SMS body.
        // Adding the full body pollutes category matching with words like 'ref', 'sbi', 'dear' etc.
        const tokens = extractTokens(draft.merchant);
        if (tokens.length > 0) await addKeywordsToCategory(draft.categoryId, tokens);
      }

      const store = useTransactionStore.getState();
      await store.refreshAllTransactions();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Failed to save", e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
          <MaterialIcons name="close" size={20} color={theme.expense} />
          <ThemedText style={[styles.topBarText, { color: theme.expense }]}>CANCEL</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarBtn} disabled={!canSave} onPress={handleSave}>
          <MaterialIcons name="check" size={20} color={canSave ? theme.primary : theme.textSecondary} />
          <ThemedText style={[styles.topBarText, { color: canSave ? theme.primary : theme.textSecondary }]}>
            SAVE
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Toggle */}
        <View style={styles.typeRow}>
          {(["income", "expense", "transfer", "settlement"] as UIType[]).map((t) => {
            const active = uiType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setUIType(t)}>
                {active && <MaterialIcons name="check-circle" size={13} color={theme.primary} />}
                <ThemedText style={[styles.typeChipText, active && styles.typeChipActiveText]}>
                  {t === "settlement" ? "SETTLE" : t.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account Picker */}
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
              const active = item.id === draft.accountId;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDraftField("accountId", item.id)}>
                  <ThemedText style={styles.chipIcon}>{item.icon}</ThemedText>
                  <ThemedText style={[styles.chipName, active && styles.chipNameActive]} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* To Account (Transfer) */}
        {uiType === "transfer" && (
          <View style={styles.pickerCol}>
            <ThemedText style={styles.pickerLabel}>To</ThemedText>
            <FlatList
              data={accounts.filter((a) => a.id !== draft.accountId)}
              keyExtractor={(a) => String(a.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipList}
              renderItem={({ item }) => {
                const active = item.id === draft.toAccountId;
                return (
                  <TouchableOpacity
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDraftField("toAccountId", item.id)}>
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

        {/* Category (Income/Expense) */}
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
                const active = item.id === draft.categoryId;
                return (
                  <TouchableOpacity
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDraftField("categoryId", item.id)}>
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

        {/* Notes / Merchant */}
        <TextInput
          style={styles.notesInput}
          value={draft.notes}
          onChangeText={(v) => {
            setDraftField("notes", v);
            setDraftField("merchant", v.split(",")[0]?.trim() || "");
          }}
          placeholder="Add notes..."
          placeholderTextColor={theme.textSecondary}
          multiline
        />

        {/* Shared Expense */}
        {uiType === "expense" && (
          <View style={styles.sharedRow}>
            <TouchableOpacity
              style={styles.sharedToggle}
              onPress={() => {
                const next = !draft.isShared;
                setDraftField("isShared", next);
                if (!next) {
                  setDraftField("actualAmount", draft.rawAmount);
                  setActualStr(String(draft.rawAmount));
                }
              }}>
              <MaterialIcons
                name={draft.isShared ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={draft.isShared ? theme.primary : theme.textSecondary}
              />
              <ThemedText style={styles.sharedLabel}>Shared expense</ThemedText>
            </TouchableOpacity>
            {draft.isShared && (
              <View style={styles.sharedInput}>
                <ThemedText style={styles.sharedSubLabel}>Your share:</ThemedText>
                <TextInput
                  style={styles.shareAmountInput}
                  value={actualStr}
                  onChangeText={(t) => {
                    setActualStr(t);
                    const n = Number(t);
                    if (Number.isFinite(n)) setDraftField("actualAmount", n);
                  }}
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
            <ThemedText style={styles.dateText}>
              {draft.date.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowTimePicker(true)}>
            <MaterialIcons name="access-time" size={16} color={theme.primary} />
            <ThemedText style={styles.dateText}>
              {draft.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        value={draft.date}
        maximumDate={new Date()}
        onSelect={(d) => setDraftField("date", d)}
        onClose={() => setShowDatePicker(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        value={draft.date}
        onSelect={(d) => setDraftField("date", d)}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  typeChipActive: {
    borderBottomColor: theme.primary,
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
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  typeChipActiveText: {
    color: theme.primary,
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
