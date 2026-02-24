import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { FloatingTextInput } from "@/components/FloatingTextInput";

export default function ForgotPasswordScreen() {
    const router = useRouter();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);

    // --- STATES PARA SA INLINE VALIDATION (STEP 3) ---
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");

    // --- STATES PARA SA CUSTOM "SWEET ALERT" MODAL ---
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        type: "success" as "success" | "error",
        title: "",
        message: "",
        onConfirm: () => {},
    });

    const showAlert = (type: "success" | "error", title: string, message: string, onConfirm = () => {}) => {
        setModalConfig({ type, title, message, onConfirm });
        setModalVisible(true);
    };

    const handleModalConfirm = () => {
        setModalVisible(false);
        if (modalConfig.onConfirm) {
            modalConfig.onConfirm();
        }
    };

    // --- STEP 1: SEND CODE ---
    const handleSendCode = async () => {
        if (!email) {
            return showAlert("error", "Notice", "Please enter your email address.");
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

        if (error) {
            showAlert("error", "Error", error.message);
        } else {
            showAlert("success", "Code Sent", "Check your email for the recovery code.", () => setStep(2));
        }
        setLoading(false);
    };

    // --- STEP 2: VERIFY CODE ---
    const handleVerifyCode = async () => {
        if (!token || token.length < 6) {
            return showAlert("error", "Notice", "Please enter the valid 6-digit code.");
        }

        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: token.trim(),
            type: 'recovery',
        });

        if (error) {
            showAlert("error", "Invalid Code", "The code you entered is incorrect or expired.");
        } else {
            showAlert("success", "Verified", "Code verified successfully! You can now change your password.", () => setStep(3));
        }
        setLoading(false);
    };

    // --- STEP 3: UPDATE PASSWORD (MAY 8 CHARACTERS & NUMBER VALIDATION NA) ---
    const handleUpdatePassword = async () => {
        // Reset inline errors
        setPasswordError("");
        setConfirmError("");
        let hasError = false;

        // 1. Check kung may laman at kung at least 8 characters
        if (!newPassword || newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            hasError = true;
        }
        // 2. Check kung may kasamang numero gamit ang regex (\d)
        else if (!/\d/.test(newPassword)) {
            setPasswordError("Password must contain at least one number.");
            hasError = true;
        }

        // 3. Confirm password validation
        if (!confirmPassword) {
            setConfirmError("Please confirm your new password.");
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            setConfirmError("Passwords do not match.");
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setPasswordError(error.message);
        } else {
            await supabase.auth.signOut();
            showAlert("success", "Success", "Your password has been changed successfully!", () => {
                router.replace("/(auth)/login");
            });
        }
        setLoading(false);
    };

    // Handle Back Button logic
    const handleBack = () => {
        if (step === 1) router.back();
        if (step === 2) setStep(1);
        if (step === 3) router.replace("/(auth)/login");
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                {/* Back Button */}
                <Pressable onPress={handleBack} className="absolute top-16 left-6 p-2 z-10">
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </Pressable>

                <View className="px-8 gap-8 pt-32 pb-10 flex-1">
                    <View className="mb-2">
                        <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">
                            {step === 1 && "Reset Password"}
                            {step === 2 && "Enter Code"}
                            {step === 3 && "New Password"}
                        </Text>
                        <Text className="text-slate-500 text-base mt-2">
                            {step === 1 && "Enter your email to receive a reset code."}
                            {step === 2 && `Enter the 6-digit code sent to ${email}`}
                            {step === 3 && "Create a secure new password for your account."}
                        </Text>
                    </View>

                    {/* --- UI: STEP 1 (EMAIL) --- */}
                    {step === 1 && (
                        <View className="gap-4">
                            <FloatingTextInput
                                label="Email address"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            <Pressable
                                className={`mt-2 flex-row items-center justify-center rounded-full border-2 border-primary bg-primary px-5 py-4 ${loading ? "opacity-80" : "active:bg-blue-700"}`}
                                onPress={handleSendCode} disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Send Code</Text>}
                            </Pressable>
                        </View>
                    )}

                    {/* --- UI: STEP 2 (OTP CODE) --- */}
                    {step === 2 && (
                        <View className="gap-4">
                            <FloatingTextInput
                                label="6-Digit Code"
                                value={token}
                                onChangeText={setToken}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            <Pressable
                                className={`mt-2 flex-row items-center justify-center rounded-full border-2 border-primary bg-primary px-5 py-4 ${loading ? "opacity-80" : "active:bg-blue-700"}`}
                                onPress={handleVerifyCode} disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Verify Code</Text>}
                            </Pressable>
                        </View>
                    )}

                    {/* --- UI: STEP 3 (NEW PASSWORD) --- */}
                    {step === 3 && (
                        <View className="gap-2">
                            <FloatingTextInput
                                label="New Password"
                                value={newPassword}
                                onChangeText={(text) => { setNewPassword(text); setPasswordError(""); }}
                                isPassword={true}
                            />
                            {passwordError ? (
                                <Text className="text-red-500 text-sm ml-2">{passwordError}</Text>
                            ) : null}

                            <FloatingTextInput
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChangeText={(text) => { setConfirmPassword(text); setConfirmError(""); }}
                                isPassword={true}
                            />
                            {confirmError ? (
                                <Text className="text-red-500 text-sm ml-2 mt-1">{confirmError}</Text>
                            ) : null}

                            <Pressable
                                className={`mt-4 flex-row items-center justify-center rounded-full border-2 border-primary bg-primary px-5 py-4 ${loading ? "opacity-80" : "active:bg-blue-700"}`}
                                onPress={handleUpdatePassword} disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Password</Text>}
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* --- FOOTER --- */}
                <View className="items-center pb-10">
                    <Text
                        className="text-xl tracking-wide"
                        style={{ fontFamily: "Garet", fontWeight: "bold", color: "lightgray" }}
                    >
                        GenrA
                    </Text>
                </View>
            </ScrollView>

            {/* --- CUSTOM SWEET ALERT MODAL --- */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={handleModalConfirm}
            >
                <View className="flex-1 justify-center items-center bg-black/50 px-6">
                    <View className="bg-white w-full rounded-3xl p-6 items-center shadow-xl">

                        <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${modalConfig.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Ionicons
                                name={modalConfig.type === 'success' ? "checkmark-circle" : "alert-circle"}
                                size={40}
                                color={modalConfig.type === 'success' ? "#16a34a" : "#dc2626"}
                            />
                        </View>

                        <Text className="text-2xl font-extrabold text-slate-900 mb-2 text-center">
                            {modalConfig.title}
                        </Text>

                        <Text className="text-base text-slate-500 text-center mb-6">
                            {modalConfig.message}
                        </Text>

                        <Pressable
                            onPress={handleModalConfirm}
                            className={`w-full py-4 rounded-full flex-row justify-center items-center ${modalConfig.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                            <Text className="text-white font-bold text-base">Okay</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}