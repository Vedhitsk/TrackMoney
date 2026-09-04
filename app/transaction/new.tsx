import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { DatePickerModal, TimePickerModal } from "@/components/date-time-picker";
import { TransactionFormLayout, type UIType } from "@/components/transaction-form-layout";
import { useTransactionStore } from "@/store/useTransactionStore";
import { showAppAlert } from "@/store/useAlertStore";
import { insertTransaction } from "@/db/queries/transactions";
import type { TransactionType } from "@/types";

import { listPendingRecoveries, createSettlements, type PendingRecovery } from "@/db/queries/settlements";

export default function NewTransactionScreen() {
  const router = useRouter();
  const { categories, loadCategories, accounts, loadAccounts } = useTransactionStore();

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
        setPendingRecoveries(res.filter((r) => r.remaining > 0));
      });
    } else {
      setSelectedRecoveries(new Set());
      setAllocations({});
    }
  }, [uiType]);

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
          const rec = pendingRecoveries.find((r) => r.tx.id === selArr[0]);
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
      showAppAlert("Failed to save", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const dateLabel = txDate.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" });
  const timeLabel = txDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <TransactionFormLayout
        uiType={uiType}
        onChangeType={(t) => {
          setUiType(t);
          if (t === "transfer") {
            setCategoryId(null);
            setIsShared(false);
          }
        }}
        accounts={accounts}
        accountId={accountId}
        onSelectAccount={setAccountId}
        toAccounts={accounts.filter((a) => a.id !== accountId)}
        toAccountId={toAccountId}
        onSelectToAccount={setToAccountId}
        categories={categories}
        categoryId={categoryId}
        onSelectCategory={setCategoryId}
        pendingRecoveries={pendingRecoveries}
        selectedRecoveries={selectedRecoveries}
        allocations={allocations}
        onToggleRecovery={handleToggleRecovery}
        onChangeAllocation={(id, v) => setAllocations((prev) => ({ ...prev, [id]: v }))}
        notes={notes}
        onChangeNotes={setNotes}
        isShared={isShared}
        onToggleShared={() => setIsShared((v) => !v)}
        actualAmountStr={actualAmountStr}
        onChangeActualAmount={setActualAmountStr}
        amountStr={amountStr}
        onChangeAmount={setAmountStr}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        onPressDate={() => setShowDatePicker(true)}
        onPressTime={() => setShowTimePicker(true)}
        canSave={canSave}
        onSave={handleSave}
        onCancel={() => router.back()}
      />

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
    </>
  );
}
