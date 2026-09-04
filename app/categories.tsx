import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, ThemeColors, Typography } from '@/constants/theme';
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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
import { useRouter } from "expo-router";

import { IconTile, SectionLabel } from "@/components/ui";
import { useTransactionStore } from "@/store/useTransactionStore";

import type { Category } from "@/types";

const CATEGORY_ICONS = [
  "🍔", "🛒", "🚗", "🏠", "🎬", "💊", "📚", "👕",
  "💡", "📱", "✈️", "🎮", "🐕", "💇", "🏋️", "💰",
  "🎁", "🍕", "☕", "🚌", "🏥", "📦", "🎵", "🔧",
];

const CATEGORY_COLORS = [
  "#E53935", "#D81B60", "#8E24AA", "#5C6BC0",
  "#1E88E5", "#00ACC1", "#00897B", "#43A047",
  "#7CB342", "#FDD835", "#FFB300", "#FB8C00",
  "#F4511E", "#6D4C41", "#546E7A", "#78909C",
];

export default function CategoriesScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const { categories, loadCategories } = useTransactionStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💰");
  const [color, setColor] = useState("#6366f1");

  useEffect(() => {
    void loadCategories();
  }, []);

  const openAdd = () => {
    setEditId(null);
    setName("");
    setIcon("💰");
    setColor("#6366f1");
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setShowForm(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editId,
    );
    if (duplicate) {
      Alert.alert("Duplicate name", `A category named "${duplicate.name}" already exists.`);
      return;
    }

    if (editId) {
      const { updateCategory } = await import("@/db/queries/categories");
      await updateCategory(editId, { name: trimmed, icon, color });
    } else {
      const { createCategory } = await import("@/db/queries/categories");
      await createCategory({ name: trimmed, icon, color });
    }
    setShowForm(false);
    await loadCategories();
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      "Delete category",
      `Delete "${cat.name}"? Transactions using it will become uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { deleteCategory } = await import("@/db/queries/categories");
            await deleteCategory(cat.id);
            await loadCategories();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{categories.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        numColumns={4}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => openEdit(item)}
            onLongPress={() => handleDelete(item)}>
            <IconTile emoji={item.icon} color={item.color} size={56} />
            <Text style={styles.gridLabel} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No categories yet</Text>
            <Text style={styles.mutedText}>Tap + to create one</Text>
          </View>
        }
      />

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalKav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowForm(false)}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modal} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>{editId ? "Edit Category" : "Add Category"}</Text>

                <SectionLabel style={styles.fieldLabel}>Name</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Food & Dining"
                  placeholderTextColor={theme.textTertiary}
                />

                <SectionLabel style={styles.fieldLabel}>Icon</SectionLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {CATEGORY_ICONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[styles.pickerCell, { backgroundColor: icon === ic ? theme.primaryLight : theme.borderLight }, icon === ic && { borderWidth: 2, borderColor: theme.primary }]}
                      onPress={() => setIcon(ic)}>
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
                      onPress={() => setColor(c)}>
                      {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { ...Typography.subtitle, color: theme.text },
  countBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  gridItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 6, maxWidth: "25%" },
  gridLabel: { fontSize: 12, fontWeight: "600", color: theme.text, textAlign: "center" },
  center: { justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: theme.textSecondary },
  mutedText: { fontSize: 13, color: theme.textSecondary },
  modalKav: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, width: "100%", backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalScrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20, width: "100%" },
  modal: { backgroundColor: theme.surfaceElevated, borderRadius: Radius.xl, padding: 24, width: "88%", alignSelf: "center", gap: 10 },
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
  pickerScroll: { maxHeight: 46, marginVertical: 4 },
  pickerCell: { width: 42, height: 42, borderRadius: Radius.pill, justifyContent: "center", alignItems: "center", marginRight: 8 },
  pickerEmoji: { fontSize: 20 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 4 },
  colorCell: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  colorCellActive: { borderWidth: 3, borderColor: theme.text },
  saveBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: Radius.md, alignItems: "center", marginTop: 6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
