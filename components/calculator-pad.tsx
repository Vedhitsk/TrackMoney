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
    if (key === "=") {
      try {
        const expr = value
          .replace(/×/g, "*")
          .replace(/÷/g, "/");
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result === "number" && isFinite(result)) {
          onChange(String(Math.round(result * 100) / 100));
        }
      } catch {
        // invalid expression, ignore
      }
      return;
    }
    if (key === ".") {
      const parts = value.split(/[+\-×÷]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes(".")) return;
    }
    if (["+", "-", "×", "÷"].includes(key)) {
      const lastChar = value[value.length - 1];
      if (["+", "-", "×", "÷"].includes(lastChar)) {
        onChange(value.slice(0, -1) + key);
        return;
      }
    }
    if (value === "0" && ![".", "+", "-", "×", "÷"].includes(key)) {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  const rows = [
    ["+", "7", "8", "9"],
    ["-", "4", "5", "6"],
    ["×", "1", "2", "3"],
    ["÷", "0", ".", "="],
  ];

  return (
    <View style={styles.container}>
      {/* Display */}
      <View style={styles.display}>
        <ThemedText style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </ThemedText>
        <TouchableOpacity onPress={() => handlePress("⌫")} style={styles.backspace}>
          <MaterialIcons name="backspace" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Keys */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => {
            const isOperator = ["+", "-", "×", "÷"].includes(key);
            const isEquals = key === "=";
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  isOperator && styles.operatorKey,
                  isEquals && styles.equalsKey,
                ]}
                onPress={() => handlePress(key)}>
                <ThemedText
                  style={[
                    styles.keyText,
                    isOperator && styles.operatorKeyText,
                    isEquals && styles.equalsKeyText,
                  ]}>
                  {key}
                </ThemedText>
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
  display: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  displayText: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: theme.text,
    textAlign: "right",
  },
  backspace: {
    marginLeft: 12,
    padding: 4,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    flex: 1,
    aspectRatio: 1.6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.calculator,
    borderRadius: 8,
  },
  keyText: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
  },
  operatorKey: {
    backgroundColor: theme.calculatorDark,
  },
  operatorKeyText: {
    fontSize: 22,
    color: theme.text,
  },
  equalsKey: {
    backgroundColor: theme.primary,
  },
  equalsKeyText: {
    color: "#FFFFFF",
  },
});
