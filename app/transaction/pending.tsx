import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { useTransactionStore } from "@/store/useTransactionStore";
import { AppColors } from "@/constants/theme";
import type { Transaction } from "@/types";
import { formatMoneyINR } from "@/types";
import { deleteTransaction, updateTransaction } from "@/db/queries/transactions";
import { SMS_TRANSACTION_EVENT } from "@/lib/sms/smsIngestion";

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

  // Instant update when background task saves a new transaction
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SMS_TRANSACTION_EVENT, () => {
      void refreshPendingTransactions();
    });
    return () => sub.remove();
  }, [refreshPendingTransactions]);

  // Refresh when this screen comes into focus (e.g. user edits then comes back)
  useFocusEffect(
    useCallback(() => {
      void refreshPendingTransactions();
    }, [refreshPendingTransactions]),
  );

  // Directly accept if category+account already filled; otherwise prompt to edit first
  const handleAccept = useCallback(
    async (item: Transaction) => {
      if (!item.categoryId || !item.accountId) {
        Alert.alert(
          "Incomplete Details",
          "This transaction is missing a Category or Account. Tap the card to edit and fill them in before accepting.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Edit Now", onPress: () => router.push(`/transaction/${item.id}`) },
          ]
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
    [router, refreshPendingTransactions, refreshAllTransactions],
  );

  const handleDiscard = useCallback(
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
        Tap a card to edit details. Tap ACCEPT to add to your records.
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
            const hasCategory = !!item.categoryId;
            const hasAccount = !!item.accountId;
            const isComplete = hasCategory && hasAccount;

            const status = item.parseStatus;
            const isUnparsed = status === "needs_review";
            const statusColor = status === "complete" ? "#22c55e" : status === "partial" ? "#f59e0b" : "#ef4444";
            const statusLabel = status.toUpperCase();

            return (
              <View style={[styles.card, isUnparsed && styles.cardUnparsed]}>
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <ThemedText style={styles.statusBadgeText}>{statusLabel}</ThemedText>
                  {item.parsedBy && (
                    <ThemedText style={styles.parsedByText}>via {item.parsedBy.toUpperCase()}</ThemedText>
                  )}
                </View>

                {/* Tappable area → edit screen */}
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => router.push(`/transaction/${item.id}`)}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.txIcon}>
                      <ThemedText style={styles.txIconText}>{icon}</ThemedText>
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={styles.txCategory} numberOfLines={1}>
                        {hasCategory ? catName : (isUnparsed ? "Unparsed" : "No Category")}
                      </ThemedText>
                      <ThemedText style={styles.txType}>
                        {item.type.toUpperCase()} • {hasAccount ? accountName : "No Account"}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.txAmount, { color: amountColor }]}>
                      {sign}{formatMoneyINR(item.actualAmount)}
                    </ThemedText>
                  </View>

                  <View style={[styles.smsPreviewBox, isUnparsed && styles.smsPreviewBoxUnparsed]}>
                    {isUnparsed && (
                      <ThemedText style={styles.rawSmsLabel}>RAW SMS CONTENT:</ThemedText>
                    )}
                    <ThemedText style={[styles.smsPreviewText, isUnparsed && styles.smsPreviewTextUnparsed]} numberOfLines={isUnparsed ? undefined : 3}>
                      {item.notes || "No SMS content found."}
                    </ThemedText>
                  </View>

                  {/* Completion hint */}
                  {!isComplete && (
                    <View style={styles.incompleteHint}>
                      <MaterialIcons name="edit" size={13} color={isUnparsed ? AppColors.expense : AppColors.primary} />
                      <ThemedText style={[styles.incompleteHintText, isUnparsed && { color: AppColors.expense }]}>
                        {isUnparsed ? "Tap to fill manually" : `Tap to assign ${!hasCategory ? "category" : ""}${!hasCategory && !hasAccount ? " & " : ""}${!hasAccount ? "account" : ""}`}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleDiscard(item)}>
                    <MaterialIcons name="close" size={20} color={AppColors.expense} />
                    <ThemedText style={[styles.actionBtnText, { color: AppColors.expense }]}>
                      DISCARD
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn, (!isComplete || isUnparsed) && styles.acceptBtnIncomplete]}
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
    paddingVertical: 10,
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
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
  cardUnparsed: { borderLeftWidth: 4, borderLeftColor: AppColors.expense },
  statusBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 10,
  },
  statusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  parsedByText: { color: "rgba(255,255,255,0.8)", fontSize: 8, fontWeight: "600" },
  cardMain: { padding: 16, paddingTop: 20 },
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
  smsPreviewBoxUnparsed: { backgroundColor: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.2)" },
  rawSmsLabel: { fontSize: 10, fontWeight: "800", color: AppColors.expense, marginBottom: 4 },
  smsPreviewText: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  smsPreviewTextUnparsed: { color: AppColors.text, fontStyle: "normal", fontWeight: "500" },
  incompleteHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  incompleteHintText: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: "600",
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
  rejectBtn: { backgroundColor: AppColors.surface },
  acceptBtn: { backgroundColor: AppColors.primary },
  acceptBtnIncomplete: { backgroundColor: AppColors.textSecondary },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
});
