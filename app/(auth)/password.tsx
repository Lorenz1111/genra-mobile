import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FloatingTextInput } from "@/components/FloatingTextInput";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

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
        if (email && typeof email === 'string' && !fullName) {
            const prefix = email.split('@')[0];
            setFullName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
        }
    }, [email]);

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
            setPasswordError("Password must be at least 8 characters and include a number.");
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);

        try {
            // 1. REGISTER SA SUPABASE AUTH
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email as string,
                password: password,
            });

            if (authError) throw authError;

            const userId = authData.user?.id;
            if (!userId) throw new Error("Failed to retrieve user ID.");

            let finalAvatarUrl = null;

            // 2. UPLOAD AVATAR KUNG MAY PICTURE SIYANG PINILI SA NAKARAANG SCREEN
            if (avatarUri) {
                const ext = (avatarUri as string).substring((avatarUri as string).lastIndexOf('.') + 1);
                const fileName = `${userId}_${Date.now()}.${ext}`;

                const formData = new FormData();
                formData.append('files', {
                    uri: avatarUri,
                    name: fileName,
                    type: `image/${ext}`
                } as any);

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, formData);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);
                    finalAvatarUrl = publicUrl;
                } else {
                    console.log("Avatar upload failed, but proceeding with registration:", uploadError);
                }
            }

            // SENIOR DEV FIX: Dito natin ilalagay ang generator para isang beses lang tumakbo pag-click!
            const baseName = fullName.trim().replace(/\s+/g, '').toLowerCase().substring(0, 8);
            const randomNums = Math.floor(1000 + Math.random() * 9000);
            const generatedUsername = `${baseName}${randomNums}`;

            // 3. UPDATE PROFILES TABLE
            const { error: profileError } = await supabase
                .from('profiles')
                .update({full_name: fullName.trim(), username: generatedUsername, ...(finalAvatarUrl && { avatar_url: finalAvatarUrl })})
                .eq('id', userId);

            if (profileError) throw profileError;

            // 4. DONE! IPASA NA SA PREFERENCES PARA PUMILI NG GENRE
            router.replace("/(auth)/preferences");

        } catch (error: any) {
            Alert.alert("Registration Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>

            <Pressable onPress={() => router.back()} className="absolute top-16 left-6 p-2 z-10">
                <Ionicons name="arrow-back" size={24} color="#334155" />
            </Pressable>

            <View className="px-8 gap-8 pt-32 pb-10 flex-1 justify-between">
                <View>
                    <View className="mb-8">
                        <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">Account Details</Text>
                        <Text className="text-slate-500 text-base mt-2 leading-6">
                            Set up your display name and secure your account with a password.
                        </Text>
                    </View>

                    <View className="gap-5">
                        <View className="gap-1">
                            <FloatingTextInput
                                label="Display Name"
                                value={fullName}
                                onChangeText={(text) => { setFullName(text); setNameError(""); }}
                                autoCapitalize="words"
                            />
                            {nameError ? <Text className="text-red-500 text-sm ml-2 mt-1">{nameError}</Text> : null}
                        </View>

                        <View className="flex-row items-center justify-between pl-2 mt-2">
                            <Pressable className="flex-row items-center" onPress={() => setRememberMe(!rememberMe)}>
                                <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${rememberMe ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                    {rememberMe && <Ionicons name="checkmark" size={14} color="white" />}
                                </View>
                                <Text className="text-slate-600 font-medium">Remember me</Text>
                            </Pressable>

                            <Pressable onPress={() => {
                                console.log("Navigate to Learn More link");
                            }}>
                                <Text className="text-primary text-sm font-semibold">Learn more</Text>
                            </Pressable>
                        </View>

                        <View className="gap-1">
                            <FloatingTextInput
                                label="Password"
                                value={password}
                                onChangeText={(text) => { setPassword(text); setPasswordError(""); }}
                                isPassword={true}
                            />
                            {passwordError ? (
                                <Text className="text-red-500 text-sm ml-2 mt-1">{passwordError}</Text>
                            ) : (
                                <Text className="text-slate-400 text-xs ml-2 mt-1">Must be at least 8 characters and include a number.</Text>
                            )}
                        </View>
                    </View>
                </View>

                <View className="mt-auto pt-8">
                    <Pressable
                        className={`flex-row items-center justify-center rounded-full bg-primary px-5 py-4 ${(!fullName || !password || loading) ? 'opacity-50' : 'active:bg-blue-700'}`}
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