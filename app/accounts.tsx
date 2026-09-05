import { useAppTheme } from '@/hooks/useAppTheme';
import { IconPalette, Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
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

import { AmountText, Card, ListRow, SectionLabel } from "@/components/ui";
import type { AccountWithBalance } from "@/db/queries/accounts";
import { countActiveRecoveries } from "@/db/queries/settlements";
import { formatMoneyINR } from "@/types";
import { showAppAlert } from "@/store/useAlertStore";

const ACCOUNT_ICONS = ["💳", "💵", "👛", "🏦", "📱", "💰", "🏧", "🪙"];
const ACCOUNT_TILE_COLORS = [
  IconPalette.blue,
  IconPalette.purple,
  IconPalette.teal,
  IconPalette.pink,
  IconPalette.indigo,
  IconPalette.slate,
];

export default function AccountsScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💳");
  const [balanceStr, setBalanceStr] = useState("0");
  const [recoveryCount, setRecoveryCount] = useState(0);

  const load = useCallback(async () => {
    const { listAccountsWithBalances } = await import("@/db/queries/accounts");
    setAccounts(await listAccountsWithBalances());
    setRecoveryCount(await countActiveRecoveries());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      await updateAccount(editId, { name: name.trim(), icon, initialBalance: parseFloat(balanceStr) || 0 });
    } else {
      const { createAccount } = await import("@/db/queries/accounts");
      await createAccount({ name: name.trim(), icon, initialBalance: parseFloat(balanceStr) || 0 });
    }
    setShowForm(false);
    await load();
  };

  const handleDelete = (a: AccountWithBalance) => {
    showAppAlert("Delete account", `Delete "${a.name}"? Transactions linked to it won't be deleted.`, [
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.totalCard} noBorder>
        <SectionLabel color="rgba(255,255,255,0.75)">Total balance</SectionLabel>
        <Text style={styles.totalValue}>{formatMoneyINR(totalBalance)}</Text>
      </Card>

      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item, index }) => (
          <Card noPadding>
            <TouchableOpacity
              style={styles.rowPad}
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item)}>
              <ListRow
                emoji={item.icon}
                iconColor={ACCOUNT_TILE_COLORS[index % ACCOUNT_TILE_COLORS.length]}
                title={item.name}
                subtitle={`Initial: ${formatMoneyINR(item.initialBalance)}`}
                trailing={<AmountText amount={item.currentBalance} type={item.currentBalance >= 0 ? "income" : "expense"} showSign={false} />}
              />
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No accounts yet</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.recoveriesBtn} onPress={() => router.push("/recoveries")}>
            <MaterialIcons name="people" size={20} color={theme.primary} />
            <Text style={styles.recoveriesBtnText}>View pending recoveries</Text>
            {recoveryCount > 0 && (
              <View style={styles.recoveriesBadge}>
                <Text style={styles.recoveriesBadgeText}>{recoveryCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalKav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowForm(false)}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modal} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>{editId ? "Edit Account" : "Add Account"}</Text>

                <SectionLabel style={styles.fieldLabel}>Name</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. HDFC Card"
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="done"
                />

                <SectionLabel style={styles.fieldLabel}>Icon</SectionLabel>
                <View style={styles.iconGrid}>
                  {ACCOUNT_ICONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[styles.iconCell, { backgroundColor: icon === ic ? theme.primaryLight : theme.borderLight }, icon === ic && { borderWidth: 2, borderColor: theme.primary }]}
                      onPress={() => setIcon(ic)}>
                      <Text style={styles.iconText}>{ic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <SectionLabel style={styles.fieldLabel}>Initial balance (INR)</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={balanceStr}
                  onChangeText={setBalanceStr}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="done"
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
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
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 56 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: { ...Typography.subtitle, color: theme.text },
  totalCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: theme.primary,
    alignItems: "center",
  },
  totalValue: { fontSize: 26, fontWeight: "700", color: "#FFFFFF", marginTop: 4 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },
  rowPad: { paddingHorizontal: Spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: theme.textSecondary },
  recoveriesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  recoveriesBtnText: { flex: 1, fontSize: 14, fontWeight: "600" },
  recoveriesBadge: {
    backgroundColor: theme.expense,
    borderRadius: Radius.pill,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  recoveriesBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  modalKav: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, width: "100%", backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalScrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20, width: "100%" },
  modal: { backgroundColor: theme.surfaceElevated, borderRadius: Radius.xl, padding: 24, width: "88%", gap: 10 },
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
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 4 },
  iconCell: { width: 42, height: 42, borderRadius: Radius.pill, justifyContent: "center", alignItems: "center" },
  iconText: { fontSize: 20 },
  saveBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: Radius.md, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
