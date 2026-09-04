import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { Radius, Spacing, ThemeColors } from "@/constants/theme";
import { useAlertStore } from "@/store/useAlertStore";

/** App-styled replacement for the native Alert dialog. Mounted once at the app root. */
export function AppAlert() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { visible, title, message, buttons, hide } = useAlertStore();

  const handlePress = (onPress?: () => void) => {
    hide();
    if (onPress) setTimeout(onPress, 0);
  };

  const stacked = buttons.length > 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hide}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.buttonRow, stacked && styles.buttonColumn]}>
            {buttons.map((btn, i) => {
              const color =
                btn.style === "destructive" ? theme.expense : btn.style === "cancel" ? theme.textSecondary : theme.primary;
              return (
                <TouchableOpacity
                  key={`${btn.text}-${i}`}
                  style={[
                    styles.button,
                    !stacked && buttons.length > 1 && i < buttons.length - 1 && styles.buttonBorderRight,
                    stacked && i < buttons.length - 1 && styles.buttonBorderBottom,
                  ]}
                  onPress={() => handlePress(btn.onPress)}
                >
                  <Text style={[styles.buttonText, { color, fontWeight: btn.style === "cancel" ? "500" : "700" }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xxl,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.surfaceElevated,
    borderRadius: Radius.xl,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    overflow: "hidden",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: Spacing.xl,
    marginHorizontal: -Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  buttonColumn: {
    flexDirection: "column",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBorderRight: {
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  buttonBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  buttonText: {
    fontSize: 15,
  },
});
