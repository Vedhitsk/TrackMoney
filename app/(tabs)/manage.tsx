import { useAppTheme } from '@/hooks/useAppTheme';
import { IconPalette, Spacing, ThemeColors, Typography } from '@/constants/theme';
import React, { useCallback, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";

import { Card, CountBadge, ListRow } from "@/components/ui";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useShallow } from "zustand/react/shallow";

export default function ManageScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const { categories, loadCategories, accounts, loadAccounts, pendingTransactions, refreshPendingTransactions } =
    useTransactionStore(
      useShallow((state) => ({
        categories: state.categories,
        loadCategories: state.loadCategories,
        accounts: state.accounts,
        loadAccounts: state.loadAccounts,
        pendingTransactions: state.pendingTransactions,
        refreshPendingTransactions: state.refreshPendingTransactions,
      })),
    );

  useEffect(() => {
    void loadCategories();
    void loadAccounts();
    void refreshPendingTransactions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      void loadAccounts();
      void refreshPendingTransactions();
    }, [loadCategories, loadAccounts, refreshPendingTransactions]),
  );

  const pendingCount = pendingTransactions.length;

  const items: {
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    color: string;
    label: string;
    subtitle: string;
    onPress: () => void;
    badge?: number;
  }[] = [
    {
      icon: "credit-card",
      color: IconPalette.blue,
      label: "Accounts",
      subtitle: `${accounts.length} account${accounts.length === 1 ? "" : "s"}`,
      onPress: () => router.push("/accounts"),
    },
    {
      icon: "category",
      color: IconPalette.purple,
      label: "Categories",
      subtitle: `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`,
      onPress: () => router.push("/categories"),
    },
    {
      icon: "pending-actions",
      color: IconPalette.amber,
      label: "Pending Review",
      subtitle: pendingCount > 0 ? `${pendingCount} awaiting review` : "All caught up",
      onPress: () => router.push("/transaction/pending"),
      badge: pendingCount,
    },
    {
      icon: "settings",
      color: IconPalette.slate,
      label: "Settings",
      subtitle: "Appearance, data, automation",
      onPress: () => router.push("/settings"),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Manage</Text>

      <Card noPadding style={styles.card}>
        {items.map((item, i) => (
          <View key={item.label}>
            <TouchableOpacity style={styles.row} onPress={item.onPress}>
              <ListRow
                leading={
                  <View style={[styles.rowIcon, { backgroundColor: `${item.color}22` }]}>
                    <MaterialIcons name={item.icon} size={20} color={item.color} />
                  </View>
                }
                title={item.label}
                subtitle={item.subtitle}
                trailing={item.badge ? <CountBadge count={item.badge} /> : undefined}
                showChevron
              />
            </TouchableOpacity>
            {i < items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 56, paddingHorizontal: Spacing.lg },
  headerTitle: { ...Typography.title, color: theme.text, marginBottom: Spacing.lg },
  card: { overflow: "hidden" },
  row: { paddingHorizontal: Spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  divider: { height: 1, backgroundColor: theme.borderLight, marginLeft: Spacing.md + 38 + 12 },
});
