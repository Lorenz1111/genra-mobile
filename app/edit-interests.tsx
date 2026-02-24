import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import GenreSelector from "@/components/GenreSelector";

export default function EditInterestsScreen() {
    const router = useRouter();
    const [preferences, setPreferences] = useState<string[]>([]);
    const [initialPreferences, setInitialPreferences] = useState<string[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Kunin yung Luma niyang Genres para "pre-selected" na sa screen
        const fetchExistingPreferences = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from("user_preferred_genres")
                    .select("genre_id")
                    .eq("profile_id", user.id);

                if (error) throw error;

                const existingIds = data.map(item => item.genre_id);
                setInitialPreferences(existingIds);
                setPreferences(existingIds);

            } catch (error) {
                console.error(error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchExistingPreferences();
    }, []);

    const handleSaveChanges = async () => {
        if (preferences.length === 0) return Alert.alert("Notice", "Select at least 1 genre.");
        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            // 1. DELETE: Burahin ang luma
            await supabase.from("user_preferred_genres").delete().eq("profile_id", user.id);

            // 2. INSERT: Ipasok ang bago
            const newPrefsData = preferences.map((genreId) => ({
                profile_id: user.id,
                genre_id: genreId,
            }));
            const { error: insertError } = await supabase.from("user_preferred_genres").insert(newPrefsData);

            if (insertError) throw insertError;

            Alert.alert("Success", "Your reading preferences have been updated!");
            router.back(); // Bumalik sa Profile screen

        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };

    const isButtonDisabled = saving || preferences.length === 0;

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
            <Pressable onPress={() => router.back()} className="absolute top-16 left-6 p-2 z-10">
                <Ionicons name="arrow-back" size={24} color="#334155" />
            </Pressable>

            <View className="px-8 gap-8 pt-32 pb-10 flex-1">
                <View className="mb-2">
                    <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">Edit Interests</Text>
                    <Text className="text-slate-500 text-base mt-2">Update your favorite genres.</Text>
                </View>

                {/* SENIOR DEV MAGIC: Ginamit natin ulit, pero ipinasa natin yung initialPreferences! */}
                {loadingData ? (
                    <ActivityIndicator color="#2563EB" />
                ) : (
                    <GenreSelector
                        initialSelected={initialPreferences}
                        onSelectionChange={setPreferences}
                    />
                )}

                <View className="mt-auto pt-8">
                    <Pressable
                        className={`flex-row items-center justify-center rounded-full px-5 py-4 ${isButtonDisabled ? "bg-blue-300 opacity-60" : "bg-primary active:bg-blue-700"}`}
                        onPress={handleSaveChanges}
                        disabled={isButtonDisabled}
                    >
                        {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}