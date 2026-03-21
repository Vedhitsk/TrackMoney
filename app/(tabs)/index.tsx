import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { useTransactionStore } from "@/store/useTransactionStore";
import {
  loadRecordsFilterPrefs,
  saveRecordsFilterPrefs,
} from "@/lib/recordsFilterPrefs";
import { AppColors } from "@/constants/theme";
import type { Transaction } from "@/types";
import { formatMoneyINR } from "@/types";

type FilterMode = "day" | "week" | "month" | "year";

function getCategoryLabel(categoryId: number | null, categories: { id: number; name: string }[]) {
  if (!categoryId) return "Uncategorized";
  return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
}

function getCategoryIcon(categoryId: number | null, categories: { id: number; icon: string }[]) {
  if (!categoryId) return "💰";
  return categories.find((c) => c.id === categoryId)?.icon ?? "💰";
}

function groupByDate(txns: Transaction[]): { title: string; data: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of txns) {
    const key = tx.date.toLocaleDateString("en-IN", {
      month: "short",
      day: "2-digit",
      weekday: "long",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }
  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
}

function getRange(anchor: Date, mode: FilterMode): { start: Date; end: Date } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();

  switch (mode) {
    case "day":
      return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
    case "week":
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    case "month":
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case "year":
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
}

function navigateAnchor(anchor: Date, mode: FilterMode, direction: -1 | 1): Date {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();

  switch (mode) {
    case "day":
      return new Date(y, m, d + direction);
    case "week":
      return new Date(y, m, d + direction * 7);
    case "month":
      return new Date(y, m + direction, 1);
    case "year":
      return new Date(y + direction, 0, 1);
  }
}

function formatLabel(anchor: Date, mode: FilterMode): string {
  switch (mode) {
    case "day":
      return anchor.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    case "week": {
      const s = startOfWeek(anchor);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
      const fmt = (dt: Date) => dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return `${fmt(s)} - ${fmt(e)}`;
    }
    case "month":
      return anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    case "year":
      return String(anchor.getFullYear());
  }
}

export default function RecordsScreen() {
  const router = useRouter();
  const {
    categories,
    loadCategories,
    pendingTransactions,
    refreshPendingTransactions,
    allTransactions,
    refreshAllTransactions,
    loadingAllTransactions,
  } = useTransactionStore();

  const [anchor, setAnchor] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterPrefsHydrated, setFilterPrefsHydrated] = useState(false);

  useEffect(() => {
    void loadCategories();
    void refreshPendingTransactions();
    void refreshAllTransactions();
  }, []);

  useEffect(() => {
    void (async () => {
      const prefs = await loadRecordsFilterPrefs();
      if (prefs) {
        setFilterMode(prefs.filterMode);
        setAnchor(prefs.anchor);
      }
      setFilterPrefsHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!filterPrefsHydrated) return;
    void saveRecordsFilterPrefs(filterMode, anchor);
  }, [filterMode, anchor, filterPrefsHydrated]);

  const range = useMemo(() => getRange(anchor, filterMode), [anchor, filterMode]);

  const filtered = useMemo(() => {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    return allTransactions.filter((tx) => {
      const t = tx.date.getTime();
      return t >= startMs && t < endMs;
    });
  }, [allTransactions, range]);

  const totalExpense = filtered
    .filter((t) => t.type === "expense" && !t.isExcluded)
    .reduce((s, t) => s + t.actualAmount, 0);
  const totalIncome = filtered
    .filter((t) => t.type === "income" && !t.isExcluded)
    .reduce((s, t) => s + t.actualAmount, 0);
  const totalBalance = totalIncome - totalExpense;

  const sections = groupByDate(filtered);
  const pendingCount = pendingTransactions.length;

  const goPrev = useCallback(() => {
    setAnchor((a) => navigateAnchor(a, filterMode, -1));
  }, [filterMode]);

  const goNext = useCallback(() => {
    setAnchor((a) => navigateAnchor(a, filterMode, 1));
  }, [filterMode]);

  const label = formatLabel(anchor, filterMode);

  const handleDeleteTransaction = useCallback(
    (item: Transaction) => {
      Alert.alert(
        "Delete transaction",
        "Remove this transaction permanently?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const { deleteTransaction } = await import("@/db/queries/transactions");
              await deleteTransaction(item.id);
              await refreshAllTransactions();
            },
          },
        ],
      );
    },
    [refreshAllTransactions],
  );

  const filterOptions: { mode: FilterMode; label: string }[] = [
    { mode: "day", label: "Daily" },
    { mode: "week", label: "Weekly" },
    { mode: "month", label: "Monthly" },
    { mode: "year", label: "Yearly" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <MaterialIcons name="menu" size={26} color={AppColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>TrackMoney</ThemedText>
        <MaterialIcons name="search" size={26} color={AppColors.text} />
      </View>

      {/* Date Navigator + Filter */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={goPrev}>
          <MaterialIcons name="chevron-left" size={30} color={AppColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.navLabel}>{label}</ThemedText>
        <TouchableOpacity onPress={goNext}>
          <MaterialIcons name="chevron-right" size={30} color={AppColors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowFilterMenu(true)} style={styles.filterBtn}>
          <MaterialIcons name="tune" size={22} color={AppColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>EXPENSE</ThemedText>
          <ThemedText style={[styles.summaryValue, { color: AppColors.expense }]}>
            {formatMoneyINR(totalExpense)}
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>INCOME</ThemedText>
          <ThemedText style={[styles.summaryValue, { color: AppColors.income }]}>
            {formatMoneyINR(totalIncome)}
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>TOTAL</ThemedText>
          <ThemedText style={styles.summaryValue}>{formatMoneyINR(totalBalance)}</ThemedText>
        </View>
      </View>

      {/* Pending Review Banner */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={() => {}}>
          <MaterialIcons name="info-outline" size={18} color={AppColors.primary} />
          <ThemedText style={styles.pendingText}>
            {pendingCount} transaction{pendingCount > 1 ? "s" : ""} need review
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* Transaction List */}
      {loadingAllTransactions ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>No transactions for this period</ThemedText>
          <ThemedText style={styles.mutedText}>Tap + to add your first transaction</ThemedText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <ThemedText style={styles.dateHeader}>{section.title}</ThemedText>
          )}
          renderItem={({ item }) => {
            const icon = getCategoryIcon(item.categoryId, categories);
            const catName = getCategoryLabel(item.categoryId, categories);
            const isExpense = item.type === "expense";
            const isIncome = item.type === "income";
            const isTransfer = item.type === "transfer";
            const amountColor = isExpense
              ? AppColors.expense
              : isIncome
                ? AppColors.income
                : AppColors.textSecondary;
            const sign = isExpense ? "-" : isIncome ? "+" : "";

            return (
              <View style={styles.txRow}>
                <TouchableOpacity
                  style={styles.txRowMain}
                  onPress={() => router.push(`/transaction/${item.id}`)}>
                  <View style={styles.txIcon}>
                    <ThemedText style={styles.txIconText}>
                      {isTransfer ? "🔄" : icon}
                    </ThemedText>
                  </View>
                  <View style={styles.txInfo}>
                    <ThemedText style={styles.txCategory} numberOfLines={1}>
                      {isTransfer ? "Transfer" : item.merchant || catName}
                    </ThemedText>
                    <ThemedText style={styles.txAccount} numberOfLines={1}>
                      {isTransfer ? "Account transfer" : catName}
                      {item.isShared ? " · Shared" : ""}
                      {item.isExcluded && !isTransfer ? " · Excluded" : ""}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.txAmount, { color: amountColor }]}>
                    {sign}{formatMoneyINR(item.actualAmount)}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.txDeleteBtn}
                  onPress={() => handleDeleteTransaction(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="delete-outline" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/transaction/new")}>
        <MaterialIcons name="add" size={28} color={AppColors.white} />
      </TouchableOpacity>

      {/* Filter Mode Modal */}
      <Modal
        visible={showFilterMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterMenu(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}>
          <View style={styles.filterModal} onStartShouldSetResponder={() => true}>
            <ThemedText style={styles.filterTitle}>View by</ThemedText>
            {filterOptions.map((opt) => {
              const active = filterMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[styles.filterOption, active && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterMode(opt.mode);
                    setShowFilterMenu(false);
                  }}>
                  {active && (
                    <MaterialIcons name="check" size={18} color={AppColors.primary} />
                  )}
                  <ThemedText
                    style={[
                      styles.filterOptionText,
                      active && styles.filterOptionTextActive,
                    ]}>
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.text,
    fontStyle: "italic",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 10,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.text,
    minWidth: 140,
    textAlign: "center",
  },
  filterBtn: {
    marginLeft: 4,
    padding: 4,
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
    color: AppColors.text,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AppColors.primaryLight,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.primary,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
  mutedText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.text,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 4,
  },
  txRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  txDeleteBtn: {
    padding: 6,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppColors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  txIconText: {
    fontSize: 20,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.text,
  },
  txAccount: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.fab,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModal: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    padding: 20,
    width: 240,
    gap: 6,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterOptionActive: {
    backgroundColor: AppColors.primaryLight,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.text,
  },
  filterOptionTextActive: {
    color: AppColors.primary,
  },
});
