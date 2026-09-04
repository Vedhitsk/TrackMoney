import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { DatePickerModal, TimePickerModal } from "@/components/date-time-picker";
import { TransactionFormLayout, type UIType } from "@/components/transaction-form-layout";
import { useTransactionStore } from "@/store/useTransactionStore";
import { updateTransaction } from "@/db/queries/transactions";
import { addKeywordsToCategory } from "@/db/queries/categories";
import type { TransactionType } from "@/types";

import { listPendingRecoveries, createSettlements, type PendingRecovery } from "@/db/queries/settlements";

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

  const [pendingRecoveries, setPendingRecoveries] = useState<PendingRecovery[]>([]);
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [selectedRecoveries, setSelectedRecoveries] = useState<Set<number>>(new Set());

  const uiType: UIType = draft ? txTypeToUI(draft.type) : "expense";

  useEffect(() => {
    if (uiType === "settlement") {
      void listPendingRecoveries().then((res) => {
        setPendingRecoveries(res.filter((r) => r.remaining > 0));
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
      const splitAmount = amount / newSet.size;
      const newAlloc = { ...allocations };
      for (const selId of newSet) {
        const rec = pendingRecoveries.find((r) => r.tx.id === selId);
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
        ? draft.accountId != null && draft.toAccountId != null && draft.accountId !== draft.toAccountId
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
          <Text style={{ color: theme.textSecondary }}>Transaction not found.</Text>
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
          const rec = pendingRecoveries.find((r) => r.tx.id === selArr[0]);
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
    <>
      <TransactionFormLayout
        uiType={uiType}
        onChangeType={setUIType}
        accounts={accounts}
        accountId={draft.accountId}
        onSelectAccount={(id) => setDraftField("accountId", id)}
        toAccounts={accounts.filter((a) => a.id !== draft.accountId)}
        toAccountId={draft.toAccountId}
        onSelectToAccount={(id) => setDraftField("toAccountId", id)}
        categories={categories}
        categoryId={draft.categoryId}
        onSelectCategory={(id) => setDraftField("categoryId", id)}
        pendingRecoveries={pendingRecoveries}
        selectedRecoveries={selectedRecoveries}
        allocations={allocations}
        onToggleRecovery={handleToggleRecovery}
        onChangeAllocation={(id, v) => setAllocations((prev) => ({ ...prev, [id]: v }))}
        notes={draft.notes}
        onChangeNotes={(v) => {
          setDraftField("notes", v);
          setDraftField("merchant", v.split(",")[0]?.trim() || "");
        }}
        isShared={draft.isShared}
        onToggleShared={() => {
          const next = !draft.isShared;
          setDraftField("isShared", next);
          if (!next) {
            setDraftField("actualAmount", draft.rawAmount);
            setActualStr(String(draft.rawAmount));
          }
        }}
        actualAmountStr={actualStr}
        onChangeActualAmount={(t) => {
          setActualStr(t);
          const n = Number(t);
          if (Number.isFinite(n)) setDraftField("actualAmount", n);
        }}
        amountStr={amountStr}
        onChangeAmount={setAmountStr}
        dateLabel={draft.date.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })}
        timeLabel={draft.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        onPressDate={() => setShowDatePicker(true)}
        onPressTime={() => setShowTimePicker(true)}
        canSave={canSave}
        onSave={handleSave}
        onCancel={() => router.back()}
      />

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
    </>
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
});
