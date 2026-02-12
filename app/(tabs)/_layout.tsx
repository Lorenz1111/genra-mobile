import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const textDark = "#0f172a";
const slate500 = "#64748b";
const primaryBlue = "#2563EB";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: primaryBlue,
        tabBarInactiveTintColor: slate500,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          elevation: 0,
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          borderBottomWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: textDark,
        headerShadowVisible: false,
        tabBarIcon: ({ color, size, focused }) => {
          const icon =
            route.name === "home"
              ? focused
                ? "home"
                : "home-outline"
              : route.name === "search"
                ? focused
                  ? "search"
                  : "search-outline"
                : route.name === "library"
                  ? focused
                    ? "library"
                    : "library-outline"
                  : focused
                    ? "person"
                    : "person-outline";

          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
