import { Tabs } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../lib/theme";

/** Center "Add" action — bigger, raised, visually distinct (Section 4). */
function AddTabButton({
  onPress,
  accessibilityState,
}: {
  onPress?: BottomTabBarButtonProps["onPress"];
  accessibilityState?: BottomTabBarButtonProps["accessibilityState"];
}) {
  return (
    <View style={styles.addWrap} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rate a hotel"
        accessibilityState={accessibilityState}
        onPress={onPress}
        style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
      >
        <Ionicons name="add" size={32} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <AddTabButton
              onPress={props.onPress}
              accessibilityState={props.accessibilityState}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "My Log",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const ADD_SIZE = 58;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 64,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  addWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    position: "absolute",
    bottom: 6,
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addPressed: { opacity: 0.85 },
});
