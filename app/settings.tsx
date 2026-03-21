import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/themed-text";
import { exportTrackMoneyData, importTrackMoneyData } from "@/lib/serialization/trackmoney";
import { useTransactionStore } from "@/store/useTransactionStore";
import { AppColors } from "@/constants/theme";

type SettingItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  color?: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const onExport = async () => {
    try {
      setBusy(true);
      setStatus("Exporting...");
      const payload = await exportTrackMoneyData();
      const json = JSON.stringify(payload, null, 2);
      const fileName = `trackmoney_export_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const file = new File(Paths.document, fileName);
      const encoder =
        typeof globalThis.TextEncoder !== "undefined" ? new globalThis.TextEncoder() : null;
      const bytes = encoder != null
        ? encoder.encode(json)
        : new Uint8Array(Array.from(json).map((ch) => ch.charCodeAt(0)));
      const stream = file.writableStream();
      const writer = stream.getWriter();
      writer.write(bytes);
      writer.close();
      if (Platform.OS === "android" && !(await Sharing.isAvailableAsync())) {
        Alert.alert("Export saved", `Saved to: ${file.uri}`);
        return;
      }
      await Sharing.shareAsync(file.uri);
      setStatus("Export complete.");
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    try {
      setBusy(true);
      setStatus("Waiting for JSON file...");
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setStatus(null);
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        Alert.alert("Import failed", "No file URI found.");
        return;
      }
      const raw = await fetch(uri).then((r) => r.text());
      const parsed = JSON.parse(raw);
      Alert.alert(
        "Confirm import",
        "Import will REPLACE all existing data. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            style: "destructive",
            onPress: async () => {
              try {
                setStatus("Importing...");
                await importTrackMoneyData(parsed);
                const store = useTransactionStore.getState();
                await store.loadCategories();
                await store.refreshAllTransactions();
                await store.refreshPendingTransactions();
                setStatus("Import complete.");
              } catch (e) {
                Alert.alert("Import failed", e instanceof Error ? e.message : "Unknown error");
                setStatus(null);
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert("Import failed", e instanceof Error ? e.message : "Unknown error");
      setBusy(false);
    }
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Data",
      items: [
        {
          icon: "file-upload",
          label: "Export Data",
          sub: "Save all data as JSON file",
          onPress: onExport,
        },
        {
          icon: "file-download",
          label: "Import Data",
          sub: "Replace all data from JSON file",
          onPress: onImport,
          color: AppColors.expense,
        },
      ],
    },
    {
      title: "Automation",
      items: [
        {
          icon: "sms",
          label: "SMS Auto-Ingestion",
          sub:
            Platform.OS === "android"
              ? "Active - reading bank SMS automatically"
              : "Not available (Android only)",
          onPress: () => {},
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "info-outline",
          label: "TrackMoney",
          sub: "Version 1.0.0 - AI-Powered Expense Tracker",
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.row, busy && styles.rowDisabled]}
                disabled={busy}
                onPress={item.onPress}>
                <View style={styles.rowIcon}>
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={item.color ?? AppColors.primary}
                  />
                </View>
                <View style={styles.rowInfo}>
                  <ThemedText style={styles.rowLabel}>{item.label}</ThemedText>
                  <ThemedText style={styles.rowSub}>{item.sub}</ThemedText>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={AppColors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {status ? (
          <View style={styles.statusWrap}>
            <ThemedText style={styles.statusText}>{status}</ThemedText>
          </View>
        ) : null}
      </ScrollView>
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
  scroll: { paddingBottom: 40 },
  section: { paddingTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AppColors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  rowInfo: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: AppColors.text },
  rowSub: { fontSize: 12, color: AppColors.textSecondary },
  statusWrap: { paddingHorizontal: 16, paddingTop: 10 },
  statusText: { fontSize: 13, color: AppColors.primary, fontWeight: "600" },
});
