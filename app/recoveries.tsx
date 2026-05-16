import React, { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/theme";
import { formatMoneyINR } from "@/types";
import { listPendingRecoveries, type PendingRecovery } from "@/db/queries/settlements";
import { updateTransaction } from "@/db/queries/transactions";
import { Alert } from "react-native";

export default function RecoveriesScreen() {
  const router = useRouter();
  const [recoveries, setRecoveries] = useState<PendingRecovery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingRecoveries();
      setRecoveries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color={AppColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Pending Recoveries</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ThemedText style={styles.subtitle}>
        Shared expenses where others owe you money. Map a credit payment to mark it as recovered.
      </ThemedText>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : recoveries.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="check-circle-outline" size={56} color={AppColors.primaryLight} />
          <ThemedText style={styles.emptyTitle}>All settled up!</ThemedText>
          <ThemedText style={styles.emptyText}>
            No shared expenses with pending recoveries.{"\n"}Mark a transaction as "Shared" to track recoveries here.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={recoveries}
          keyExtractor={(item) => String(item.tx.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <RecoveryCard item={item} onRefresh={load} />}
        />
      )}
    </View>
  );
}

// ─── Recovery Card ────────────────────────────────────────────────────────────

function RecoveryCard({ item, onRefresh }: { item: PendingRecovery; onRefresh: () => void }) {
  const isFullyRecovered = item.remaining <= 0;
  const pct = item.pendingRecovery > 0
    ? Math.min(100, (item.alreadyRecovered / item.pendingRecovery) * 100)
    : 100;

  const handleForgiveDebt = () => {
    Alert.alert(
      "Mark as Settled",
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
            } catch (e) {
              Alert.alert("Error", "Failed to update transaction.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.card, isFullyRecovered && styles.cardDone]}>
      {/* Title Row */}
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <ThemedText style={styles.cardIconText}>🤝</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.cardMerchant} numberOfLines={1}>
            {item.tx.merchant}
          </ThemedText>
          <ThemedText style={styles.cardDate}>
            {item.tx.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </ThemedText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isFullyRecovered ? AppColors.income : AppColors.expense }]}>
          <ThemedText style={styles.statusPillText}>
            {isFullyRecovered ? "SETTLED" : "PENDING"}
          </ThemedText>
        </View>
      </View>

      {/* Amount Breakdown */}
      <View style={styles.amountGrid}>
        <AmountCell label="Total Paid" value={item.totalPaid} color={AppColors.text} />
        <AmountCell label="My Share" value={item.myShare} color={AppColors.primary} />
        <AmountCell label="To Recover" value={item.pendingRecovery} color={AppColors.expense} />
        <AmountCell label="Recovered" value={item.alreadyRecovered} color={AppColors.income} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isFullyRecovered ? AppColors.income : AppColors.primary }]} />
      </View>
      <ThemedText style={styles.progressLabel}>
        {isFullyRecovered
          ? "✅ Fully recovered"
          : `${formatMoneyINR(item.remaining)} still pending`}
      </ThemedText>

      {/* Settlement History */}
      {item.settlements.length > 0 && (
        <View style={styles.settlementsBox}>
          <ThemedText style={styles.settlementsTitle}>Recovery Payments ({item.settlements.length})</ThemedText>
          {item.settlements.map((s) => (
            <View key={s.id} style={styles.settlementRow}>
              <MaterialIcons name="check" size={14} color={AppColors.income} />
              <ThemedText style={styles.settlementText}>
                {formatMoneyINR(s.amount)} · {s.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Forgive Debt / Mark as Settled */}
      {!isFullyRecovered && (
        <TouchableOpacity style={styles.forgiveBtn} onPress={handleForgiveDebt}>
          <MaterialIcons name="done-all" size={16} color={AppColors.textSecondary} />
          <ThemedText style={styles.forgiveBtnText}>Mark as fully settled</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AmountCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.amountCell}>
      <ThemedText style={styles.amountCellLabel}>{label}</ThemedText>
      <ThemedText style={[styles.amountCellValue, { color }]}>{formatMoneyINR(value)}</ThemedText>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: AppColors.text },
  emptyText: { fontSize: 14, color: AppColors.textSecondary, textAlign: "center", lineHeight: 20 },
  listContent: { padding: 16, gap: 16, paddingBottom: 80 },

  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: 16,
    gap: 12,
  },
  cardDone: { borderLeftWidth: 4, borderLeftColor: AppColors.income },

  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardIconText: { fontSize: 22 },
  cardMerchant: { fontSize: 16, fontWeight: "700", color: AppColors.text },
  cardDate: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 10, fontWeight: "800", color: "#fff" },

  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amountCell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: AppColors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  amountCellLabel: { fontSize: 11, color: AppColors.textSecondary, fontWeight: "600" },
  amountCellValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },

  progressBg: {
    height: 6,
    backgroundColor: AppColors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: AppColors.textSecondary, fontWeight: "600" },

  settlementsBox: {
    backgroundColor: AppColors.background,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  settlementsTitle: { fontSize: 12, fontWeight: "700", color: AppColors.textSecondary },
  settlementRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  settlementText: { fontSize: 13, color: AppColors.text, fontWeight: "500" },

  forgiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 10,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  forgiveBtnText: { fontSize: 13, fontWeight: "600", color: AppColors.textSecondary },
});
