import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View, ScrollView, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "./themed-text";
import { AppColors } from "@/constants/theme";

interface Props {
  visible: boolean;
  onGrant: () => void;
}

export function PermissionModal({ visible, onGrant }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="security" size={80} color={AppColors.primary} />
          </View>

          <ThemedText style={styles.title}>Auto-Track Transactions</ThemedText>
          
          <ThemedText style={styles.description}>
            TrackMoney can automatically fetch your bank transactions from SMS so you don't have to enter them manually.
          </ThemedText>

          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialIcons name="sms" size={24} color={AppColors.primary} />
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>SMS Access</ThemedText>
                <ThemedText style={styles.rowSub}>To read and process bank transaction messages.</ThemedText>
              </View>
            </View>

            <View style={styles.row}>
              <MaterialIcons name="notifications-active" size={24} color={AppColors.primary} />
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>Notifications</ThemedText>
                <ThemedText style={styles.rowSub}>Required by Android to process SMS in the background reliably.</ThemedText>
              </View>
            </View>

            <View style={styles.row}>
              <MaterialIcons name="battery-saver" size={24} color={AppColors.primary} />
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>Battery Settings</ThemedText>
                <ThemedText style={styles.rowSub}>Allowing background activity ensures you never miss a transaction.</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.privacyBox}>
            <MaterialIcons name="lock" size={16} color={AppColors.textSecondary} />
            <ThemedText style={styles.privacyText}>
              Your privacy is our priority. SMS data is processed 100% offline on your device and never uploaded to any server.
            </ThemedText>
          </View>

          <TouchableOpacity style={styles.button} onPress={onGrant}>
            <ThemedText style={styles.buttonText}>Enable Auto-Tracking</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 30,
    paddingTop: 80,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AppColors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 15,
    color: AppColors.text,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: AppColors.textSecondary,
    marginBottom: 40,
    lineHeight: 24,
  },
  card: {
    width: "100%",
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 25,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  row: {
    flexDirection: "row",
    gap: 15,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.text,
  },
  rowSub: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  privacyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  privacyText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    flex: 1,
    fontStyle: "italic",
  },
  button: {
    width: "100%",
    backgroundColor: AppColors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
