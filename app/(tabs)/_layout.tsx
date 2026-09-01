import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import { Tabs } from "expo-router";
import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { HapticTab } from "@/components/haptic-tab";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export default function TabLayout() {
  const theme = useAppTheme();

  const insets = useSafeAreaInsets();

  return (
    <Tabs
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopColor: theme.border,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Records",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="receipt-long" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="pie-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Budgets",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="account-balance-wallet" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="credit-card" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="category" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
