import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, SectionList, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useTransactionStore } from "@/store/useTransactionStore";
import { formatMoneyINR, Transaction } from "@/types";
import { LogDetailsModal } from "@/components/log-details-modal";
import { DonutChart } from "@/components/donut-chart";

type SortOption = "new_to_old" | "old_to_new" | "only_expenses" | "only_income";
const SORT_OPTIONS: SortOption[] = ["new_to_old", "old_to_new", "only_expenses", "only_income"];

export default function CategoryDetailsScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const { categoryId, year, month } = useLocalSearchParams();
  const { categories, accounts, loadAccounts, allTransactions } = useTransactionStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortIndex, setSortIndex] = useState(0);
  const [selectedLog, setSelectedLog] = useState<Transaction | null>(null);

  const catId = Number(categoryId);
  const yr = Number(year);
  const mn = Number(month);

  const category = categories.find((c) => c.id === catId);

  const loadData = async () => {
    try {
      const { getCategoryTransactions } = await import("@/db/queries/transactions");
      const data = await getCategoryTransactions(catId, yr, mn);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    void loadAccounts();
  }, [catId, yr, mn]);

  const globalExpense = useMemo(() => {
    return allTransactions.reduce((sum, t) => {
      if (t.type === "expense" && t.date.getFullYear() === yr && t.date.getMonth() === mn) {
        return sum + t.rawAmount;
      }
      return sum;
    }, 0);
  }, [allTransactions, yr, mn]);

  const globalIncome = useMemo(() => {
    return allTransactions.reduce((sum, t) => {
      if (t.type === "income" && t.date.getFullYear() === yr && t.date.getMonth() === mn) {
        return sum + t.rawAmount;
      }
      return sum;
    }, 0);
  }, [allTransactions, yr, mn]);

  const categoryExpense = useMemo(() => transactions.reduce((sum, t) => sum + (t.type === "expense" ? t.rawAmount : 0), 0), [transactions]);
  const categoryIncome = useMemo(() => transactions.reduce((sum, t) => sum + (t.type === "income" ? t.rawAmount : 0), 0), [transactions]);

  const expensePct = globalExpense > 0 ? (categoryExpense / globalExpense) * 100 : 0;
  const incomePct = globalIncome > 0 ? (categoryIncome / globalIncome) * 100 : 0;

  const expenseChartData = [
    { label: category?.name ?? "", value: categoryExpense, color: theme.expense },
    { label: "Other", value: Math.max(0, globalExpense - categoryExpense), color: theme.borderLight }
  ];

  const incomeChartData = [
    { label: category?.name ?? "", value: categoryIncome, color: theme.income },
    { label: "Other", value: Math.max(0, globalIncome - categoryIncome), color: theme.borderLight }
  ];

  const sortOrder = SORT_OPTIONS[sortIndex];

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (sortOrder === "only_expenses") filtered = transactions.filter(t => t.type === "expense");
    if (sortOrder === "only_income") filtered = transactions.filter(t => t.type === "income");
    return filtered;
  }, [transactions, sortOrder]);

  const sections = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    for (const t of filteredTransactions) {
      const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "long" });
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, []);
      }
      grouped.get(dateStr)!.push(t);
    }
    const result = Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
    if (sortOrder === "old_to_new") {
      result.reverse();
      result.forEach(s => s.data.reverse());
    }
    return result;
  }, [filteredTransactions, sortOrder]);

  if (!category) return null;

  const timeLabel = new Date(yr, mn, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const netAmount = categoryIncome - categoryExpense;

  const sortLabels: Record<SortOption, string> = {
    new_to_old: "NEW TO OLD",
    old_to_new: "OLD TO NEW",
    only_expenses: "ONLY EXPENSES",
    only_income: "ONLY INCOME"
  };

  const handleToggleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <MaterialIcons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.appBarCenter}>
          <View style={styles.appBarTitleRow}>
            <View style={[styles.appBarIconWrap, { backgroundColor: category.color }]}>
              <Text style={styles.appBarIcon}>{category.icon}</Text>
            </View>
            {/* By passing style={{ color: theme.text }} instead of dark/lightColor, we lock it to dark text on light bg */}
            <Text style={[styles.appBarTitle, { color: theme.text }]}>{category.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{timeLabel}</Text>
        <View style={styles.chartRow}>
          <View style={styles.chartCol}>
            <DonutChart data={expenseChartData} size={130} strokeWidth={16} centerLabel={`${expensePct.toFixed(0)}%`} centerSub="Expenses" centerTextColor={theme.text} />
          </View>
          <View style={styles.chartCol}>
            <DonutChart data={incomeChartData} size={130} strokeWidth={16} centerLabel={`${incomePct.toFixed(0)}%`} centerSub="Income" centerTextColor={theme.text} />
          </View>
        </View>
        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>
            Total Amount: <Text style={{ color: netAmount >= 0 ? theme.income : theme.expense, fontWeight: "600", fontSize: 16 }}>{netAmount >= 0 ? "+" : "-"}{formatMoneyINR(Math.abs(netAmount))}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.recordCount}>{filteredTransactions.length} records</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={handleToggleSort}>
          <MaterialIcons name="sort" size={18} color={theme.textSecondary} />
          <Text style={styles.sortText}>{sortLabels[sortOrder]}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const acc = accounts.find((a) => a.id === item.accountId);
            const isExpense = item.type === "expense";
            return (
              <TouchableOpacity style={styles.logItem} onPress={() => setSelectedLog(item)}>
                <View style={styles.logLeft}>
                  <View style={styles.logDot} />
                  <View>
                    <Text style={[styles.logAccount, { color: theme.text }]}>{acc?.name}</Text>
                    {item.isShared && item.actualAmount !== item.rawAmount && (
                       <Text style={styles.logSharedSub}>My share: {isExpense ? "-" : "+"}{formatMoneyINR(item.actualAmount)}</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.logAmount, { color: isExpense ? theme.expense : theme.income }]}>
                  {isExpense ? "-" : "+"}{formatMoneyINR(item.rawAmount)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <LogDetailsModal
        visible={!!selectedLog}
        transaction={selectedLog}
        onClose={() => setSelectedLog(null)}
        onDeleteSuccess={loadData}
      />
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    marginRight: 16,
    zIndex: 10,
  },
  appBarCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 50,
    bottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appBarIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  appBarIcon: {
    fontSize: 16,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  chartCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border, 
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    marginTop: 24,
  },
  chartTitle: {
    color: theme.text,
    textAlign: "center",
    paddingTop: 16,
    paddingBottom: 16,
    fontWeight: "500",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 24,
  },
  chartCol: {
    alignItems: "center",
  },
  chartFooter: {
    backgroundColor: theme.background,
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  chartFooterText: {
    color: theme.text,
    fontWeight: "500",
    fontSize: 15,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recordCount: {
    fontWeight: "600",
    color: theme.textSecondary,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 13,
    color: theme.textSecondary,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  logLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.textSecondary,
  },
  logAccount: {
    fontSize: 15,
  },
  logSharedSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  logAmount: {
    fontSize: 15,
    fontWeight: "500",
  },
});
