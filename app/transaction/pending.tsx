import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { useTransactionStore } from "@/store/useTransactionStore";
import { AppColors } from "@/constants/theme";
import type { Transaction } from "@/types";
import { formatMoneyINR } from "@/types";
import { deleteTransaction, updateTransaction } from "@/db/queries/transactions";

function getCategoryLabel(categoryId: number | null, categories: { id: number; name: string }[]) {
  if (!categoryId) return "Uncategorized";
  return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
}

function getAccountLabel(accountId: number | null, accounts: { id: number; name: string }[]) {
  if (!accountId) return "No Account";
  return accounts.find((a) => a.id === accountId)?.name ?? "No Account";
}

function getCategoryIcon(categoryId: number | null, categories: { id: number; icon: string }[]) {
  if (!categoryId) return "💰";
  return categories.find((c) => c.id === categoryId)?.icon ?? "💰";
}

export default function PendingTransactionsScreen() {
  const router = useRouter();
  const { categories, accounts, pendingTransactions, refreshPendingTransactions, refreshAllTransactions } =
    useTransactionStore();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshPendingTransactions();
  }, [refreshPendingTransactions]);

  const handleAccept = useCallback(
    async (item: Transaction) => {
      if (!item.categoryId || !item.accountId) {
        Alert.alert(
          "Missing Details",
          "Please tap this transaction to assign a Category and an Account before accepting."
        );
        return;
      }
      try {
        setLoading(true);
        await updateTransaction(item.id, { source: "manual" });
        await refreshPendingTransactions();
        await refreshAllTransactions();
      } finally {
        setLoading(false);
      }
    },
    [refreshPendingTransactions, refreshAllTransactions],
  );

  const handleReject = useCallback(
    (item: Transaction) => {
      Alert.alert(
        "Discard Transaction",
        "Are you sure you want to discard this auto-fetched transaction?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);
                // Also could delete from SMS log, but keeping SMS log is fine. 
                await deleteTransaction(item.id);
                await refreshPendingTransactions();
              } finally {
                setLoading(false);
              }
            },
          },
        ],
      );
    },
    [refreshPendingTransactions],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color={AppColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Pending Review</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ThemedText style={styles.subtitle}>
        These transactions were automatically fetched from your SMS. Please review them before they are added to your analytics.
      </ThemedText>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : pendingTransactions.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="done-all" size={48} color={AppColors.primaryLight} />
          <ThemedText style={styles.emptyText}>You're all caught up!</ThemedText>
        </View>
      ) : (
        <FlatList
          data={pendingTransactions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const icon = getCategoryIcon(item.categoryId, categories);
            const catName = getCategoryLabel(item.categoryId, categories);
            const accountName = getAccountLabel(item.accountId, accounts);
            const isExpense = item.type === "expense";
            const isIncome = item.type === "income";
            const amountColor = isExpense
              ? AppColors.expense
              : isIncome
                ? AppColors.income
                : AppColors.textSecondary;
            const sign = isExpense ? "-" : isIncome ? "+" : "";

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => router.push(`/transaction/${item.id}`)}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.txIcon}>
                      <ThemedText style={styles.txIconText}>{icon}</ThemedText>
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={styles.txCategory} numberOfLines={1}>
                        {catName}
                      </ThemedText>
                      <ThemedText style={styles.txType}>
                        {item.type.toUpperCase()} • {accountName}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.txAmount, { color: amountColor }]}>
                      {sign}{formatMoneyINR(item.actualAmount)}
                    </ThemedText>
                  </View>

                  <View style={styles.smsPreviewBox}>
                    <ThemedText style={styles.smsPreviewText} numberOfLines={3}>
                      {item.notes || "No SMS content found."}
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(item)}>
                    <MaterialIcons name="close" size={20} color={AppColors.expense} />
                    <ThemedText style={[styles.actionBtnText, { color: AppColors.expense }]}>
                      DISCARD
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(item)}>
                    <MaterialIcons name="check" size={20} color={AppColors.white} />
                    <ThemedText style={[styles.actionBtnText, { color: AppColors.white }]}>
                      ACCEPT
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background, paddingTop: 48 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: AppColors.text },
  subtitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: AppColors.textSecondary },
  listContent: { padding: 16, gap: 16, paddingBottom: 80 },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    overflow: "hidden",
  },
  cardMain: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppColors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1, gap: 2 },
  txCategory: { fontSize: 16, fontWeight: "700", color: AppColors.text },
  txType: { fontSize: 12, fontWeight: "600", color: AppColors.textSecondary },
  txAmount: { fontSize: 18, fontWeight: "700" },
  smsPreviewBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  smsPreviewText: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: AppColors.surface,
  },
  acceptBtn: {
    backgroundColor: AppColors.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
