import React, { useEffect, useState } from "react";
import {
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
import { useAppTheme } from "@/hooks/useAppTheme";
import { IconPalette, Radius, Spacing, ThemeColors, Typography } from "@/constants/theme";
import { SectionLabel } from "@/components/ui";
import { createAccount, updateAccount, type AccountWithBalance } from "@/db/queries/accounts";
import { useTransactionStore } from "@/store/useTransactionStore";
import { showAppAlert } from "@/store/useAlertStore";

export const ACCOUNT_ICONS = ["💳", "💵", "👛", "🏦", "📱", "💰", "🏧", "🪙"];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (account: { id: number; name: string; icon: string }) => void;
  initialName?: string;
  editAccount?: AccountWithBalance | null;
};

export function AccountFormModal({
  visible,
  onClose,
  onSaved,
  initialName = "",
  editAccount = null,
}: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { loadAccounts } = useTransactionStore();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💳");
  const [balanceStr, setBalanceStr] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editAccount) {
        setName(editAccount.name);
        setIcon(editAccount.icon);
        setBalanceStr(String(editAccount.initialBalance));
      } else {
        setName(initialName);
        setIcon("💳");
        setBalanceStr("0");
      }
    }
  }, [visible, editAccount, initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (editAccount) {
        await updateAccount(editAccount.id, {
          name: trimmed,
          icon,
          initialBalance: parseFloat(balanceStr) || 0,
        });
        await loadAccounts();
        onSaved({ id: editAccount.id, name: trimmed, icon });
      } else {
        const created = await createAccount({
          name: trimmed,
          icon,
          initialBalance: parseFloat(balanceStr) || 0,
        });
        await loadAccounts();
        onSaved(created);
      }
      onClose();
    } catch (e) {
      showAppAlert("Couldn't save account", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalKav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modal} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{editAccount ? "Edit Account" : "Add Account"}</Text>

              <SectionLabel style={styles.fieldLabel}>Name</SectionLabel>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. HDFC Card"
                placeholderTextColor={theme.textTertiary}
                returnKeyType="done"
                autoFocus={!editAccount}
              />

              <SectionLabel style={styles.fieldLabel}>Icon</SectionLabel>
              <View style={styles.iconGrid}>
                {ACCOUNT_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconCell,
                      { backgroundColor: icon === ic ? theme.primaryLight : theme.borderLight },
                      icon === ic && { borderWidth: 2, borderColor: theme.primary },
                    ]}
                    onPress={() => setIcon(ic)}
                  >
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

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    modalKav: { flex: 1, justifyContent: "center", alignItems: "center" },
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
      backgroundColor: theme.surfaceElevated,
      borderRadius: Radius.xl,
      padding: 24,
      width: "88%",
      gap: 10,
    },
    modalTitle: { ...Typography.subtitle, fontWeight: "700", color: theme.text },
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
    iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
    iconCell: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      justifyContent: "center",
      alignItems: "center",
    },
    iconText: { fontSize: 20 },
    saveBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: Radius.md,
      alignItems: "center",
      marginTop: 6,
    },
    saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  });
