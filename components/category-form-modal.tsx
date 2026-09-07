import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Radius, Spacing, ThemeColors, Typography } from "@/constants/theme";
import { SectionLabel } from "@/components/ui";
import { createCategory, updateCategory } from "@/db/queries/categories";
import { useTransactionStore } from "@/store/useTransactionStore";
import { showAppAlert } from "@/store/useAlertStore";
import type { Category } from "@/types";

export const CATEGORY_ICONS = [
  "🍔", "🛒", "🚗", "🏠", "🎬", "💊", "📚", "👕",
  "💡", "📱", "✈️", "🎮", "🐕", "💇", "🏋️", "💰",
  "🎁", "🍕", "☕", "🚌", "🏥", "📦", "🎵", "🔧",
];

export const CATEGORY_COLORS = [
  "#E53935", "#D81B60", "#8E24AA", "#5C6BC0",
  "#1E88E5", "#00ACC1", "#00897B", "#43A047",
  "#7CB342", "#FDD835", "#FFB300", "#FB8C00",
  "#F4511E", "#6D4C41", "#546E7A", "#78909C",
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (category: { id: number; name: string; icon: string; color: string }) => void;
  initialName?: string;
  editCategory?: Category | null;
};

export function CategoryFormModal({
  visible,
  onClose,
  onSaved,
  initialName = "",
  editCategory = null,
}: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { categories, loadCategories } = useTransactionStore();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💰");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editCategory) {
        setName(editCategory.name);
        setIcon(editCategory.icon);
        setColor(editCategory.color);
      } else {
        setName(initialName);
        setIcon("💰");
        setColor("#6366f1");
      }
    }
  }, [visible, editCategory, initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editCategory?.id,
    );
    if (duplicate) {
      showAppAlert("Duplicate name", `A category named "${duplicate.name}" already exists.`);
      return;
    }

    setSaving(true);
    try {
      if (editCategory) {
        await updateCategory(editCategory.id, { name: trimmed, icon, color });
        await loadCategories();
        onSaved({ id: editCategory.id, name: trimmed, icon, color });
      } else {
        const created = await createCategory({ name: trimmed, icon, color });
        await loadCategories();
        onSaved(created);
      }
      onClose();
    } catch (e) {
      showAppAlert("Couldn't save category", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalKav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modal} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{editCategory ? "Edit Category" : "Add Category"}</Text>

              <SectionLabel style={styles.fieldLabel}>Name</SectionLabel>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Food & Dining"
                placeholderTextColor={theme.textTertiary}
                returnKeyType="done"
                autoFocus={!editCategory}
              />

              <SectionLabel style={styles.fieldLabel}>Icon</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {CATEGORY_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.pickerCell,
                      { backgroundColor: icon === ic ? theme.primaryLight : theme.borderLight },
                      icon === ic && { borderWidth: 2, borderColor: theme.primary },
                    ]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={styles.pickerEmoji}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <SectionLabel style={styles.fieldLabel}>Color</SectionLabel>
              <View style={styles.colorGrid}>
                {CATEGORY_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorCell, { backgroundColor: c }, color === c && styles.colorCellActive]}
                    onPress={() => setColor(c)}
                  >
                    {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    modalKav: { flex: 1, justifyContent: "center", alignItems: "center" },
    modalOverlay: {
      flex: 1,
      width: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 20,
      width: "100%",
    },
    modal: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: Radius.xl,
      padding: 24,
      width: "88%",
      alignSelf: "center",
      gap: 10,
    },
    modalTitle: { ...Typography.subtitle, fontWeight: "700", color: theme.text },
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
    pickerScroll: { maxHeight: 46, marginVertical: 4 },
    pickerCell: {
      width: 42,
      height: 42,
      borderRadius: Radius.pill,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    pickerEmoji: { fontSize: 20 },
    colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 4 },
    colorCell: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    colorCellActive: { borderWidth: 3, borderColor: theme.text },
    saveBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: Radius.md,
      alignItems: "center",
      marginTop: 6,
    },
    saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  });
