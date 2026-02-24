import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import "./global.css";

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments(); // SENIOR DEV FIX: Para malaman kung nasaang screen tayo

    useEffect(() => {
        const checkBanStatus = async (session: any) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('status')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.status === 'banned') {
                    // Tahimik na i-logout sa background
                    await supabase.auth.signOut();

                    // Alamin kung nasa auth screen na ba siya (tulad ng Login)
                    const inAuthGroup = segments[0] === '(auth)';

                    // Kung nasa loob siya ng app (ex. Home), tsaka natin siya i-kick at i-alert
                    if (!inAuthGroup) {
                        Alert.alert(
                            "Account Suspended",
                            "Your account has been banned. Please contact support."
                        );
                        router.replace('/(auth)/login');
                    }
                }
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            checkBanStatus(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            checkBanStatus(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [segments]); // Bantayan ang paglipat-lipat ng screen

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="book/[id]" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen name="book/read/[chapterId]" options={{ headerShown: false }} />
        </Stack>
    );
}