import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { Chapter } from "../../../lib/types";
import { Ionicons } from "@expo/vector-icons";

export default function ReaderScreen() {
    const { chapterId } = useLocalSearchParams();
    const router = useRouter();

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            const { data, error } = await supabase
                .from("chapters")
                .select("*")
                .eq("id", chapterId)
                .single();

            if (error) console.error(error);
            else setChapter(data as any);

            setLoading(false);
        };

        if (chapterId) fetchContent();
    }, [chapterId]);

    if (loading) return (
        <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator color="#2563EB" />
        </View>
    );

    if (!chapter) return <Text className="p-10 text-center">Chapter not found.</Text>;

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header / Navbar */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <Pressable onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color="#334155" />
                </Pressable>

                <View className="items-center">
                    <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                        Chapter {chapter.sequence_number}
                    </Text>
                    <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                        {chapter.title}
                    </Text>
                </View>

                {/* Placeholder for Settings (Font Size, etc.) */}
                <Pressable className="p-2" onPress={() => alert("Settings coming soon!")}>
                    <Ionicons name="text" size={22} color="#334155" />
                </Pressable>
            </View>

            {/* Content Area */}
            <ScrollView
                className="flex-1 px-6 pt-6"
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-lg text-slate-800 leading-8 font-normal text-justify">
                    {chapter.content}
                </Text>

                {/* Footer / Next Button Placeholder */}
                <View className="mt-12 mb-10 items-center">
                    <Text className="text-gray-400 text-sm">End of Chapter</Text>
                    <Pressable
                        className="mt-4 bg-gray-100 px-6 py-3 rounded-full"
                        onPress={() => router.back()}
                    >
                        <Text className="text-slate-700 font-medium">Back to Book Details</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}