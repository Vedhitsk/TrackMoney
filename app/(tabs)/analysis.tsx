import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { DonutChart } from "@/components/donut-chart";
import { useTransactionStore } from "@/store/useTransactionStore";

import { formatMoneyINR } from "@/types";

type ViewType = "expense" | "income";

export default function AnalysisScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const { categories, loadCategories, allTransactions, refreshAllTransactions } =
    useTransactionStore();

  const router = useRouter();

  const [anchor, setAnchor] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("expense");

  useEffect(() => {
    void loadCategories();
    void refreshAllTransactions();
  }, []);

  // Re-fetch when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      void refreshAllTransactions();
    }, [refreshAllTransactions]),
  );

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const prevMonth = useCallback(() => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);
  const nextMonth = useCallback(() => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const monthLabel = anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const filtered = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (tx.isExcluded) return false;
      if (tx.type !== viewType) return false;
      return tx.date.getFullYear() === year && tx.date.getMonth() === month;
    });
  }, [allTransactions, year, month, viewType]);

  const total = filtered.reduce((s, t) => s + t.actualAmount, 0);

  const byCat = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const tx of filtered) {
      const key = tx.categoryId;
      map.set(key, (map.get(key) ?? 0) + tx.actualAmount);
    }
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = catId != null ? categories.find((c) => c.id === catId) : null;
        return {
          categoryId: catId,
          name: cat?.name ?? "Uncategorized",
          icon: cat?.icon ?? "💰",
          color: cat?.color ?? "#999999",
          amount,
          pct: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, categories, total]);

  const chartData = byCat.map((c) => ({
    value: c.amount,
    color: c.color,
    label: c.name,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Analysis</ThemedText>
      </View>

      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth}>
          <MaterialIcons name="chevron-left" size={30} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
        <TouchableOpacity onPress={nextMonth}>
          <MaterialIcons name="chevron-right" size={30} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        {(["expense", "income"] as ViewType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, viewType === t && styles.toggleBtnActive]}
            onPress={() => setViewType(t)}>
            <ThemedText
              style={[styles.toggleText, viewType === t && styles.toggleTextActive]}>
              {t === "expense" ? "EXPENSE" : "INCOME"}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Donut Chart */}
        <View style={styles.chartWrap}>
          <DonutChart
            data={chartData}
            size={200}
            strokeWidth={28}
            centerLabel={formatMoneyINR(total)}
            centerSub={viewType === "expense" ? "Total Expense" : "Total Income"}
          />
        </View>

        {/* Category Breakdown */}
        {byCat.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ThemedText style={styles.emptyText}>
              No {viewType} transactions this month
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={byCat}
            scrollEnabled={false}
            keyExtractor={(item) => String(item.categoryId ?? "none")}
            contentContainerStyle={styles.catList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.catRow} onPress={() => router.push(`/category-details?categoryId=${item.categoryId}&year=${year}&month=${month}`)}>
                <View style={[styles.catDot, { backgroundColor: item.color }]} />
                <ThemedText style={styles.catIcon}>{item.icon}</ThemedText>
                <View style={styles.catInfo}>
                  <ThemedText style={styles.catName}>{item.name}</ThemedText>
                  <View style={styles.catBarBg}>
                    <View
                      style={[
                        styles.catBar,
                        { width: `${item.pct}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.catRight}>
                  <ThemedText style={styles.catAmount}>
                    {formatMoneyINR(item.amount)}
                  </ThemedText>
                  <ThemedText style={styles.catPct}>{item.pct.toFixed(1)}%</ThemedText>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 48,
  },
  header: {
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 12,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    minWidth: 140,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: theme.surface,
  },
  toggleBtnActive: {
    backgroundColor: theme.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  toggleTextActive: {
    color: theme.white,
  },
  scroll: {
    paddingBottom: 30,
  },
  chartWrap: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  catList: {
    paddingHorizontal: 16,
    gap: 4,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catIcon: {
    fontSize: 20,
  },
  catInfo: {
    flex: 1,
    gap: 4,
  },
  catName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  catBarBg: {
    height: 4,
    backgroundColor: theme.borderLight,
    borderRadius: 2,
  },
  catBar: {
    height: 4,
    borderRadius: 2,
  },
  catRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
  catPct: {
    fontSize: 11,
    color: theme.textSecondary,
  },
});
