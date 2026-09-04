import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { AmountText, Badge, Card, IconTile } from "@/components/ui";
import { useTransactionStore } from "@/store/useTransactionStore";
import { showAppAlert } from "@/store/useAlertStore";

import type { Transaction } from "@/types";
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
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const { categories, accounts, pendingTransactions, refreshPendingTransactions, refreshAllTransactions } =
    useTransactionStore();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SMS_TRANSACTION_EVENT, () => {
      void refreshPendingTransactions();
    });
    return () => sub.remove();
  }, [refreshPendingTransactions]);

  useFocusEffect(
    useCallback(() => {
      void refreshPendingTransactions();
    }, [refreshPendingTransactions]),
  );

  const handleAccept = useCallback(
    async (item: Transaction) => {
      if (!item.categoryId || !item.accountId) {
        showAppAlert(
          "Incomplete details",
          "This transaction is missing a category or account. Tap the card to edit and fill them in before accepting.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Edit now", onPress: () => router.push(`/transaction/${item.id}`) },
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
      showAppAlert(
        "Discard transaction",
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Review</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.subtitle}>
        Tap a card to edit details. Accept to add it to your records.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : pendingTransactions.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="done-all" size={44} color={theme.income} />
          <Text style={styles.emptyText}>You're all caught up!</Text>
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
            const hasCategory = !!item.categoryId;
            const hasAccount = !!item.accountId;
            const isComplete = hasCategory && hasAccount;

            const status = item.parseStatus;
            const isUnparsed = status === "needs_review";
            const tone = status === "complete" ? "success" : status === "partial" ? "warning" : "danger";

            return (
              <Card noPadding style={[styles.card, isUnparsed && { borderLeftWidth: 4, borderLeftColor: theme.expense }]}>
                <TouchableOpacity style={styles.cardMain} onPress={() => router.push(`/transaction/${item.id}`)}>
                  <View style={styles.cardHeaderRow}>
                    <IconTile emoji={icon} />
                    <View style={styles.txInfo}>
                      <Text style={styles.txCategory} numberOfLines={1}>
                        {hasCategory ? catName : (isUnparsed ? "Unparsed" : "No category")}
                      </Text>
                      <Text style={styles.txType}>
                        {item.type.toUpperCase()} · {hasAccount ? accountName : "No account"}
                      </Text>
                    </View>
                    <AmountText amount={item.actualAmount} type={isExpense ? "expense" : isIncome ? "income" : "neutral"} />
                  </View>

                  <View style={styles.badgeRow}>
                    <Badge label={status.replace("_", " ")} tone={tone as any} />
                    {item.parsedBy && <Text style={styles.parsedByText}>via {item.parsedBy.toUpperCase()}</Text>}
                  </View>

                  <View style={[styles.smsPreviewBox, isUnparsed && styles.smsPreviewBoxUnparsed]}>
                    {isUnparsed && <Text style={styles.rawSmsLabel}>RAW SMS CONTENT</Text>}
                    <Text
                      style={[styles.smsPreviewText, isUnparsed && styles.smsPreviewTextUnparsed]}
                      numberOfLines={isUnparsed ? undefined : 3}
                    >
                      {item.notes || "No SMS content found."}
                    </Text>
                  </View>

                  {!isComplete && (
                    <View style={styles.incompleteHint}>
                      <MaterialIcons name="edit" size={13} color={isUnparsed ? theme.expense : theme.primary} />
                      <Text style={[styles.incompleteHintText, isUnparsed && { color: theme.expense }]}>
                        {isUnparsed
                          ? "Tap to fill manually"
                          : `Tap to assign ${!hasCategory ? "category" : ""}${!hasCategory && !hasAccount ? " & " : ""}${!hasAccount ? "account" : ""}`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDiscard(item)}>
                    <MaterialIcons name="close" size={18} color={theme.expense} />
                    <Text style={[styles.actionBtnText, { color: theme.expense }]}>Discard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: (!isComplete || isUnparsed) ? theme.borderLight : theme.primary }]}
                    onPress={() => handleAccept(item)}>
                    <MaterialIcons name="check" size={18} color={(!isComplete || isUnparsed) ? theme.textSecondary : "#FFFFFF"} />
                    <Text style={[styles.actionBtnText, { color: (!isComplete || isUnparsed) ? theme.textSecondary : "#FFFFFF" }]}>
                      Accept
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { ...Typography.subtitle, color: theme.text },
  subtitle: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: theme.textSecondary },
  listContent: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: 80 },
  card: { overflow: "hidden" },
  cardMain: { padding: Spacing.md },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  txInfo: { flex: 1, gap: 2 },
  txCategory: { fontSize: 15, fontWeight: "700", color: theme.text },
  txType: { fontSize: 12, fontWeight: "600", color: theme.textSecondary },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  parsedByText: { fontSize: 10, fontWeight: "700", color: theme.textTertiary },
  smsPreviewBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  smsPreviewBoxUnparsed: { borderColor: theme.expense },
  rawSmsLabel: { fontSize: 10, fontWeight: "800", color: theme.expense, marginBottom: 4 },
  smsPreviewText: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  smsPreviewTextUnparsed: { color: theme.text, fontStyle: "normal", fontWeight: "500" },
  incompleteHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  incompleteHintText: { fontSize: 12, color: theme.primary, fontWeight: "600" },
  actionRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.borderLight },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 8 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
});
