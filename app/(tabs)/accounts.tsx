import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/theme";
import { formatMoneyINR } from "@/types";
import type { AccountWithBalance } from "@/db/queries/accounts";
import { countActiveRecoveries } from "@/db/queries/settlements";

const ACCOUNT_ICONS = ["💳", "💵", "👛", "🏦", "📱", "💰", "🏧", "🪙"];

export default function AccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💳");
  const [balanceStr, setBalanceStr] = useState("0");
  const [recoveryCount, setRecoveryCount] = useState(0);

  const load = useCallback(async () => {
    const { listAccountsWithBalances } = await import("@/db/queries/accounts");
    setLoading(true);
    try {
      setAccounts(await listAccountsWithBalances());
      setRecoveryCount(await countActiveRecoveries());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-fetch when tab comes into focus — balance updates after tx accepts/deletes
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

  const openAdd = () => {
    setEditId(null);
    setName("");
    setIcon("💳");
    setBalanceStr("0");
    setShowForm(true);
  };

  const openEdit = (a: AccountWithBalance) => {
    setEditId(a.id);
    setName(a.name);
    setIcon(a.icon);
    setBalanceStr(String(a.initialBalance));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      const { updateAccount } = await import("@/db/queries/accounts");
      await updateAccount(editId, {
        name: name.trim(),
        icon,
        initialBalance: parseFloat(balanceStr) || 0,
      });
    } else {
      const { createAccount } = await import("@/db/queries/accounts");
      await createAccount({
        name: name.trim(),
        icon,
        initialBalance: parseFloat(balanceStr) || 0,
      });
    }
    setShowForm(false);
    await load();
  };

  const handleDelete = (a: AccountWithBalance) => {
    Alert.alert("Delete Account", `Delete "${a.name}"? Transactions linked to it won't be deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { deleteAccount } = await import("@/db/queries/accounts");
          await deleteAccount(a.id);
          await load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Accounts</ThemedText>
      </View>

      {/* Total Balance Card */}
      <View style={styles.totalCard}>
        <ThemedText style={styles.totalLabel}>TOTAL BALANCE</ThemedText>
        <ThemedText
          style={[
            styles.totalValue,
            { color: totalBalance >= 0 ? AppColors.income : AppColors.expense },
          ]}>
          {formatMoneyINR(totalBalance)}
        </ThemedText>
      </View>

      {/* Account List */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
            <View style={styles.cardIcon}>
              <ThemedText style={styles.cardIconText}>{item.icon}</ThemedText>
            </View>
            <View style={styles.cardInfo}>
              <ThemedText style={styles.cardName}>{item.name}</ThemedText>
              <ThemedText style={styles.cardInitial}>
                Initial: {formatMoneyINR(item.initialBalance)}
              </ThemedText>
            </View>
            <View style={styles.cardRight}>
              <ThemedText
                style={[
                  styles.cardBalance,
                  {
                    color:
                      item.currentBalance >= 0 ? AppColors.income : AppColors.expense,
                  },
                ]}>
                {formatMoneyINR(item.currentBalance)}
              </ThemedText>
              <ThemedText style={styles.cardSub}>Current</ThemedText>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <ThemedText style={styles.emptyText}>No accounts yet</ThemedText>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.recoveriesBtn}
            onPress={() => router.push("/recoveries")}>
            <MaterialIcons name="people" size={20} color={AppColors.primary} />
            <ThemedText style={styles.recoveriesBtnText}>View Pending Recoveries</ThemedText>
            {recoveryCount > 0 && (
              <View style={styles.recoveriesBadge}>
                <ThemedText style={styles.recoveriesBadgeText}>{recoveryCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color={AppColors.white} />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={styles.modalKav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowForm(false)}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modal} onStartShouldSetResponder={() => true}>
              <ThemedText style={styles.modalTitle}>
                {editId ? "Edit Account" : "Add Account"}
              </ThemedText>

              <ThemedText style={styles.fieldLabel}>Name</ThemedText>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. HDFC Card"
                placeholderTextColor={AppColors.textSecondary}
                returnKeyType="done"
              />

              <ThemedText style={styles.fieldLabel}>Icon</ThemedText>
              <View style={styles.iconGrid}>
                {ACCOUNT_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconCell, icon === ic && styles.iconCellActive]}
                    onPress={() => setIcon(ic)}>
                    <ThemedText style={styles.iconText}>{ic}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Initial Balance (INR)</ThemedText>
              <TextInput
                style={styles.input}
                value={balanceStr}
                onChangeText={setBalanceStr}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={AppColors.textSecondary}
                returnKeyType="done"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background, paddingTop: 48 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: AppColors.text },
  totalCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: "700",
    color: AppColors.white,
    marginTop: 4,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AppColors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconText: { fontSize: 22 },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 16, fontWeight: "600", color: AppColors.text },
  cardInitial: { fontSize: 12, color: AppColors.textSecondary },
  cardRight: { alignItems: "flex-end", gap: 2 },
  cardBalance: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 11, color: AppColors.textSecondary },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  recoveriesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 80,
    padding: 16,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  recoveriesBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: AppColors.primary },
  recoveriesBadge: {
    backgroundColor: AppColors.expense,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  recoveriesBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  emptyText: { fontSize: 16, fontWeight: "600", color: AppColors.textSecondary },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.fab,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalKav: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    width: "100%",
  },
  modal: {
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 24,
    width: "88%",
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: AppColors.text },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: AppColors.textSecondary, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: AppColors.text,
  },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 4 },
  iconCell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppColors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCellActive: { backgroundColor: AppColors.primaryLight, borderWidth: 2, borderColor: AppColors.primary },
  iconText: { fontSize: 20 },
  saveBtn: {
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: AppColors.white, fontSize: 15, fontWeight: "700" },
});
