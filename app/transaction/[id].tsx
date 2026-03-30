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
import { AppColors } from "@/constants/theme";

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

  useEffect(() => {
    if (!draft) return;
    setAmountStr(String(draft.rawAmount));
    setActualStr(String(draft.actualAmount));
  }, [draft?.id]);

  const uiType: UIType = draft ? txTypeToUI(draft.type) : "expense";

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

  const canSave =
    Boolean(draft) &&
    amount > 0 &&
    (draft
      ? uiType === "transfer"
        ? draft.accountId != null &&
          draft.toAccountId != null &&
          draft.accountId !== draft.toAccountId
        : draft.accountId != null && draft.categoryId != null
      : false);

  if (loadingCurrentTransaction) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ThemedText style={{ color: AppColors.textSecondary }}>Transaction not found.</ThemedText>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    try {
      const patch: Parameters<typeof updateTransaction>[1] = {
        rawAmount: draft.rawAmount,
        actualAmount: draft.isShared ? Number(actualStr) || draft.actualAmount : draft.rawAmount,
        isShared: uiType === "expense" ? draft.isShared : false,
        type: draft.type,
        categoryId: uiType !== "transfer" ? draft.categoryId : null,
        accountId: draft.accountId,
        toAccountId: uiType === "transfer" ? draft.toAccountId : null,
        merchant: draft.merchant.trim() || draft.notes.trim(),
        notes: draft.notes,
        date: draft.date,
        isExcluded: uiType === "transfer" || draft.type === "ignored" || draft.type === "settlement",
        source: "manual",
      };
      await updateTransaction(draft.id ?? idNum, patch);

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
          <MaterialIcons name="close" size={20} color={AppColors.expense} />
          <ThemedText style={[styles.topBarText, { color: AppColors.expense }]}>CANCEL</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarBtn} disabled={!canSave} onPress={handleSave}>
          <MaterialIcons name="check" size={20} color={canSave ? AppColors.primary : AppColors.textSecondary} />
          <ThemedText style={[styles.topBarText, { color: canSave ? AppColors.primary : AppColors.textSecondary }]}>
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
                {active && <MaterialIcons name="check-circle" size={13} color={AppColors.primary} />}
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
        {uiType !== "transfer" && (
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

        {/* Notes / Merchant */}
        <TextInput
          style={styles.notesInput}
          value={draft.notes}
          onChangeText={(v) => {
            setDraftField("notes", v);
            setDraftField("merchant", v.split(",")[0]?.trim() || "");
          }}
          placeholder="Add notes..."
          placeholderTextColor={AppColors.textSecondary}
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
                color={draft.isShared ? AppColors.primary : AppColors.textSecondary}
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
                  placeholderTextColor={AppColors.textSecondary}
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
            <MaterialIcons name="calendar-today" size={16} color={AppColors.primary} />
            <ThemedText style={styles.dateText}>
              {draft.date.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowTimePicker(true)}>
            <MaterialIcons name="access-time" size={16} color={AppColors.primary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
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
    borderBottomColor: AppColors.border,
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
    borderBottomColor: AppColors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textSecondary,
  },
  typeChipActiveText: {
    color: AppColors.primary,
  },
  pickerCol: {
    gap: 6,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textSecondary,
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
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  chipActive: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipName: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.text,
  },
  chipNameActive: {
    color: AppColors.primary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: AppColors.surface,
    color: AppColors.text,
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
    color: AppColors.text,
  },
  sharedInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 30,
  },
  sharedSubLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  shareAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: AppColors.surface,
    color: AppColors.text,
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
    borderColor: AppColors.border,
    borderRadius: 8,
    backgroundColor: AppColors.surface,
  },
  dateText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: "600",
  },
});
