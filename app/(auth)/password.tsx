import { FloatingTextInput } from "@/components/FloatingTextInput";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

export default function PasswordScreen() {
  const router = useRouter();
  const { email, avatarUri } = useLocalSearchParams();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const backAction = () => {
      // Kapag nag-return tayo ng 'true', sinasabihan natin ang Android na
      // "Ako na ang bahala dito, wag mong ibalik sa nakaraang screen."
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    // Cleanup function kapag umalis na sila sa screen na ito
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (email && typeof email === "string" && !fullName) {
      const prefix = email.split("@")[0];
      setFullName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
    }
  }, [email, fullName]);

  const handleContinue = async () => {
    let hasError = false;
    setNameError("");
    setPasswordError("");

    if (!fullName.trim()) {
      setNameError("Please enter a display name.");
      hasError = true;
    }

    const hasNumber = /\d/.test(password);
    if (password.length < 8 || !hasNumber) {
      setPasswordError(
        "Password must be at least 8 characters and include a number.",
      );
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      // 1. KUNIN ANG CURRENT USER (Dahil naka-login na sila sa background after ma-verify ang OTP)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user)
        throw new Error("Session expired. Please restart the setup.");

      // 2. I-SET ANG PERMANENTENG PASSWORD NILA
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateAuthError) throw updateAuthError;

      let finalAvatarUrl = null;

      // 3. UPLOAD AVATAR (Kung may pinili sila mula sa nakaraang screen)
      if (avatarUri) {
        const ext = (avatarUri as string).substring(
          (avatarUri as string).lastIndexOf(".") + 1,
        );
        const fileName = `${user.id}_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append("files", {
          uri: avatarUri,
          name: fileName,
          type: `image/${ext}`,
        } as any);

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, formData);

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(fileName);
          finalAvatarUrl = publicUrl;
        } else {
          console.log("Avatar upload failed, continuing setup:", uploadError);
        }
      }

      // 4. GENERATE USERNAME AT I-SAVE SA PROFILES TABLE
      const baseName = fullName
        .trim()
        .replace(/\s+/g, "")
        .toLowerCase()
        .substring(0, 8);
      const randomNums = Math.floor(1000 + Math.random() * 9000);
      const generatedUsername = `${baseName}${randomNums}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: generatedUsername,
          ...(finalAvatarUrl && { avatar_url: finalAvatarUrl }),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 5. SUCCESS! IPASA NA SA PREFERENCES PARA PUMILI NG GENRES
      router.replace("/(auth)/preferences");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      Alert.alert("Account Setup Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {/* SENIOR DEV UX FIX: Tinanggal natin ang Back button dito para hindi masira ang onboarding flow */}

      <View className="px-8 gap-8 pt-32 pb-10 flex-1 justify-between">
        <View>
          <View className="mb-8">
            <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">
              Account Details
            </Text>
            <Text className="text-slate-500 text-base mt-2 leading-6">
              Set up your display name and secure your account with a password.
            </Text>
          </View>

          <View className="gap-5">
            <View className="gap-1">
              <FloatingTextInput
                label="Display Name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setNameError("");
                }}
                autoCapitalize="words"
              />
              {nameError ? (
                <Text className="text-red-500 text-sm ml-2 mt-1">
                  {nameError}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center justify-between pl-2 mt-2">
              <Pressable
                className="flex-row items-center"
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  className={`w-5 h-5 rounded border items-center justify-center mr-3 ${rememberMe ? "bg-primary border-primary" : "border-gray-300"}`}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-slate-600 font-medium">Remember me</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  console.log("Navigate to Learn More link");
                }}
              >
                <Text className="text-primary text-sm font-semibold">
                  Learn more
                </Text>
              </Pressable>
            </View>

            <View className="gap-1">
              <FloatingTextInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError("");
                }}
                isPassword={true}
              />
              {passwordError ? (
                <Text className="text-red-500 text-sm ml-2 mt-1">
                  {passwordError}
                </Text>
              ) : (
                <Text className="text-slate-400 text-xs ml-2 mt-1">
                  Must be at least 8 characters and include a number.
                </Text>
              )}
            </View>
          </View>
        </View>

        <View className="mt-auto pt-8">
          <Pressable
            className={`flex-row items-center justify-center rounded-full bg-primary px-5 py-4 ${!fullName || !password || loading ? "opacity-50" : "active:bg-blue-700"}`}
            onPress={handleContinue}
            disabled={!fullName || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Finish</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
