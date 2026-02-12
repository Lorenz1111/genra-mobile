import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FormField } from "../../components/FormField";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const routeAfterAuth = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      Alert.alert("Session missing", "Please sign in again.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("interests")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      Alert.alert("Profile load failed", profileError.message);
      return;
    }

    const interests = profile?.interests;
    const hasEnough =
      Array.isArray(interests) && interests.length >= 3;

    router.replace(hasEnough ? "/(tabs)/home" : "/(auth)/preferences");
  };

  // Standard Email Login
  const onSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw error;
      await routeAfterAuth();
    } catch (error: any) {
      Alert.alert("Sign in failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Helper function na kayang magbasa ng "Code" (PKCE) at "Token"
  const createSessionFromUrl = async (url: string) => {
    try {
      // 1. Parse Parameters (Check kung may ?code= o #access_token=)
      const params: { [key: string]: string } = {};

      // Kunin ang query params (?) at hash params (#)
      const queryString = url.split("?")[1];
      const hashString = url.split("#")[1];

      const parts = [queryString, hashString].filter(Boolean);

      parts.forEach(part => {
        part?.split("&").forEach(param => {
          const [key, value] = param.split("=");
          if (key && value) params[key] = decodeURIComponent(value);
        });
      });

      // 2. Scenario A: PKCE Flow (Ang bagong standard - May "code")
      if (params.code) {
        console.log("Found PKCE Code, exchanging...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
        return data.session;
      }

      // 3. Scenario B: Implicit Flow (Luma/Web - May "access_token")
      if (params.access_token && params.refresh_token) {
        console.log("Found Tokens, setting session...");
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) throw error;
        return data.session;
      }

      return null;
    } catch (error) {
      console.error("Session creation error:", error);
      return null;
    }
  };

  const performGoogleLogin = async () => {
    if (loading || googleLoading) return;

    setGoogleLoading(true);
    try {
      // Step 1: Redirect URI (Tiyakin na exp:// o genramobile:// ito)
      const redirectUri = makeRedirectUri({
        preferLocalhost: false,
      });

      console.log("Redirecting to:", redirectUri);

      // Step 2: Start OAuth Flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      // Step 3: Open Browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUri
        );

        // Step 4: Handle Return (DITO YUNG FIX)
        if (result.type === "success" && result.url) {
          const session = await createSessionFromUrl(result.url);

          if (session) {
            await routeAfterAuth(); // Success! Pasok sa Home or Preferences
          } else {
            Alert.alert("Login Error", "Failed to create session from URL.");
          }
        }
      }
    } catch (error: any) {
      if (!error.message.includes("cancel") && !error.message.includes("dismiss")) {
        Alert.alert("Google Login Failed", error.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const performFacebookLogin = async () => {
    if (loading || facebookLoading) return;

    setFacebookLoading(true);
    try {
      const redirectUri = makeRedirectUri({
        preferLocalhost: false,
      });

      console.log("Redirecting to:", redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === "success" && result.url) {
          const session = await createSessionFromUrl(result.url);

          if (session) {
            await routeAfterAuth();
          } else {
            Alert.alert("Login Error", "Failed to create session from URL.");
          }
        }
      }
    } catch (error: any) {
      if (!error.message.includes("cancel") && !error.message.includes("dismiss")) {
        Alert.alert("Facebook Login Failed", error.message);
      }
    } finally {
      setFacebookLoading(false);
    }
  };

  // ... (Keep the RETURN UI part same as before) ...
  return (
      <View className="flex-1 bg-white px-6 justify-center">
        <View className="gap-8">
          <View className="items-center gap-2">
            <Text className="text-slate-900 text-3xl font-semibold">Welcome Back</Text>
            <Text className="text-slate-600 text-base">Sign in to continue reading on Genra.</Text>
          </View>

          <View className="gap-4">
            <FormField label="Email" value={email} onChangeText={setEmail} placeholder="you@genra.io" autoCapitalize="none" keyboardType="email-address" />
            <FormField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

            <Pressable className={`flex-row items-center justify-center rounded-xl bg-primary px-5 py-4 ${loading ? "opacity-80" : ""}`} onPress={onSignIn} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white text-center font-semibold">Sign in</Text>}
            </Pressable>
          </View>

          <View className="items-center"><Text className="text-slate-500 text-sm">Or</Text></View>

          <Pressable className={`flex-row items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-4 ${googleLoading ? "opacity-80" : ""}`} onPress={performGoogleLogin} disabled={googleLoading || loading}>
            {googleLoading ? <ActivityIndicator color="#0f172a" /> : <Text className="text-slate-900 text-center font-semibold">Continue with Google</Text>}
          </Pressable>

          <Pressable className={`mt-3 flex-row items-center justify-center rounded-xl bg-[#1877F2] px-5 py-4 ${facebookLoading ? "opacity-80" : ""}`} onPress={performFacebookLogin} disabled={facebookLoading || loading}>
            {facebookLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="logo-facebook" size={18} color="#ffffff" />
                <Text className="text-white text-center font-semibold">Continue with Facebook</Text>
              </View>
            )}
          </Pressable>

          <Link href="/(auth)/register" className="text-center text-primary mt-2">New here? Create an account</Link>
        </View>
      </View>
  );
}
