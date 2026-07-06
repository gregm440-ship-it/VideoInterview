import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { queryClient } from "../lib/queryClient";
import { AuthProvider } from "../hooks/useAuth";
import { BRAND_FONT } from "../lib/constants";
import { colors } from "../lib/theme";

export default function RootLayout() {
  // Bundle the brand typeface. Render once it's ready (or if it fails, fall
  // back to the system font rather than blocking the app).
  const [fontsLoaded, fontError] = useFonts({
    [BRAND_FONT]: require("../assets/fonts/Archivo-ExtraBold.ttf"),
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.text,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="sign-in"
                options={{ presentation: "modal", title: "Sign in" }}
              />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
