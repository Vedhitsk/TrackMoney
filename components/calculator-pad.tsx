import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemedText } from "@/components/themed-text";


type Props = {
  value: string;
  onChange: (value: string) => void;
};

/** Plain numeric keypad (digits + decimal + backspace, long-press backspace to clear) — matches the reference design, no arithmetic operators. */
export function CalculatorPad({ value, onChange }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const handlePress = (key: string) => {
    if (key === "C") {
      onChange("0");
      return;
    }
    if (key === "⌫") {
      const next = value.length > 1 ? value.slice(0, -1) : "0";
      onChange(next);
      return;
    }
    if (key === "." && value.includes(".")) {
      return;
    }
    if (value === "0" && key !== ".") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => {
            const isBackspace = key === "⌫";
            return (
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => handlePress(key)}
                onLongPress={isBackspace ? () => handlePress("C") : undefined}
              >
                {isBackspace ? (
                  <MaterialIcons name="backspace" size={20} color={theme.text} />
                ) : (
                  <ThemedText style={styles.keyText}>{key}</ThemedText>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    flex: 1,
    aspectRatio: 2.6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.calculator,
    borderRadius: 12,
  },
  keyText: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.text,
  },
});
