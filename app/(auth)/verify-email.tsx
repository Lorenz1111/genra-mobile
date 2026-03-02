import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [countdown, setCountdown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (otpCode: string) => {
    if (otpCode.length !== CODE_LENGTH) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email as string,
        token: otpCode,
        type: "signup",
      });

      if (error) throw error;

      router.replace({
        pathname: "/(auth)/setup-profile",
        params: { email },
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired code.");
      setCode("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCountdown(30);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email as string,
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code.");
    }
  };

  const handleCodeChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    setCode(cleanText);
    if (cleanText.length === CODE_LENGTH) {
      handleVerify(cleanText);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <Pressable
        onPress={() => router.back()}
        className="absolute top-16 left-6 p-2 z-10 flex-row items-center"
      >
        <Ionicons name="arrow-back" size={24} color="#64748b" />
        <Text className="text-slate-500 ml-1 font-semibold">Change Email</Text>
      </Pressable>

      <View className="px-8 flex-1 pt-32 pb-10">
        {/* Header - Inalis ang icon para pumantay sa Forgot Password flow */}
        <View className="mb-2">
          <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">
            Verify Your Email
          </Text>
          <Text className="text-slate-500 text-base mt-2 leading-6">
            We sent a 6-digit code to{" "}
            <Text className="font-bold text-slate-800">{email}</Text>. Enter it
            below.
          </Text>
        </View>

        {/* SENIOR DEV UX FIX: Security Note added para consistent */}
        <View className="flex-row items-center justify-start mt-1 mb-6">
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#64748b"
          />
          <Text className="text-slate-500 text-xs ml-1 font-medium">
            For your security, the code is valid for 15 minutes.
          </Text>
        </View>

        <View className="w-full">
          {/* OTP Input Boxes Trick */}
          <View className="relative w-full mb-6 mt-2">
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              className="absolute w-full h-full opacity-0 z-10"
              caretHidden={true}
            />

            {/* Fake Boxes */}
            <View
              className="flex-row justify-between w-full pointer-events-none"
              style={{ gap: 8 }}
            >
              {[...Array(CODE_LENGTH)].map((_, index) => {
                const digit = code[index] || "";
                const isCurrent = index === code.length;
                return (
                  <View
                    key={index}
                    className={`flex-1 aspect-square rounded-xl items-center justify-center border-2 
                                            ${isCurrent ? "border-primary bg-blue-50" : digit ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50"}`}
                  >
                    <Text className="text-2xl font-extrabold text-slate-800">
                      {digit}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {errorMsg ? (
            <Text className="text-red-500 font-medium mb-4">{errorMsg}</Text>
          ) : null}

          {loading && (
            <View className="items-start mb-4">
              <ActivityIndicator color="#2563eb" />
            </View>
          )}

          {/* Resend Logic Left Aligned */}
          <View className="flex-row justify-start items-center">
            <Text className="text-slate-500">Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text className="text-slate-400 font-bold">
                Resend in {countdown}s
              </Text>
            ) : (
              <Pressable onPress={handleResend} disabled={loading}>
                <Text className="text-primary font-bold">Resend now</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
