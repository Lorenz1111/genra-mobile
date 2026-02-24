import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function EditProfileScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form States
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.back();
                return;
            }

            setUserId(user.id);

            const { data, error } = await supabase
                .from("profiles")
                .select("full_name, bio")
                .eq("id", user.id)
                .single();

            if (data) {
                setFullName(data.full_name || "");
                setBio(data.bio || "");
            }
            setLoading(false);
        };

        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);

        const { error } = await (supabase as any)
            .from("profiles")
            .update({full_name: fullName.trim(), bio: bio.trim(),})
            .eq("id", userId);

        if (error) {
            Alert.alert("Error", "Could not update profile.");
            console.error(error);
        } else {
            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="close" size={28} color="#334155" />
                </Pressable>
                <Text className="text-lg font-bold text-slate-900">Edit Profile</Text>
                <Pressable onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator color="#2563EB" size="small" />
                    ) : (
                        <Text className="text-primary font-bold text-base">Save</Text>
                    )}
                </Pressable>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Name Field */}
                <View className="mb-6">
                    <Text className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Full Name</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-slate-900 text-base"
                        placeholder="Juan Dela Cruz"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                    <Text className="text-xs text-slate-400 mt-1">
                        This name will appear on your comments and reviews.
                    </Text>
                </View>

                {/* Bio Field (Optional, for future-proofing) */}
                <View className="mb-6">
                    <Text className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">About Me (Bio)</Text>
                    <TextInput
                        className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-slate-900 text-base h-24"
                        placeholder="I love reading fantasy and sci-fi books..."
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}