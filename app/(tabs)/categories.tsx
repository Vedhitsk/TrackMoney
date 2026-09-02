import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
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
      Alert.alert("Duplicate Name", `A category named "${duplicate.name}" already exists.`);
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
      "Delete Category",
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
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Categories</ThemedText>
        <ThemedText style={styles.countBadge}>{categories.length}</ThemedText>
      </View>

      {/* Category Grid */}
      <FlatList
        data={categories}
        numColumns={4}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => openEdit(item)}
            onLongPress={() => handleDelete(item)}>
            <View style={[styles.gridIcon, { backgroundColor: item.color + "22" }]}>
              <ThemedText style={styles.gridIconText}>{item.icon}</ThemedText>
            </View>
            <ThemedText style={styles.gridLabel} numberOfLines={1}>
              {item.name}
            </ThemedText>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <ThemedText style={styles.emptyText}>No categories yet</ThemedText>
            <ThemedText style={styles.mutedText}>Tap + to create one</ThemedText>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <MaterialIcons name="add" size={28} color={theme.white} />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={styles.modalKav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowForm(false)}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <ThemedText style={styles.modalTitle}>
              {editId ? "Edit Category" : "Add Category"}
            </ThemedText>

            <ThemedText style={styles.fieldLabel}>Name</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Food & Dining"
              placeholderTextColor={theme.textSecondary}
            />

            <ThemedText style={styles.fieldLabel}>Icon</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pickerScroll}>
              {CATEGORY_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.pickerCell, icon === ic && styles.pickerCellActive]}
                  onPress={() => setIcon(ic)}>
                  <ThemedText style={styles.pickerEmoji}>{ic}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ThemedText style={styles.fieldLabel}>Color</ThemedText>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCell,
                    { backgroundColor: c },
                    color === c && styles.colorCellActive,
                  ]}
                  onPress={() => setColor(c)}>
                  {color === c && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <ThemedText style={styles.saveBtnText}>SAVE</ThemedText>
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
  container: { flex: 1, backgroundColor: theme.background, paddingTop: 48 },
  header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
  countBadge: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.white,
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  gridRow: { gap: 0 },
  gridItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
    maxWidth: "25%",
  },
  gridIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  gridIconText: { fontSize: 24 },
  gridLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.text,
    textAlign: "center",
  },
  center: { justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: theme.textSecondary },
  mutedText: { fontSize: 13, color: theme.textSecondary },
  fab: {
    position: "absolute",
    bottom: 96,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.fab,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalKav: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 24,
    width: "88%",
    alignSelf: "center",
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: theme.text },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: theme.textSecondary, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
  },
  pickerScroll: { maxHeight: 46, marginVertical: 4 },
  pickerCell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  pickerCellActive: {
    backgroundColor: theme.primaryLight,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  pickerEmoji: { fontSize: 20 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 4 },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  colorCellActive: {
    borderWidth: 3,
    borderColor: theme.text,
  },
  saveBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: { color: theme.white, fontSize: 15, fontWeight: "700" },
});
