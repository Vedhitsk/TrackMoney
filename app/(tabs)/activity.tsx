import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    Modal,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { AmountText, Chip, InsightCard, ListRow, SectionLabel } from "@/components/ui";

import {
    loadRecordsFilterPrefs,
    saveRecordsFilterPrefs,
} from "@/lib/recordsFilterPrefs";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useShallow } from "zustand/react/shallow";
import type { Transaction } from "@/types";
import { SMS_TRANSACTION_EVENT } from "@/lib/sms/smsIngestion";

type FilterMode = "day" | "week" | "month" | "year";
type TypeFilter = "all" | "expense" | "income" | "transfer";

function getCategoryLabel(categoryId: number | null, categories: { id: number; name: string }[]) {
  if (!categoryId) return "Uncategorized";
  return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
}

function getCategoryIcon(categoryId: number | null, categories: { id: number; icon: string }[]) {
  if (!categoryId) return "💰";
  return categories.find((c) => c.id === categoryId)?.icon ?? "💰";
}

function getCategoryColor(categoryId: number | null, categories: { id: number; color: string }[]) {
  if (!categoryId) return undefined;
  return categories.find((c) => c.id === categoryId)?.color;
}

function getAccountLabel(accountId: number | null, accounts: { id: number; name: string }[]) {
  if (!accountId) return "No Account";
  return accounts.find((a) => a.id === accountId)?.name ?? "No Account";
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

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expense", label: "Expenses" },
  { key: "income", label: "Income" },
  { key: "transfer", label: "Transfers" },
];

export default function ActivityScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const {
    categories,
    loadCategories,
    accounts,
    loadAccounts,
    pendingTransactions,
    refreshPendingTransactions,
    allTransactions,
    refreshAllTransactions,
    loadingAllTransactions,
  } = useTransactionStore(
    useShallow((state) => ({
      categories: state.categories,
      loadCategories: state.loadCategories,
      accounts: state.accounts,
      loadAccounts: state.loadAccounts,
      pendingTransactions: state.pendingTransactions,
      refreshPendingTransactions: state.refreshPendingTransactions,
      allTransactions: state.allTransactions,
      refreshAllTransactions: state.refreshAllTransactions,
      loadingAllTransactions: state.loadingAllTransactions,
    }))
  );

  const [anchor, setAnchor] = useState(new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterPrefsHydrated, setFilterPrefsHydrated] = useState(false);

  useEffect(() => {
    void loadCategories();
    void loadAccounts();
    void refreshPendingTransactions();
    void refreshAllTransactions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPendingTransactions();
      void refreshAllTransactions();
    }, [refreshPendingTransactions, refreshAllTransactions]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SMS_TRANSACTION_EVENT, () => {
      void refreshPendingTransactions();
    });
    return () => sub.remove();
  }, [refreshPendingTransactions]);

  useEffect(() => {
    void (async () => {
      const prefs = await loadRecordsFilterPrefs();
      if (prefs) {
        setFilterMode(prefs.filterMode);
      }
      setFilterPrefsHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!filterPrefsHydrated) return;
    void saveRecordsFilterPrefs(filterMode, anchor);
  }, [filterMode, anchor, filterPrefsHydrated]);

  const range = useMemo(() => getRange(anchor, filterMode), [anchor, filterMode]);

  const inRange = useMemo(() => {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    return allTransactions.filter((tx) => {
      const t = tx.date.getTime();
      return t >= startMs && t < endMs;
    });
  }, [allTransactions, range]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inRange.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (!q) return true;
      const catName = getCategoryLabel(tx.categoryId, categories).toLowerCase();
      const haystack = `${tx.merchant} ${tx.notes} ${catName} ${tx.actualAmount}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [inRange, typeFilter, search, categories]);

  const sections = groupByDate(filtered);
  const pendingCount = pendingTransactions.length;

  const goPrev = useCallback(() => setAnchor((a) => navigateAnchor(a, filterMode, -1)), [filterMode]);
  const goNext = useCallback(() => setAnchor((a) => navigateAnchor(a, filterMode, 1)), [filterMode]);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerCount}>{filtered.length} of {inRange.length}</Text>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-left" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.navLabel}>{label}</Text>
        <TouchableOpacity onPress={goNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-right" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowFilterMenu(true)} style={styles.filterBtn}>
          <MaterialIcons name="tune" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search merchants, notes, amounts"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <View style={styles.chipsRow}>
        {TYPE_FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={typeFilter === f.key}
            onPress={() => setTypeFilter(f.key)}
          />
        ))}
      </View>

      {pendingCount > 0 && (
        <View style={styles.insightWrap}>
          <InsightCard
            message={`${pendingCount} transaction${pendingCount > 1 ? "s" : ""} need review`}
            actionLabel="Review"
            onPress={() => router.push("/transaction/pending")}
            onAction={() => router.push("/transaction/pending")}
          />
        </View>
      )}

      {loadingAllTransactions ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No transactions found</Text>
          <Text style={styles.mutedText}>Tap the + button to add one</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <SectionLabel style={styles.dateHeader}>{section.title}</SectionLabel>
          )}
          renderItem={({ item }) => {
            const icon = getCategoryIcon(item.categoryId, categories);
            const catName = getCategoryLabel(item.categoryId, categories);
            const catColor = getCategoryColor(item.categoryId, categories);
            const accountName = getAccountLabel(item.accountId, accounts);
            const isTransfer = item.type === "transfer";
            const isExpense = item.type === "expense";
            const isIncome = item.type === "income";
            const title = isTransfer ? "Transfer" : (item.merchant?.trim() || catName);
            const subtitleParts = [isTransfer ? "Account transfer" : `${catName} · ${accountName}`];
            if (item.isShared) subtitleParts.push("Shared");
            if (item.type === "settlement") subtitleParts.push("Settled");
            else if (item.isExcluded && !isTransfer) subtitleParts.push("Excluded");

            return (
              <ListRow
                emoji={isTransfer ? "🔄" : icon}
                iconColor={catColor}
                title={title}
                subtitle={subtitleParts.join(" · ")}
                trailing={
                  <AmountText
                    amount={item.actualAmount}
                    type={isExpense ? "expense" : isIncome ? "income" : "neutral"}
                  />
                }
                onPress={() => router.push(`/transaction/${item.id}`)}
                onLongPress={() => handleDeleteTransaction(item)}
              />
            );
          }}
        />
      )}

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
            <Text style={styles.filterTitle}>View by</Text>
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
                  {active && <MaterialIcons name="check" size={18} color={theme.primary} />}
                  <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.title,
    color: theme.text,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 10,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textSecondary,
    minWidth: 130,
    textAlign: "center",
  },
  filterBtn: {
    marginLeft: 4,
    padding: 4,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  insightWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
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
    color: theme.textSecondary,
  },
  mutedText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  dateHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModal: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: Radius.lg,
    padding: 20,
    width: 240,
    gap: 6,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  filterOptionActive: {
    backgroundColor: theme.primaryLight,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  filterOptionTextActive: {
    color: theme.primary,
  },
});
