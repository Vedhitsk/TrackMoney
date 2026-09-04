import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import { useThemeStore } from '@/store/useThemeStore';
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { ThemeToggle } from '@/components/theme-toggle';

import { Card, ListRow, SectionLabel } from "@/components/ui";
import { exportTrackMoneyData, importTrackMoneyData } from "@/lib/serialization/trackmoney";
import { useTransactionStore } from "@/store/useTransactionStore";
import { parseSmsOffline } from "@/lib/sms/smsParser";
import { insertTransaction } from "@/db/queries/transactions";


type SettingItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sub: string;
  onPress?: () => void;
  color?: string;
  rightElement?: React.ReactNode;
};

export default function SettingsScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulateText, setSimulateText] = useState("Rs 500.00 debited from HDFC Bank Act ending 1234. Info: SWIGGY. Aval Bal: Rs 10000");

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

  const handleSimulate = async () => {
    try {
      if (!simulateText.trim()) return;
      const regexResult = parseSmsOffline({
        senderAddress: "SIMULATOR",
        body: simulateText.trim(),
        source: "sms",
      });
      if (!regexResult) {
        Alert.alert("Simulate Failed", "Parser could not detect a valid transaction. Check that your SMS contains keywords like 'debited', 'credited', 'Rs.', etc.");
        return;
      }
      const draft = regexResult.draft;
      await insertTransaction(draft);
      await useTransactionStore.getState().refreshPendingTransactions();
      setShowSimulateModal(false);
      Alert.alert(
        "Success",
        `Parsed!\n\nAmount: ₹${draft.actualAmount}\nType: ${draft.type}\nMerchant: ${draft.merchant}\nStatus: ${draft.parseStatus}\n\nCheck the Pending dashboard!`
      );
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const themeStore = useThemeStore();

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Appearance",
      items: [
        {
          icon: "brightness-4",
          label: "Theme",
          sub: `Current: ${themeStore.theme.charAt(0).toUpperCase() + themeStore.theme.slice(1)}`,
          rightElement: <ThemeToggle />,
        },
      ],
    },
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
          color: theme.expense,
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
              ? "Active - Tap here to view pending items"
              : "Not available (Android only)",
          onPress: () => router.push("/transaction/pending"),
        },
        {
          icon: "science",
          label: "Simulate Incoming SMS",
          sub: "Test the parser with a custom SMS text",
          onPress: () => setShowSimulateModal(true),
        },
        {
          icon: "history",
          label: "System Logs",
          sub: "View background activity and errors",
          onPress: () => router.push("/settings/logs"),
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "info-outline",
          label: "TrackMoney v1.0",
          sub: "Developed by Vedhit Suresh\nEmail: vedhitsk2804@gmail.com",
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <SectionLabel style={styles.sectionTitle}>{section.title}</SectionLabel>
            <Card noPadding style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={[styles.row, busy && styles.rowDisabled]}
                    disabled={busy || !item.onPress}
                    onPress={item.onPress}>
                    <ListRow
                      leading={
                        <View style={[styles.rowIcon, { backgroundColor: theme.primaryLight }]}>
                          <MaterialIcons name={item.icon} size={20} color={item.color ?? theme.primary} />
                        </View>
                      }
                      title={item.label}
                      subtitle={item.sub}
                      trailing={item.rightElement}
                      showChevron={!item.rightElement && !!item.onPress}
                    />
                  </TouchableOpacity>
                  {i < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {status ? (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showSimulateModal} transparent animationType="fade" onRequestClose={() => setShowSimulateModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSimulateModal(false)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Simulate Bank SMS</Text>

            <SectionLabel style={styles.fieldLabel}>Raw SMS text</SectionLabel>
            <TextInput
              style={[styles.input, { height: 120 }]}
              value={simulateText}
              onChangeText={setSimulateText}
              placeholder="Paste your bank SMS here..."
              placeholderTextColor={theme.textTertiary}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSimulate}>
              <Text style={styles.saveBtnText}>Simulate</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  scroll: { paddingBottom: 40, paddingHorizontal: Spacing.lg },
  section: { marginTop: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.sm, marginLeft: 2 },
  sectionCard: { overflow: "hidden" },
  row: { paddingHorizontal: Spacing.md },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: theme.borderLight, marginLeft: Spacing.md + 38 + 12 },
  statusWrap: { paddingTop: Spacing.md },
  statusText: { fontSize: 13, color: theme.primary, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: Radius.lg,
    padding: 20,
    width: "85%",
    gap: 10,
  },
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
  saveBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
