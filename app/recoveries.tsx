import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { AmountText, Badge, Card, ProgressBar, SectionLabel } from "@/components/ui";
import { formatMoneyINR } from "@/types";
import { listPendingRecoveries, type PendingRecovery } from "@/db/queries/settlements";
import { updateTransaction } from "@/db/queries/transactions";

export default function RecoveriesScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const [recoveries, setRecoveries] = useState<PendingRecovery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecoveries(await listPendingRecoveries());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Recoveries</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.subtitle}>
        Shared expenses where others owe you money. Map a credit payment to mark it as recovered.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : recoveries.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="check-circle-outline" size={52} color={theme.income} />
          <Text style={styles.emptyTitle}>All settled up!</Text>
          <Text style={styles.emptyText}>
            No shared expenses with pending recoveries.{"\n"}Mark a transaction as "Shared" to track recoveries here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recoveries}
          keyExtractor={(item) => String(item.tx.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          renderItem={({ item }) => <RecoveryCard item={item} onRefresh={load} />}
        />
      )}
    </View>
  );
}

function RecoveryCard({ item, onRefresh }: { item: PendingRecovery; onRefresh: () => void }) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const isFullyRecovered = item.remaining <= 0;
  const pct = item.pendingRecovery > 0 ? Math.min(1, item.alreadyRecovered / item.pendingRecovery) : 1;

  const handleForgiveDebt = () => {
    Alert.alert(
      "Mark as settled",
      `Are you sure you want to mark this as fully settled?\n\nThis will assume you paid the remaining ${formatMoneyINR(item.remaining)} yourself, adding it to your share of the expense.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            try {
              const newActualAmount = item.myShare + item.remaining;
              await updateTransaction(item.tx.id, { actualAmount: newActualAmount });
              onRefresh();
            } catch {
              Alert.alert("Error", "Failed to update transaction.");
            }
          },
        },
      ],
    );
  };

  return (
    <Card style={isFullyRecovered ? { borderLeftWidth: 4, borderLeftColor: theme.income } : undefined}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🤝</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardMerchant} numberOfLines={1}>{item.tx.merchant}</Text>
          <Text style={styles.cardDate}>
            {item.tx.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </Text>
        </View>
        <Badge label={isFullyRecovered ? "Settled" : "Pending"} tone={isFullyRecovered ? "success" : "danger"} />
      </View>

      <View style={styles.amountGrid}>
        <AmountCell label="Total paid" value={item.totalPaid} color={theme.text} />
        <AmountCell label="My share" value={item.myShare} color={theme.primary} />
        <AmountCell label="To recover" value={item.pendingRecovery} color={theme.expense} />
        <AmountCell label="Recovered" value={item.alreadyRecovered} color={theme.income} />
      </View>

      <ProgressBar progress={pct} color={isFullyRecovered ? theme.income : theme.primary} style={styles.progressBar} />
      <Text style={styles.progressLabel}>
        {isFullyRecovered ? "Fully recovered" : `${formatMoneyINR(item.remaining)} still pending`}
      </Text>

      {item.settlements.length > 0 && (
        <View style={styles.settlementsBox}>
          <SectionLabel>Recovery payments ({item.settlements.length})</SectionLabel>
          {item.settlements.map((s) => (
            <View key={s.id} style={styles.settlementRow}>
              <MaterialIcons name="check" size={14} color={theme.income} />
              <Text style={styles.settlementText}>
                {formatMoneyINR(s.amount)} · {s.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!isFullyRecovered && (
        <TouchableOpacity style={styles.forgiveBtn} onPress={handleForgiveDebt}>
          <MaterialIcons name="done-all" size={16} color={theme.textSecondary} />
          <Text style={styles.forgiveBtnText}>Mark as fully settled</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

function AmountCell({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.amountCell}>
      <Text style={styles.amountCellLabel}>{label}</Text>
      <Text style={[styles.amountCellValue, { color }]}>{formatMoneyINR(value)}</Text>
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
  headerTitle: { ...Typography.subtitle, color: theme.text },
  subtitle: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.text },
  emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: "center", lineHeight: 20 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 80 },

  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardIconText: { fontSize: 20 },
  cardMerchant: { fontSize: 15, fontWeight: "700", color: theme.text },
  cardDate: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.md },
  amountCell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.background,
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  amountCellLabel: { fontSize: 11, color: theme.textSecondary, fontWeight: "600" },
  amountCellValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },

  progressBar: { marginBottom: 6 },
  progressLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: "600" },

  settlementsBox: {
    backgroundColor: theme.background,
    borderRadius: Radius.sm,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.borderLight,
    marginTop: Spacing.md,
  },
  settlementRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  settlementText: { fontSize: 13, color: theme.text, fontWeight: "500" },

  forgiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  forgiveBtnText: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
});
