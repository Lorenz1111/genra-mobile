import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Image, ScrollView, Alert } from "react-native"; // SENIOR DEV FIX: Idinagdag ang Alert dito!
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from 'expo-secure-store';
import { FloatingTextInput } from "@/components/FloatingTextInput";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync('genra_email');
        const savedPassword = await SecureStore.getItemAsync('genra_password');

        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        console.error("Failed to load credentials", error);
      }
    };
    loadCredentials();
  }, []);

  const onSignIn = async () => {
    setAuthError(null);

    if (!email.trim() || !password) {
      setAuthError("Invalid email or password.");
      return;
    }

    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      setAuthError("Invalid email or password.");
    } else if (authData.user) {

      // I-check ang ban status
      const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', authData.user.id)
          .single();

      if (profile?.status === 'banned') {
        await supabase.auth.signOut();
        setLoading(false); // Itigil ang ikot ng button

        setTimeout(() => {
          Alert.alert(
              "Access Denied",
              "Your account has been suspended by the admin. If you believe this is a mistake, please contact support."
          );
        }, 100);
        return;
      }

      if (rememberMe) {
        await SecureStore.setItemAsync('genra_email', email.trim());
        await SecureStore.setItemAsync('genra_password', password);
      } else {
        await SecureStore.deleteItemAsync('genra_email');
        await SecureStore.deleteItemAsync('genra_password');
      }

      router.replace("/(tabs)/home");
    }
    setLoading(false);
  };

  const establishSessionFromOAuthUrl = async (callbackUrl: string) => {
    const parsedUrl = new URL(callbackUrl);
    const queryParams = parsedUrl.searchParams;
    const hashParams = new URLSearchParams(parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash);

    const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
    const authCode = queryParams.get("code") ?? hashParams.get("code");

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { session: data.session, error };
    }

    if (authCode) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
      return { session: data.session, error };
    }

    return { session: null, error: new Error("No OAuth session data found in callback URL.") };
  };

  const performOAuth = async (provider: 'google' | 'facebook') => {
    setAuthError(null);
    setSocialLoading(provider);
    try {
      const redirectUrl = Linking.createURL('/(auth)/login');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider, options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        setAuthError("Social login failed. Please try again.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type !== "success" || !result.url) {
        return;
      }

      const { session, error: sessionError } = await establishSessionFromOAuthUrl(result.url);
      if (sessionError || !session?.user) {
        setAuthError("Social login failed. Please try again.");
        return;
      }

      const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', session.user.id)
          .single();

      if (profile?.status === 'banned') {
        await supabase.auth.signOut();
        setSocialLoading(null); // Itigil ang ikot ng social button

        // SENIOR DEV FIX: Pinantay natin yung Alert sa native UI para walang page reload
        setTimeout(() => {
          Alert.alert(
              "Access Denied",
              "Your account has been suspended by the admin. If you believe this is a mistake, please contact support."
          );
        }, 100);
        return;
      }

      router.replace("/(tabs)/home");
    } catch (oauthError) {
      console.error("OAuth login error", oauthError);
      setAuthError("Social login failed. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="px-8 gap-8 py-10">

          <Image source={require("../../assets/images/genra-logo.png")}
                 className="self-center w-25 h-25"
                 resizeMode="contain"/>

          {/* Header */}
          <View className="items-center mb-2">
            <Text className="text-slate-900 text-3xl font-extrabold tracking-tight text-center">Welcome Back!</Text>
            <Text className="text-slate-500 text-base mt-2 text-center">Sign in to continue to GenrA</Text>
          </View>

          {/* Social Logins */}
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
            <Text className="text-slate-400 text-xs mx-4 font-medium uppercase">Or sign in with email</Text>
            <View className="flex-1 h-[1px] bg-gray-200" />
          </View>

          {/* Email & Password Form */}
          <View className="gap-2">

            <FloatingTextInput
                label="Email address"
                value={email}
                onChangeText={(text) => { setEmail(text); setAuthError(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
            />
            {authError ? (
                <Text className="text-red-500 text-sm ml-2">{authError}</Text>
            ) : null}

            <FloatingTextInput
                label="Password"
                value={password}
                onChangeText={(text) => { setPassword(text); setAuthError(null); }}
                isPassword={true}
            />
            {authError ? (
                <Text className="text-red-500 text-sm ml-2">{authError}</Text>
            ) : null}

            {/* Remember Me & Forgot Password */}
            <View className="flex-row items-center justify-between mt-2">
              <Pressable className="flex-row items-center pl-1" onPress={() => setRememberMe(!rememberMe)}>
                <View className={`w-5 h-5 rounded border items-center justify-center mr-2 ${rememberMe ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
                <Text className="text-slate-600 text-sm font-medium">Remember me</Text>
              </Pressable>

              <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
                <Text className="text-primary text-sm font-semibold">Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable
                className={`mt-4 flex-row items-center justify-center rounded-full border-2 border-primary bg-primary px-5 py-4 ${loading ? "opacity-80" : "active:bg-blue-700"}`}
                onPress={onSignIn} disabled={loading || !!socialLoading}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Sign In</Text>}
            </Pressable>
          </View>

          {/* Footer */}
          <View className="flex-row justify-center items-center mt-2">
            <Text className="text-slate-500">Don&apos;t have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable><Text className="text-primary font-bold"> Sign up for free</Text></Pressable>
            </Link>
          </View>

        </View>
      </ScrollView>
  );
}
