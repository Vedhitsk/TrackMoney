import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";

import { DonutChart } from "@/components/donut-chart";
import {
  AmountText,
  CashFlowLineChart,
  Card,
  DonutLegend,
  InsightCard,
  SectionLabel,
  SegmentedControl,
} from "@/components/ui";
import { useTransactionStore } from "@/store/useTransactionStore";
import { formatMoneyINR } from "@/types";

type PeriodMode = "week" | "month" | "year";

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getRange(anchor: Date, mode: PeriodMode): { start: Date; end: Date } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();

  switch (mode) {
    case "week": {
      const s = startOfWeek(anchor);
      return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7) };
    }
    case "month":
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case "year":
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
}

function previousAnchor(anchor: Date, mode: PeriodMode): Date {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();

  switch (mode) {
    case "week":
      return new Date(y, m, d - 7);
    case "month":
      return new Date(y, m - 1, 1);
    case "year":
      return new Date(y - 1, 0, 1);
  }
}

function periodLabel(anchor: Date, mode: PeriodMode): string {
  switch (mode) {
    case "week": {
      const s = startOfWeek(anchor);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
      const fmt = (dt: Date) => dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return `${fmt(s)} - ${fmt(e)}`;
    }
    case "month":
      return anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" }).toUpperCase();
    case "year":
      return String(anchor.getFullYear());
  }
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const {
    categories,
    loadCategories,
    pendingTransactions,
    refreshPendingTransactions,
    allTransactions,
    refreshAllTransactions,
  } = useTransactionStore(
    useShallow((state) => ({
      categories: state.categories,
      loadCategories: state.loadCategories,
      pendingTransactions: state.pendingTransactions,
      refreshPendingTransactions: state.refreshPendingTransactions,
      allTransactions: state.allTransactions,
      refreshAllTransactions: state.refreshAllTransactions,
    })),
  );

  const [mode, setMode] = useState<PeriodMode>("month");
  const anchor = useMemo(() => new Date(), []);

  useEffect(() => {
    void loadCategories();
    void refreshAllTransactions();
    void refreshPendingTransactions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAllTransactions();
      void refreshPendingTransactions();
    }, [refreshAllTransactions, refreshPendingTransactions]),
  );

  const range = useMemo(() => getRange(anchor, mode), [anchor, mode]);
  const prevRange = useMemo(() => getRange(previousAnchor(anchor, mode), mode), [anchor, mode]);

  const inRange = useCallback(
    (start: Date, end: Date) =>
      allTransactions.filter((tx) => {
        if (tx.isExcluded) return false;
        const t = tx.date.getTime();
        return t >= start.getTime() && t < end.getTime();
      }),
    [allTransactions],
  );

  const current = useMemo(() => inRange(range.start, range.end), [inRange, range]);
  const previous = useMemo(() => inRange(prevRange.start, prevRange.end), [inRange, prevRange]);

  const sum = (txns: typeof current, type: "expense" | "income") =>
    txns.filter((t) => t.type === type).reduce((s, t) => s + t.actualAmount, 0);

  const totalExpense = sum(current, "expense");
  const totalIncome = sum(current, "income");
  const net = totalIncome - totalExpense;

  const prevNet = sum(previous, "income") - sum(previous, "expense");
  const trendPct = prevNet !== 0 ? ((net - prevNet) / Math.abs(prevNet)) * 100 : net !== 0 ? 100 : 0;

  // Cash flow line: cumulative net across buckets within the period.
  const chartPoints = useMemo(() => {
    const bucketCount = mode === "year" ? 12 : mode === "week" ? 7 : new Date(range.end.getTime() - 86400000).getDate();
    const buckets = new Array(bucketCount).fill(0);
    for (const tx of current) {
      const idx = mode === "year" ? tx.date.getMonth() : Math.floor((tx.date.getTime() - range.start.getTime()) / 86400000);
      if (idx < 0 || idx >= bucketCount) continue;
      buckets[idx] += tx.type === "income" ? tx.actualAmount : tx.type === "expense" ? -tx.actualAmount : 0;
    }
    let running = 0;
    return buckets.map((v, i) => {
      running += v;
      const label = mode === "year"
        ? new Date(range.start.getFullYear(), i, 1).toLocaleDateString("en-IN", { month: "short" })
        : String(i + 1);
      return { label, value: running };
    });
  }, [current, mode, range]);

  const lastPoint = chartPoints[chartPoints.length - 1];
  const calloutLabel = lastPoint
    ? `${mode === "year" ? lastPoint.label : `Day ${lastPoint.label}`} · ${formatMoneyINR(lastPoint.value)}`
    : undefined;

  const donutData = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const tx of current) {
      if (tx.type !== "expense") continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.actualAmount);
    }
    const palette = theme.chartPalette;
    return Array.from(map.entries())
      .map(([catId, amount], i) => {
        const cat = catId != null ? categories.find((c) => c.id === catId) : null;
        return {
          label: cat?.name ?? "Everything else",
          value: amount,
          color: cat?.color ?? palette[palette.length - 1],
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [current, categories, theme.chartPalette]);

  const pendingCount = pendingTransactions.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>TrackMoney</Text>

      <SectionLabel style={styles.heroLabel}>
        NET CASH FLOW · {periodLabel(anchor, mode)}
      </SectionLabel>
      <View style={styles.heroRow}>
        <Text style={[styles.heroValue, { color: theme.text }]}>{formatMoneyINR(net)}</Text>
        {trendPct !== 0 && (
          <View
            style={[
              styles.trendChip,
              { backgroundColor: trendPct >= 0 ? `${theme.income}22` : `${theme.expense}22` },
            ]}
          >
            <Text style={{ color: trendPct >= 0 ? theme.income : theme.expense, fontSize: 12, fontWeight: "700" }}>
              {trendPct >= 0 ? "▲" : "▼"} {Math.abs(trendPct).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chartWrap}>
        <CashFlowLineChart data={chartPoints} height={150} calloutLabel={calloutLabel} />
      </View>

      <SegmentedControl
        style={styles.segment}
        value={mode}
        onChange={setMode}
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
        ]}
      />

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <SectionLabel>In · {mode}</SectionLabel>
          <AmountText amount={totalIncome} type="income" showSign={false} style={styles.summaryValue} />
        </Card>
        <Card style={styles.summaryCard}>
          <SectionLabel>Out · {mode}</SectionLabel>
          <AmountText amount={totalExpense} type="expense" showSign={false} style={styles.summaryValue} />
        </Card>
      </View>

      {pendingCount > 0 && (
        <InsightCard
          style={styles.insight}
          message={`${pendingCount} transaction${pendingCount > 1 ? "s" : ""} need review`}
          actionLabel="Review"
          onPress={() => router.push("/transaction/pending")}
          onAction={() => router.push("/transaction/pending")}
        />
      )}

      {donutData.length > 0 && (
        <Card style={styles.donutCard}>
          <SectionLabel style={styles.donutLabel}>Spending breakdown</SectionLabel>
          <View style={styles.donutRow}>
            <DonutChart
              data={donutData}
              size={150}
              strokeWidth={22}
              centerLabel={formatMoneyINR(totalExpense)}
              centerSub="Spent"
            />
            <View style={styles.legendWrap}>
              <DonutLegend data={donutData} showAmount={false} />
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  headerTitle: {
    ...Typography.title,
    color: theme.text,
    marginBottom: Spacing.lg,
  },
  heroLabel: {
    marginBottom: Spacing.xs,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroValue: {
    ...Typography.hero,
  },
  trendChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chartWrap: {
    marginTop: Spacing.lg,
  },
  segment: {
    marginTop: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    gap: 6,
  },
  summaryValue: {
    fontSize: 18,
  },
  insight: {
    marginTop: Spacing.lg,
  },
  donutCard: {
    marginTop: Spacing.lg,
  },
  donutLabel: {
    marginBottom: Spacing.md,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  legendWrap: {
    flex: 1,
  },
});
