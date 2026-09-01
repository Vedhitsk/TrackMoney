import React from "react";
import { View, StyleSheet, TouchableOpacity, Modal, Alert } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/theme";
import { formatMoneyINR, Transaction } from "@/types";
import { useTransactionStore } from "@/store/useTransactionStore";

type Props = {
  visible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onDeleteSuccess?: () => void;
};

export function LogDetailsModal({ visible, onClose, transaction, onDeleteSuccess }: Props) {
  const router = useRouter();
  const { categories, accounts } = useTransactionStore();

  if (!transaction) return null;

  const category = categories.find((c) => c.id === transaction.categoryId);
  const account = accounts.find((a) => a.id === transaction.accountId);

  const isExpense = transaction.type === "expense";
  const headerColor = isExpense ? AppColors.expense : AppColors.income;

  const handleDelete = () => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { deleteTransaction } = await import("@/db/queries/transactions");
          await deleteTransaction(transaction.id);
          onClose();
          onDeleteSuccess?.();
        },
      },
    ]);
  };

  const handleEdit = () => {
    onClose();
    router.push(`/transaction/${transaction.id}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          {/* Top colored section */}
          <View style={[styles.topSection, { backgroundColor: headerColor }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <MaterialIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity onPress={handleDelete} hitSlop={10} style={styles.actionBtn}>
                  <MaterialIcons name="delete-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEdit} hitSlop={10} style={styles.actionBtn}>
                  <MaterialIcons name="edit" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.amountContainer}>
              <ThemedText style={styles.typeText}>{transaction.type.toUpperCase()}</ThemedText>
              <ThemedText style={styles.amountText}>
                {isExpense ? "-" : "+"}
                {formatMoneyINR(transaction.rawAmount)}
              </ThemedText>
              <ThemedText style={styles.dateText}>
                {transaction.date.toLocaleString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </ThemedText>
            </View>
          </View>

          {/* Bottom dark section */}
          <View style={styles.bottomSection}>
            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>Account</ThemedText>
              <View style={styles.metaBadge}>
                <ThemedText>{account?.icon}</ThemedText>
                <ThemedText style={styles.metaBadgeText}>{account?.name}</ThemedText>
              </View>
            </View>

            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>Category</ThemedText>
              <View style={styles.metaBadge}>
                <ThemedText>{category?.icon}</ThemedText>
                <ThemedText style={styles.metaBadgeText}>{category?.name}</ThemedText>
              </View>
            </View>

            {transaction.isShared && transaction.actualAmount !== transaction.rawAmount && (
              <View style={styles.metaRow}>
                <ThemedText style={styles.metaLabel}>Shared</ThemedText>
                <ThemedText style={styles.sharedText}>
                  Your share: {formatMoneyINR(transaction.actualAmount)}
                </ThemedText>
              </View>
            )}

            {!!transaction.notes && (
              <ThemedText style={styles.notesText}>{transaction.notes}</ThemedText>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  topSection: {
    padding: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 16,
  },
  actionBtn: {
    marginLeft: 8,
  },
  amountContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  typeText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountText: {
    color: "#FFF",
    fontSize: 36,
    fontWeight: "600",
    marginBottom: 12,
  },
  dateText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  bottomSection: {
    backgroundColor: "#434039",
    padding: 24,
    gap: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  metaLabel: {
    color: "#FFF",
    width: 80,
    fontSize: 16,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  metaBadgeText: {
    color: "#FFF",
    fontSize: 15,
  },
  sharedText: {
    color: "#FFF",
    fontSize: 15,
  },
  notesText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
});
