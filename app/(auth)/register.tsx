import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { FloatingTextInput } from "@/components/FloatingTextInput";

export default function RegisterScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");

    // STATES PARA SA INLINE VALIDATION
    const [emailError, setEmailError] = useState("");
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);

    const performOAuth = async (provider: 'google' | 'facebook') => {
        setSocialLoading(provider);
        setEmailError(""); // Reset error pag nag-social login
        try {
            const redirectUrl = Linking.createURL('/(auth)/register');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider, options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                if (result.type === "success") {
                    await supabase.auth.getSessionFromUrl(result.url);
                    router.replace("/(auth)/setup-profile");
                }
            }
        } catch (error: any) {
            setEmailError(error.message); // Inline error imbes na Alert
        } finally {
            setSocialLoading(null);
        }
    };

    const handleContinue = async () => {
        setEmailError(""); // Reset natin yung error bago mag-check ulit
        const trimmedEmail = email.trim();

        // 1. Check kung valid ang format
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            setEmailError("Please enter a valid email address.");
            return;
        }

        setLoading(true);

        try {
            // 2. Check kung registered na sa database (Requires 'email' column sa profiles table)
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', trimmedEmail)
                .maybeSingle(); // maybeSingle para hindi mag-error kung walang mahanap

            if (data) {
                setEmailError("This email is already registered. Please sign in.");
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error("DB Check Error:", err);
        }

        setLoading(false);

        // 3. Kung walang error at hindi pa registered, proceed sa next step!
        router.push({
            pathname: "/(auth)/setup-profile",
            params: { email: trimmedEmail }
        });
    };

    return (
        // Ibininalik natin yung justifyContent: 'center' para saktong gitna gaya ng Login
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View className="px-8 gap-8 py-10">

                {/* Header */}
                <View className="items-center mb-2">
                    <Text className="text-slate-900 text-3xl font-extrabold tracking-tight text-center">Create Account</Text>
                    <Text className="text-slate-500 text-base mt-2 text-center">Join GenrA and start your reading journey</Text>
                </View>

                {/* Social Buttons */}
                <View className="gap-3">
                    <Pressable
                        className={`flex-row items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-4 ${socialLoading ? "opacity-50" : "active:bg-gray-50"}`}
                        onPress={() => performOAuth('google')} disabled={!!socialLoading || loading}
                    >
                        {socialLoading === 'google' ? <ActivityIndicator color="#0f172a" /> : (
                            <>
                                <Ionicons name="logo-google" size={20} color="#DB4437" className="absolute left-6" />
                                <Text className="text-slate-700 font-semibold ml-2">Continue with Google</Text>
                            </>
                        )}
                    </Pressable>

                    <Pressable
                        className={`flex-row items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-4 ${socialLoading ? "opacity-50" : "active:bg-gray-50"}`}
                        onPress={() => performOAuth('facebook')} disabled={!!socialLoading || loading}
                    >
                        {socialLoading === 'facebook' ? <ActivityIndicator color="#0f172a" /> : (
                            <>
                                <Ionicons name="logo-facebook" size={20} color="#1877F2" className="absolute left-6" />
                                <Text className="text-slate-700 font-semibold ml-2">Continue with Facebook</Text>
                            </>
                        )}
                    </Pressable>
                </View>

                <View className="flex-row items-center">
                    <View className="flex-1 h-[1px] bg-gray-200" />
                    <Text className="text-slate-400 text-xs mx-4 font-medium uppercase">Or sign up with email</Text>
                    <View className="flex-1 h-[1px] bg-gray-200" />
                </View>

                {/* Email Form & Inline Error */}
                <View className="gap-2">
                    <FloatingTextInput
                        label="Email address"
                        value={email}
                        onChangeText={(text) => { setEmail(text); setEmailError(""); }} // Tatanggalin yung red text pag nag-type ulit
                        autoCapitalize="none"
                        keyboardType="email-address"
                        textContentType="emailAddress" // Trigger para sa iOS Keychain
                        autoComplete="email"   // Trigger para sa Android Smart Lock
                    />

                    {/* Dito lalabas yung red inline validation text */}
                    {emailError ? (
                        <Text className="text-red-500 text-sm ml-2">{emailError}</Text>
                    ) : null}

                    <Pressable
                        className={`mt-4 flex-row items-center justify-center rounded-full border-2 border-primary bg-primary px-5 py-4 ${loading || !email ? "opacity-80" : "active:bg-blue-700"}`}
                        onPress={handleContinue} disabled={loading || !email}
                    >
                        {loading ? <ActivityIndicator color="white" /> : (
                            <View className="flex-row items-center justify-center gap-2">
                                <Text className="text-white font-bold text-base">Continue</Text>
                                <Ionicons name="arrow-forward" size={20} color="white" />
                            </View>
                        )}
                    </Pressable>

                    {/* Privacy Policy Text */}
                    <Text className="text-center text-slate-500 text-xs mt-3 px-4 leading-5">
                        By continuing, you agree to our{' '}
                        <Text className="text-primary font-bold">Terms of Service</Text> and acknowledge our{' '}
                        <Text className="text-primary font-bold">Privacy Policy</Text>.
                    </Text>
                </View>

                {/* Footer */}
                <View className="flex-row justify-center items-center mt-2">
                    <Text className="text-slate-500">Already have an account? </Text>
                    <Link href="/(auth)/login" asChild>
                        <Pressable><Text className="text-primary font-bold">Sign in instead</Text></Pressable>
                    </Link>
                </View>

            </View>

            {/* --- GENRA BOTTOM LOGO --- */}
            <View className="absolute bottom-0 w-full items-center pb-10">
                <Text
                    className="text-xl tracking-wide"
                    style={{ fontFamily: "Garet", fontWeight: "bold", color: "lightgray" }}
                >
                    GenrA
                </Text>
            </View>
        </ScrollView>
    );
}