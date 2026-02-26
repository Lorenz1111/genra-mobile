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
                    position: 'absolute',
                    // SENIOR DEV FIX: Gamitin ang margin para sure na liliit at papagitna
                    marginBottom: 30,
                    marginHorizontal: 40, // Ito ang mag-a-adjust ng spacing sa magkabilang gilid

                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    height: 65,
                    paddingBottom: 8,
                    paddingTop: 8,
                    borderTopWidth: 0, // Importante 'to para mawala yung default na linya sa taas

                    // Android Shadow
                    elevation: 5,

                    // iOS Shadow
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.12,
                    shadowRadius: 20,
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
                    let iconName: any = "home";

                    if (route.name === "home") {
                        iconName = focused ? "home" : "home-outline";
                    } else if (route.name === "search") {
                        iconName = focused ? "search" : "search-outline";
                    } else if (route.name === "library") {
                        iconName = focused ? "library" : "library-outline";
                    } else if (route.name === "profile") {
                        iconName = focused ? "person" : "person-outline";
                    }

                    return <Ionicons name={iconName} size={size + 2} color={color} />;
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