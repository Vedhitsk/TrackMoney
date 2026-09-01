import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { useTransactionStore } from "@/store/useTransactionStore";

import { formatMoneyINR } from "@/types";

import type { BudgetWithCategory } from "@/db/queries/budgets";

export default function BudgetsScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const { categories, loadCategories, allTransactions, refreshAllTransactions } =
    useTransactionStore();

  const router = useRouter();

  const now = new Date();
  const [anchor, setAnchor] = useState(now);
  const [budgetsData, setBudgetsData] = useState<BudgetWithCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [limitStr, setLimitStr] = useState("");

  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;

  const loadBudgets = useCallback(async () => {
    const { listBudgetsForMonth } = await import("@/db/queries/budgets");
    setLoading(true);
    try {
      const data = await listBudgetsForMonth(year, month);
      setBudgetsData(data);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadCategories();
    void refreshAllTransactions();
  }, []);

  // Re-fetch when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      void refreshAllTransactions();
      void loadBudgets();
    }, [refreshAllTransactions, loadBudgets]),
  );

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const prevMonth = useCallback(() => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);
  const nextMonth = useCallback(() => {
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const monthLabel = anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const prevMonthLabel = useMemo(() => {
    const d = new Date(year, month - 2, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [year, month]);

  const spentByCat = useMemo(() => {
    const startMs = new Date(year, month - 1, 1).getTime();
    const endMs = new Date(year, month, 1).getTime();
    const map = new Map<number, number>();
    for (const tx of allTransactions) {
      if (tx.type !== "expense" || tx.isExcluded || !tx.categoryId) continue;
      const t = tx.date.getTime();
      if (t >= startMs && t < endMs) {
        map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.actualAmount);
      }
    }
    return map;
  }, [allTransactions, year, month]);

  const totalBudget = budgetsData.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgetsData.reduce((s, b) => s + (spentByCat.get(b.categoryId) ?? 0), 0);

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
      month,
      monthlyLimit: Number.parseFloat(limitStr) || 0,
    });
    setShowForm(false);
    setEditBudgetId(null);
    setSelectedCatId(null);
    setLimitStr("");
    await loadBudgets();
  };

  const handleDeleteBudget = (b: BudgetWithCategory) => {
    Alert.alert(
      "Delete Budget",
      `Remove budget for "${b.categoryName}"?`,
      [
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
      ],
    );
  };

  const handleCopyFromPrevious = () => {
    Alert.alert(
      "Copy from Previous Month",
      `Copy all budgets from ${prevMonthLabel} to ${monthLabel}? This will replace current budgets.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: async () => {
            const { copyBudgetsFromPreviousMonth } = await import("@/db/queries/budgets");
            const count = await copyBudgetsFromPreviousMonth(year, month);
            if (count === 0) {
              Alert.alert("No budgets found", `${prevMonthLabel} has no budgets to copy.`);
            }
            await loadBudgets();
          },
        },
      ],
    );
  };

  const existingCatIds = new Set(budgetsData.map((b) => b.categoryId));
  const catsForPicker = editBudgetId
    ? categories
    : categories.filter((c) => !existingCatIds.has(c.id));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Budgets</ThemedText>
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

      {/* Total Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <ThemedText style={styles.summaryLabel}>BUDGET</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatMoneyINR(totalBudget)}</ThemedText>
          </View>
          <View style={styles.summaryRight}>
            <ThemedText style={styles.summaryLabel}>SPENT</ThemedText>
            <ThemedText
              style={[
                styles.summaryValue,
                { color: totalSpent > totalBudget ? theme.expense : theme.income },
              ]}>
              {formatMoneyINR(totalSpent)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.totalBarBg}>
          <View
            style={[
              styles.totalBar,
              {
                width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%`,
                backgroundColor: totalSpent > totalBudget ? theme.progressRed : theme.progressGreen,
              },
            ]}
          />
        </View>
        <ThemedText style={styles.remainingText}>
          {totalBudget - totalSpent >= 0
            ? `${formatMoneyINR(totalBudget - totalSpent)} remaining`
            : `${formatMoneyINR(totalSpent - totalBudget)} over budget`}
        </ThemedText>
      </View>

      {/* Copy from Previous Month */}
      <TouchableOpacity style={styles.copyBtn} onPress={handleCopyFromPrevious}>
        <MaterialIcons name="content-copy" size={18} color={theme.primary} />
        <ThemedText style={styles.copyBtnText}>Copy from previous month</ThemedText>
      </TouchableOpacity>

      {/* Budget List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : budgetsData.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>No budgets set for {monthLabel}</ThemedText>
          <ThemedText style={styles.mutedText}>
            Tap + to add a category budget
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={budgetsData}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const spent = spentByCat.get(item.categoryId) ?? 0;
            const pct = item.monthlyLimit > 0 ? (spent / item.monthlyLimit) * 100 : 0;
            const isOver = spent > item.monthlyLimit;
            return (
              <TouchableOpacity style={styles.budgetCard} onPress={() => router.push(`/category-details?categoryId=${item.categoryId}&year=${year}&month=${month - 1}`)}>
                <View style={styles.budgetHeader}>
                  <ThemedText style={styles.budgetIcon}>{item.categoryIcon}</ThemedText>
                  <View style={styles.budgetInfo}>
                    <ThemedText style={styles.budgetName}>{item.categoryName}</ThemedText>
                    <ThemedText style={styles.budgetAmounts}>
                      <ThemedText
                        style={{ color: isOver ? theme.expense : theme.text, fontWeight: "700" }}>
                        {formatMoneyINR(spent)}
                      </ThemedText>
                      {" / "}
                      {formatMoneyINR(item.monthlyLimit)}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => openEdit(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialIcons name="edit" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteBudget(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialIcons name="delete-outline" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: isOver ? theme.progressRed : item.categoryColor,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color={theme.white} />
      </TouchableOpacity>

      {/* Add/Edit Budget Modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowForm(false)}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modal} onStartShouldSetResponder={() => true}>
                <ThemedText style={styles.modalTitle}>
                  {editBudgetId ? "Edit Budget" : "Add Budget"}
                </ThemedText>

                <ThemedText style={styles.fieldLabel}>Category</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {catsForPicker.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        selectedCatId === cat.id && styles.catChipActive,
                      ]}
                      onPress={() => setSelectedCatId(cat.id)}>
                      <ThemedText style={styles.catChipIcon}>{cat.icon}</ThemedText>
                      <ThemedText
                        style={[
                          styles.catChipText,
                          selectedCatId === cat.id && styles.catChipTextActive,
                        ]}>
                        {cat.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ThemedText style={styles.fieldLabel}>Monthly Limit (INR)</ThemedText>
                <TextInput
                  style={styles.input}
                  value={limitStr}
                  onChangeText={setLimitStr}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={theme.textSecondary}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
                  <ThemedText style={styles.saveBtnText}>SAVE</ThemedText>
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
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 48 },
  header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
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
  summaryCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryRight: { alignItems: "flex-end" },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 18, fontWeight: "700", color: theme.text, marginTop: 2 },
  totalBarBg: {
    height: 6,
    backgroundColor: theme.borderLight,
    borderRadius: 3,
    marginTop: 12,
  },
  totalBar: { height: 6, borderRadius: 3 },
  remainingText: { fontSize: 12, color: theme.textSecondary, marginTop: 6 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary,
    borderStyle: "dashed",
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.primary,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: theme.textSecondary },
  mutedText: { fontSize: 13, color: theme.textSecondary },
  listContent: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  budgetCard: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  budgetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  budgetIcon: { fontSize: 22 },
  budgetInfo: { flex: 1, gap: 2 },
  budgetName: { fontSize: 14, fontWeight: "600", color: theme.text },
  budgetAmounts: { fontSize: 13, color: theme.textSecondary },
  deleteBtn: { padding: 4 },
  barBg: {
    height: 5,
    backgroundColor: theme.borderLight,
    borderRadius: 3,
    marginTop: 10,
  },
  bar: { height: 5, borderRadius: 3 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.fab,
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 20,
    width: "100%",
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: theme.text },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    marginTop: 4,
  },
  catScroll: { maxHeight: 44, marginVertical: 4 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.borderLight,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: theme.primary,
  },
  catChipIcon: { fontSize: 16 },
  catChipText: { fontSize: 13, fontWeight: "600", color: theme.text },
  catChipTextActive: { color: theme.white },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  saveBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: theme.white, fontSize: 15, fontWeight: "700" },
});
