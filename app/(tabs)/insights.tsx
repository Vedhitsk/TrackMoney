import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";

import { DonutChart } from "@/components/donut-chart";
import {
  BarChart,
  Card,
  Chip,
  DonutLegend,
  IconTile,
  InsightCard,
  ProgressBar,
  SectionLabel,
  SegmentedControl,
} from "@/components/ui";
import { useTransactionStore } from "@/store/useTransactionStore";
import { showAppAlert } from "@/store/useAlertStore";
import { formatMoneyINR } from "@/types";
import type { BudgetWithCategory } from "@/db/queries/budgets";

type Pane = "analysis" | "budgets";
type ViewType = "expense" | "income";

const SMALL_SPEND_THRESHOLD = 100;

function monthKey(y: number, m: number) {
  return `${y}-${m}`;
}

export default function InsightsScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const { categories, loadCategories, allTransactions, refreshAllTransactions } = useTransactionStore();

  const [pane, setPane] = useState<Pane>("analysis");
  const [anchor, setAnchor] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("expense");

  useEffect(() => {
    void loadCategories();
    void refreshAllTransactions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAllTransactions();
    }, [refreshAllTransactions]),
  );

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const prevMonth = useCallback(() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)), []);
  const nextMonth = useCallback(() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)), []);
  const monthLabel = anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // ---- Analysis pane ----

  const filtered = useMemo(
    () =>
      allTransactions.filter(
        (tx) => !tx.isExcluded && tx.type === viewType && tx.date.getFullYear() === year && tx.date.getMonth() === month,
      ),
    [allTransactions, year, month, viewType],
  );

  const total = filtered.reduce((s, t) => s + t.actualAmount, 0);

  const prevFiltered = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return allTransactions.filter(
      (tx) =>
        !tx.isExcluded &&
        tx.type === viewType &&
        tx.date.getFullYear() === d.getFullYear() &&
        tx.date.getMonth() === d.getMonth(),
    );
  }, [allTransactions, year, month, viewType]);

  const byCat = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const tx of filtered) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.actualAmount);
    const prevMap = new Map<number | null, number>();
    for (const tx of prevFiltered) prevMap.set(tx.categoryId, (prevMap.get(tx.categoryId) ?? 0) + tx.actualAmount);

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = catId != null ? categories.find((c) => c.id === catId) : null;
        const prevAmount = prevMap.get(catId) ?? 0;
        const pctChange = prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : amount > 0 ? 100 : 0;
        return {
          categoryId: catId,
          name: cat?.name ?? "Uncategorized",
          icon: cat?.icon ?? "💰",
          color: cat?.color ?? theme.chartPalette[theme.chartPalette.length - 1],
          amount,
          pct: total > 0 ? (amount / total) * 100 : 0,
          pctChange,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, prevFiltered, categories, total, theme.chartPalette]);

  const chartData = byCat.map((c) => ({ value: c.amount, color: c.color, label: c.name }));

  // Last 12 months expense trend (independent of the month navigator).
  const twelveMonthData = useMemo(() => {
    const now = new Date();
    const points: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = allTransactions
        .filter(
          (tx) =>
            !tx.isExcluded &&
            tx.type === "expense" &&
            tx.date.getFullYear() === d.getFullYear() &&
            tx.date.getMonth() === d.getMonth(),
        )
        .reduce((s, t) => s + t.actualAmount, 0);
      points.push({ label: d.toLocaleDateString("en-IN", { month: "narrow" }), value });
    }
    return points;
  }, [allTransactions]);

  const twelveMonthTotal = twelveMonthData[twelveMonthData.length - 1]?.value ?? 0;
  const twelveMonthPrev = twelveMonthData[twelveMonthData.length - 2]?.value ?? 0;
  const twelveMonthPct = twelveMonthPrev > 0 ? ((twelveMonthTotal - twelveMonthPrev) / twelveMonthPrev) * 100 : 0;

  const priciestDay = useMemo(() => {
    const totals = new Map<number, number>();
    for (const tx of filtered) {
      const day = tx.date.getDay();
      totals.set(day, (totals.get(day) ?? 0) + tx.actualAmount);
    }
    if (totals.size === 0) return null;
    const entries = Array.from(totals.entries());
    const [topDay, topTotal] = entries.sort((a, b) => b[1] - a[1])[0];
    const others = entries.filter(([d]) => d !== topDay).map(([, v]) => v);
    const avgOthers = others.length > 0 ? others.reduce((s, v) => s + v, 0) / others.length : 0;
    const ratio = avgOthers > 0 ? topTotal / avgOthers : 0;
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return { name: names[topDay], ratio };
  }, [filtered]);

  const smallSpends = useMemo(() => {
    const small = filtered.filter((t) => t.actualAmount < SMALL_SPEND_THRESHOLD);
    return { total: small.reduce((s, t) => s + t.actualAmount, 0), count: small.length };
  }, [filtered]);

  // ---- Budgets pane ----

  const [budgetsData, setBudgetsData] = useState<BudgetWithCategory[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [limitStr, setLimitStr] = useState("");

  const budgetMonth = month + 1;

  const loadBudgets = useCallback(async () => {
    const { listBudgetsForMonth } = await import("@/db/queries/budgets");
    setLoadingBudgets(true);
    try {
      setBudgetsData(await listBudgetsForMonth(year, budgetMonth));
    } finally {
      setLoadingBudgets(false);
    }
  }, [year, budgetMonth]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  useFocusEffect(
    useCallback(() => {
      void loadBudgets();
    }, [loadBudgets]),
  );

  const prevMonthLabel = useMemo(() => {
    const d = new Date(year, budgetMonth - 2, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [year, budgetMonth]);

  const spentByCat = useMemo(() => {
    const startMs = new Date(year, budgetMonth - 1, 1).getTime();
    const endMs = new Date(year, budgetMonth, 1).getTime();
    const map = new Map<number, number>();
    for (const tx of allTransactions) {
      if (tx.type !== "expense" || tx.isExcluded || !tx.categoryId) continue;
      const t = tx.date.getTime();
      if (t >= startMs && t < endMs) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.actualAmount);
    }
    return map;
  }, [allTransactions, year, budgetMonth]);

  const totalBudget = budgetsData.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgetsData.reduce((s, b) => s + (spentByCat.get(b.categoryId) ?? 0), 0);
  const overBudgetCats = budgetsData.filter((b) => (spentByCat.get(b.categoryId) ?? 0) > b.monthlyLimit);

  const openAdd = () => {
    setEditBudgetId(null);
    setSelectedCatId(null);
    setLimitStr("");
    setShowForm(true);
  };

  const openEdit = (b: BudgetWithCategory) => {
    setEditBudgetId(b.id);
    setSelectedCatId(b.categoryId);
    setLimitStr(String(b.monthlyLimit));
    setShowForm(true);
  };

  const handleSaveBudget = async () => {
    if (!selectedCatId || !limitStr) return;
    const { upsertBudgetForMonth } = await import("@/db/queries/budgets");
    await upsertBudgetForMonth({
      categoryId: selectedCatId,
      year,
      month: budgetMonth,
      monthlyLimit: Number.parseFloat(limitStr) || 0,
    });
    setShowForm(false);
    setEditBudgetId(null);
    setSelectedCatId(null);
    setLimitStr("");
    await loadBudgets();
  };

  const handleDeleteBudget = (b: BudgetWithCategory) => {
    showAppAlert("Delete Budget", `Remove budget for "${b.categoryName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { deleteBudget } = await import("@/db/queries/budgets");
          await deleteBudget(b.id);
          await loadBudgets();
        },
      },
    ]);
  };

  const handleCopyFromPrevious = () => {
    showAppAlert(
      "Copy from Previous Month",
      `Copy all budgets from ${prevMonthLabel} to ${monthLabel}? This will replace current budgets.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: async () => {
            const { copyBudgetsFromPreviousMonth } = await import("@/db/queries/budgets");
            const count = await copyBudgetsFromPreviousMonth(year, budgetMonth);
            if (count === 0) showAppAlert("No budgets found", `${prevMonthLabel} has no budgets to copy.`);
            await loadBudgets();
          },
        },
      ],
    );
  };

  const existingCatIds = new Set(budgetsData.map((b) => b.categoryId));
  const catsForPicker = editBudgetId ? categories : categories.filter((c) => !existingCatIds.has(c.id));

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Insights</Text>

      <SegmentedControl
        style={styles.paneSwitch}
        value={pane}
        onChange={setPane}
        options={[
          { value: "analysis", label: "Analysis" },
          { value: "budgets", label: "Budgets" },
        ]}
      />

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-left" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-right" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {pane === "analysis" ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SegmentedControl
            value={viewType}
            onChange={setViewType}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />

          <Card style={styles.chartCard}>
            <View style={styles.donutRow}>
              <DonutChart
                data={chartData}
                size={140}
                strokeWidth={20}
                centerLabel={formatMoneyINR(total)}
                centerSub={viewType === "expense" ? "Spent" : "Received"}
              />
              <View style={styles.legendWrap}>
                <DonutLegend data={chartData} showAmount={false} />
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <SectionLabel>Spending · last 12 months</SectionLabel>
              {twelveMonthPct !== 0 && (
                <Text style={{ color: twelveMonthPct >= 0 ? theme.expense : theme.income, fontSize: 12, fontWeight: "700" }}>
                  {twelveMonthPct >= 0 ? "▲" : "▼"} {Math.abs(twelveMonthPct).toFixed(0)}%
                </Text>
              )}
            </View>
            <Text style={styles.sectionValue}>{formatMoneyINR(twelveMonthTotal)}</Text>
            <View style={styles.barChartWrap}>
              <BarChart data={twelveMonthData} height={110} />
            </View>
          </Card>

          {byCat.length > 0 && (
            <Card style={styles.section}>
              <SectionLabel style={styles.sectionTitleSpaced}>Category movement</SectionLabel>
              <View style={{ gap: Spacing.md }}>
                {byCat.map((c) => (
                  <TouchableOpacity
                    key={String(c.categoryId ?? "none")}
                    style={styles.movementRow}
                    onPress={() => router.push(`/category-details?categoryId=${c.categoryId}&year=${year}&month=${month}`)}
                  >
                    <Text style={styles.movementIcon}>{c.icon}</Text>
                    <View style={styles.movementInfo}>
                      <View style={styles.movementTop}>
                        <Text style={styles.movementName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.movementAmount}>{formatMoneyINR(c.amount)}</Text>
                        <Text
                          style={[
                            styles.movementPct,
                            { color: c.pctChange >= 0 ? theme.expense : theme.income },
                          ]}
                        >
                          {c.pctChange >= 0 ? "+" : ""}{c.pctChange.toFixed(0)}%
                        </Text>
                      </View>
                      <ProgressBar progress={c.pct / 100} color={c.color} />
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <SectionLabel>Priciest day</SectionLabel>
              <Text style={styles.statValue}>{priciestDay?.name ?? "—"}</Text>
              {priciestDay && priciestDay.ratio > 0 && (
                <Text style={styles.statSub}>{priciestDay.ratio.toFixed(1)}× an average day</Text>
              )}
            </Card>
            <Card style={styles.statCard}>
              <SectionLabel>Small spends</SectionLabel>
              <Text style={styles.statValue}>{formatMoneyINR(smallSpends.total)}</Text>
              <Text style={styles.statSub}>{smallSpends.count} under ₹{SMALL_SPEND_THRESHOLD}</Text>
            </Card>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.budgetPane}>
          <ScrollView style={styles.budgetScroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View>
                  <SectionLabel>Budget</SectionLabel>
                  <Text style={styles.summaryValue}>{formatMoneyINR(totalBudget)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <SectionLabel>Spent</SectionLabel>
                  <Text style={[styles.summaryValue, { color: totalSpent > totalBudget ? theme.expense : theme.income }]}>
                    {formatMoneyINR(totalSpent)}
                  </Text>
                </View>
              </View>
              <ProgressBar
                style={styles.totalBar}
                progress={totalBudget > 0 ? totalSpent / totalBudget : 0}
                color={totalSpent > totalBudget ? theme.progressRed : theme.progressGreen}
              />
              <Text style={styles.remainingText}>
                {totalBudget - totalSpent >= 0
                  ? `${formatMoneyINR(totalBudget - totalSpent)} remaining`
                  : `${formatMoneyINR(totalSpent - totalBudget)} over budget`}
              </Text>
            </Card>

            {overBudgetCats.length > 0 && (
              <InsightCard
                style={styles.section}
                tone="danger"
                message={`${overBudgetCats.length} categor${overBudgetCats.length > 1 ? "ies are" : "y is"} over budget: ${overBudgetCats
                  .map((b) => b.categoryName)
                  .join(", ")}`}
              />
            )}

            {loadingBudgets ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
            ) : budgetsData.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No budgets set for {monthLabel}</Text>
                <Text style={styles.mutedText}>Tap "Add budget" below to create one</Text>
              </View>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {budgetsData.map((item) => {
                  const spent = spentByCat.get(item.categoryId) ?? 0;
                  const pct = item.monthlyLimit > 0 ? spent / item.monthlyLimit : 0;
                  const isOver = spent > item.monthlyLimit;
                  return (
                    <Card key={item.id} noPadding>
                      <TouchableOpacity
                        style={styles.budgetCard}
                        onPress={() => router.push(`/category-details?categoryId=${item.categoryId}&year=${year}&month=${budgetMonth - 1}`)}
                      >
                        <View style={styles.budgetHeader}>
                          <IconTile emoji={item.categoryIcon} color={item.categoryColor} size={40} />
                          <View style={styles.budgetInfo}>
                            <Text style={styles.budgetName}>{item.categoryName}</Text>
                            <Text style={styles.budgetAmounts}>
                              <Text style={{ color: isOver ? theme.expense : theme.text, fontWeight: "700" }}>
                                {formatMoneyINR(spent)}
                              </Text>
                              {" / "}
                              {formatMoneyINR(item.monthlyLimit)}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MaterialIcons name="edit" size={17} color={theme.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteBudget(item)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ marginLeft: 4 }}
                          >
                            <MaterialIcons name="delete-outline" size={17} color={theme.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <ProgressBar
                          style={styles.budgetBar}
                          progress={pct}
                          color={isOver ? theme.progressRed : item.categoryColor}
                        />
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.budgetFooter}>
            <TouchableOpacity style={styles.footerSecondaryBtn} onPress={handleCopyFromPrevious}>
              <MaterialIcons name="content-copy" size={15} color={theme.textSecondary} />
              <Text style={styles.footerSecondaryBtnText}>Copy previous</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerPrimaryBtn} onPress={openAdd}>
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.footerPrimaryBtnText}>Add budget</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowForm(false)}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modal} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>{editBudgetId ? "Edit Budget" : "Add Budget"}</Text>

                <SectionLabel style={styles.fieldLabel}>Category</SectionLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {catsForPicker.map((cat) => (
                    <Chip
                      key={cat.id}
                      label={cat.name}
                      icon={cat.icon}
                      selected={selectedCatId === cat.id}
                      onPress={() => setSelectedCatId(cat.id)}
                    />
                  ))}
                </ScrollView>

                <SectionLabel style={styles.fieldLabel}>Monthly limit (INR)</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={limitStr}
                  onChangeText={setLimitStr}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={theme.textTertiary}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { ...Typography.title, color: theme.text, marginBottom: Spacing.md },
  paneSwitch: { marginBottom: Spacing.md },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: Spacing.md,
  },
  monthLabel: { fontSize: 14, fontWeight: "600", color: theme.textSecondary, minWidth: 140, textAlign: "center" },
  scroll: { gap: Spacing.md, paddingBottom: 100 },
  chartCard: { marginTop: Spacing.sm },
  donutRow: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
  legendWrap: { flex: 1 },
  section: {},
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionValue: { fontSize: 22, fontWeight: "700", color: theme.text, marginTop: 4 },
  sectionTitleSpaced: { marginBottom: Spacing.sm },
  barChartWrap: { marginTop: Spacing.md },
  movementRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  movementIcon: { fontSize: 18 },
  movementInfo: { flex: 1, gap: 6 },
  movementTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  movementName: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.text },
  movementAmount: { fontSize: 13, fontWeight: "600", color: theme.text },
  movementPct: { fontSize: 12, fontWeight: "700", minWidth: 40, textAlign: "right" },
  statRow: { flexDirection: "row", gap: Spacing.md },
  statCard: { flex: 1, gap: 4 },
  statValue: { fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 2 },
  statSub: { fontSize: 11, color: theme.textSecondary },
  summaryCard: {},
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryValue: { fontSize: 20, fontWeight: "700", color: theme.text, marginTop: 2 },
  totalBar: { marginTop: Spacing.md },
  remainingText: { fontSize: 12, color: theme.textSecondary, marginTop: 6 },
  budgetPane: { flex: 1 },
  budgetScroll: { flex: 1 },
  center: { alignItems: "center", paddingTop: 30, gap: 6 },
  emptyText: { fontSize: 15, fontWeight: "600", color: theme.textSecondary },
  mutedText: { fontSize: 13, color: theme.textSecondary },
  budgetCard: {
    padding: Spacing.md,
  },
  budgetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  budgetInfo: { flex: 1, gap: 2 },
  budgetName: { fontSize: 14, fontWeight: "600", color: theme.text },
  budgetAmounts: { fontSize: 12, color: theme.textSecondary },
  budgetBar: { marginTop: Spacing.sm },
  budgetFooter: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  footerSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
  },
  footerSecondaryBtnText: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
  footerPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: theme.primary,
  },
  footerPrimaryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalScrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  modal: { backgroundColor: theme.surfaceElevated, borderRadius: Radius.lg, padding: 20, width: "100%", gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: theme.text },
  fieldLabel: { marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  saveBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
