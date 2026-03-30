import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/theme";
import { listAppLogs, clearAppLogs } from "@/lib/logger";

export default function LogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await listAppLogs(200);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClear = async () => {
    await clearAppLogs();
    fetchLogs();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>System Logs</ThemedText>
        <TouchableOpacity onPress={handleClear}>
          <MaterialIcons name="delete-sweep" size={24} color={AppColors.expense} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>No logs recorded yet.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const date = new Date(item.createdAt).toLocaleTimeString();
            const color =
              item.level === "error"
                ? AppColors.expense
                : item.level === "warn"
                ? "#E69138"
                : AppColors.primary;

            return (
              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <ThemedText style={[styles.logLevel, { color }]}>
                    {item.level.toUpperCase()}
                  </ThemedText>
                  <ThemedText style={styles.logTime}>{date}</ThemedText>
                </View>
                <ThemedText style={styles.logMsg}>{item.message}</ThemedText>
                {item.details ? (
                  <View style={styles.detailsBox}>
                    <ThemedText style={styles.detailsText}>{item.details}</ThemedText>
                  </View>
                ) : null}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: AppColors.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: AppColors.textSecondary },
  list: { padding: 16, gap: 12 },
  logCard: {
    backgroundColor: AppColors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  logLevel: { fontSize: 12, fontWeight: "800" },
  logTime: { fontSize: 10, color: AppColors.textSecondary },
  logMsg: { fontSize: 14, fontWeight: "600", color: AppColors.text },
  detailsBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 4,
  },
  detailsText: { fontSize: 11, color: "#666", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
});
