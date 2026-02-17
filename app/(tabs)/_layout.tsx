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
                    height: 60, // Added height for better spacing
                    paddingBottom: 10, // Added padding for modern look
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
                    let iconName: any = "home"; // Default

                    if (route.name === "home") {
                        iconName = focused ? "home" : "home-outline";
                    } else if (route.name === "search") {
                        iconName = focused ? "search" : "search-outline";
                    } else if (route.name === "library") {
                        iconName = focused ? "library" : "library-outline";
                    } else if (route.name === "profile") {
                        iconName = focused ? "person" : "person-outline";
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
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