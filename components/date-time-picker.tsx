import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { AppColors } from "@/constants/theme";

type Props = {
  value: Date;
  maximumDate?: Date;
  onChange: (date: Date) => void;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOffset(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function clampToMax(date: Date, max?: Date): Date {
  if (!max) return date;
  return date > max ? new Date(max) : date;
}

export function DatePickerModal({
  visible,
  value,
  maximumDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const days = daysInMonth(viewYear, viewMonth);
  const offset = firstDayOffset(viewYear, viewMonth);
  const selectedDay = value.getFullYear() === viewYear && value.getMonth() === viewMonth ? value.getDate() : -1;

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    if (maximumDate) {
      const nextStart = new Date(nextYear, nextMonth, 1);
      if (nextStart > maximumDate) return;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const selectDay = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day, value.getHours(), value.getMinutes());
    const clamped = clampToMax(picked, maximumDate);
    onSelect(clamped);
    onClose();
  };

  const todayBtn = () => {
    const now = clampToMax(new Date(), maximumDate);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const picked = new Date(now.getFullYear(), now.getMonth(), now.getDate(), value.getHours(), value.getMinutes());
    onSelect(picked);
    onClose();
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {/* Month/Year header */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={goPrev}>
              <MaterialIcons name="chevron-left" size={28} color={AppColors.text} />
            </TouchableOpacity>
            <ThemedText style={styles.navLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </ThemedText>
            <TouchableOpacity onPress={goNext}>
              <MaterialIcons name="chevron-right" size={28} color={AppColors.text} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.weekRow}>
            {DAY_LABELS.map((l) => (
              <ThemedText key={l} style={styles.weekLabel}>{l}</ThemedText>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`e${idx}`} style={styles.dayCell} />;
              }
              const isSel = day === selectedDay;
              const isDisabled = maximumDate
                ? new Date(viewYear, viewMonth, day) > maximumDate
                : false;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, isSel && styles.dayCellSelected]}
                  disabled={isDisabled}
                  onPress={() => selectDay(day)}>
                  <ThemedText
                    style={[
                      styles.dayText,
                      isSel && styles.dayTextSelected,
                      isDisabled && styles.dayTextDisabled,
                    ]}>
                    {day}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today button */}
          <TouchableOpacity style={styles.todayBtn} onPress={todayBtn}>
            <ThemedText style={styles.todayBtnText}>TODAY</ThemedText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function TimePickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  const incHour = () => setHour((h) => (h + 1) % 24);
  const decHour = () => setHour((h) => (h - 1 + 24) % 24);
  const incMin = () => setMinute((m) => (m + 1) % 60);
  const decMin = () => setMinute((m) => (m - 1 + 60) % 60);

  const handleDone = () => {
    const d = new Date(value);
    d.setHours(hour, minute);
    onSelect(d);
    onClose();
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <ThemedText style={styles.timeTitle}>Select Time</ThemedText>

          <View style={styles.timeRow}>
            {/* Hour */}
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={incHour} style={styles.timeArrow}>
                <MaterialIcons name="keyboard-arrow-up" size={30} color={AppColors.text} />
              </TouchableOpacity>
              <ThemedText style={styles.timeDigit}>{pad(hour)}</ThemedText>
              <TouchableOpacity onPress={decHour} style={styles.timeArrow}>
                <MaterialIcons name="keyboard-arrow-down" size={30} color={AppColors.text} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.timeColon}>:</ThemedText>

            {/* Minute */}
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={incMin} style={styles.timeArrow}>
                <MaterialIcons name="keyboard-arrow-up" size={30} color={AppColors.text} />
              </TouchableOpacity>
              <ThemedText style={styles.timeDigit}>{pad(minute)}</ThemedText>
              <TouchableOpacity onPress={decMin} style={styles.timeArrow}>
                <MaterialIcons name="keyboard-arrow-down" size={30} color={AppColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <ThemedText style={styles.doneBtnText}>DONE</ThemedText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    width: 320,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.text,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCellSelected: {
    backgroundColor: AppColors.primary,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.text,
  },
  dayTextSelected: {
    color: AppColors.white,
  },
  dayTextDisabled: {
    color: AppColors.borderLight,
  },
  todayBtn: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: AppColors.primaryLight,
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  timeCol: {
    alignItems: "center",
    gap: 4,
  },
  timeArrow: {
    padding: 4,
  },
  timeDigit: {
    fontSize: 36,
    fontWeight: "700",
    color: AppColors.text,
    minWidth: 60,
    textAlign: "center",
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingVertical: 8,
    overflow: "hidden",
  },
  timeColon: {
    fontSize: 32,
    fontWeight: "700",
    color: AppColors.text,
  },
  doneBtn: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.white,
  },
});
