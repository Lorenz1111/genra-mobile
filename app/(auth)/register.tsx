import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { FormField } from "../../components/FormField";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  const onSignUp = async () => {
    if (loading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }

      if (data.session) {
        await routeAfterAuth();
        return;
      }

      Alert.alert("Account created!", "Check your email to verify your account.");
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert("Sign up failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-slate-900 text-3xl font-semibold">Create account</Text>
      <Text className="text-slate-600 mt-2 text-base">
        Start building your Genra library today.
      </Text>

      <View className="mt-10 space-y-4">
        <FormField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Ava Reader"
          autoCapitalize="words"
        />
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@genra.io"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />
      </View>

      <Pressable
        className={`mt-8 rounded-xl bg-primary px-5 py-4 ${loading ? "opacity-80" : ""}`}
        onPress={onSignUp}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Creating account..." : "Sign up"}
        </Text>
      </Pressable>

      <Link href="/(auth)/login" className="mt-6 text-primary">
        Already have an account? Sign in
      </Link>
    </View>
  );
}
