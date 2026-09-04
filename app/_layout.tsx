import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemeColors } from '@/constants/theme';
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import React from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { backfillFromInbox } from "@/lib/sms/smsIngestion";

import { ensureTablesExist } from "@/db/init";
import { PermissionModal } from "@/components/permission-modal";
import { Alert, Linking, PermissionsAndroid, LogBox } from "react-native";
LogBox.ignoreLogs(["new NativeEventEmitter()"]);

// AppRegistry.registerHeadlessTask moved to index.js for better reliability


const getNavigationTheme = (themeColors: ThemeColors, isDark: boolean) => ({
  ...(isDark ? DarkTheme : DefaultTheme),
  colors: {
    ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
    background: themeColors.background,
    card: themeColors.surface,
    text: themeColors.text,
    border: themeColors.border,
    primary: themeColors.primary,
  },
});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const theme = useAppTheme();
  const colorScheme = useColorScheme();

  const [showPermissions, setShowPermissions] = React.useState(false);

  React.useEffect(() => {
    ensureTablesExist();
    
    // Check permissions on mount
    if (Platform.OS === "android") {
      void checkPermissions();
    }
  }, []);

  const checkPermissions = async () => {
    const hasSms = await PermissionsAndroid.check("android.permission.RECEIVE_SMS");
    const hasRead = await PermissionsAndroid.check("android.permission.READ_SMS");
    // POST_NOTIFICATIONS is Android 13+
    const hasNotify = Number(Platform.Version) >= 33 
      ? await PermissionsAndroid.check("android.permission.POST_NOTIFICATIONS" as any)
      : true;

    if (!hasSms || !hasRead || !hasNotify) {
      setShowPermissions(true);
    } else {
      void backfillFromInbox();
    }
  };

  const handleGrantPermissions = async () => {
    try {
      // 1. Request SMS Combined
      const grantedSms = await PermissionsAndroid.requestMultiple([
        "android.permission.RECEIVE_SMS",
        "android.permission.READ_SMS"
      ]);

      const smsOk = grantedSms["android.permission.RECEIVE_SMS"] === "granted" && 
                    grantedSms["android.permission.READ_SMS"] === "granted";

      // 2. Request Notifications (Android 13+)
      if (Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request("android.permission.POST_NOTIFICATIONS" as any);
      }

      setShowPermissions(false);

    if (smsOk) {
        void backfillFromInbox();
        
        // 3. Battery Optimization Suggestion
        Alert.alert(
          "One Last Step 🔋",
          "Android might stop background tracking to save battery. For best results, please set Battery Optimization to 'Unrestricted' for TrackMoney.",
          [
            { text: "Skip", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (err) {
      console.error("Permission request failed", err);
    }
  };

  return (
    <ThemeProvider value={getNavigationTheme(theme, colorScheme === "dark")}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction/new" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="transaction/[id]" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="transaction/pending" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="settings" options={{ animation: "slide_from_left" }} />
          <Stack.Screen name="settings/logs" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="recoveries" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="accounts" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="categories" options={{ animation: "slide_from_right" }} />
        </Stack>
      </View>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <PermissionModal 
        visible={showPermissions} 
        onGrant={handleGrantPermissions} 
      />
    </ThemeProvider>
  );
}
