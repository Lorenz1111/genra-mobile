import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { FloatingTextInput } from "@/components/FloatingTextInput";

export default function ChangePasswordScreen() {
    const router = useRouter();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleUpdatePassword = async () => {
        setErrorMsg("");

        // Basic Validations
        if (!newPassword || !confirmPassword) {
            setErrorMsg("Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        const hasNumber = /\d/.test(newPassword);
        if (newPassword.length < 8 || !hasNumber) {
            setErrorMsg("Password must be at least 8 characters and include a number.");
            return;
        }

        setSaving(true);

        try {
            // SENIOR DEV MAGIC: Ito lang ang kailangan tawagin para magpalit ng password sa Supabase!
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                Alert.alert("Update Failed", updateError.message);
                return;
            }

            Alert.alert(
                "Success",
                "Your password has been updated successfully.",
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update password. Please try again.";
            Alert.alert("Update Failed", message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>

            {/* Back Button */}
            <Pressable onPress={() => router.back()} className="absolute top-16 left-6 p-2 z-10">
                <Ionicons name="arrow-back-outline" size={24} color="#334155" />
            </Pressable>

            <View className="px-8 gap-8 pt-32 pb-10 flex-1">

                {/* Header */}
                <View className="mb-4">
                    <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">Change Password</Text>
                    <Text className="text-slate-500 text-base mt-2">
                        Make sure your new password is secure and easy for you to remember.
                    </Text>
                </View>

                {/* Input Fields */}
                <View className="gap-2">
                    <FloatingTextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={(text) => { setNewPassword(text); setErrorMsg(""); }}
                        isPassword={true}
                    />

                    <View className="mt-2">
                        <FloatingTextInput
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChangeText={(text) => { setConfirmPassword(text); setErrorMsg(""); }}
                            isPassword={true}
                        />
                    </View>

                    {errorMsg ? (
                        <Text className="text-red-500 text-sm ml-2 mt-2">{errorMsg}</Text>
                    ) : (
                        <Text className="text-slate-400 text-xs ml-2 mt-2">
                            Must be at least 8 characters and include a number.
                        </Text>
                    )}
                </View>

                {/* Save Button */}
                <View className="mt-auto pt-8">
                    <Pressable
                        className={`flex-row items-center justify-center rounded-full px-5 py-4 ${saving ? "bg-blue-300" : "bg-primary active:bg-blue-700"}`}
                        onPress={handleUpdatePassword}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Update Password</Text>}
                    </Pressable>
                </View>

            </View>
        </ScrollView>
    );
}
