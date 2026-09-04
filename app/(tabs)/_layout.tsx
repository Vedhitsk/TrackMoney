import { Tabs } from "expo-router";
import React from "react";

import { TabBar } from "@/components/tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="none"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="activity" options={{ title: "Activity" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
      <Tabs.Screen name="manage" options={{ title: "Manage" }} />
    </Tabs>
  );
}
