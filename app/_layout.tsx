import { supabase } from "@/lib/supabase";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./global.css";
// SENIOR DEV FIX: Import para sa Status Bar
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkBanStatus = async (session: any) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", session.user.id)
          .single();

        if (profile?.status === "banned") {
          await supabase.auth.signOut();

          const inAuthGroup = segments[0] === "(auth)";

          // Kung nasa loob siya ng app (ex. Home), tsaka natin siya i-kick at i-alert
          if (!inAuthGroup) {
            Alert.alert(
              "Account Suspended",
              "Your account has been banned. Please contact support.",
            );
            router.replace("/(auth)/login");
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkBanStatus(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkBanStatus(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, segments]);

  return (
    // SENIOR DEV FIX: Balutin ang buong Stack dito at wag kalimutan ang flex: 1!
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SENIOR DEV FIX: Force Dark Status Bar Icons & Text globally */}
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="book/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="book/read/[chapterId]"
          options={{ headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
