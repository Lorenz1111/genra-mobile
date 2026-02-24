import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Chapter } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

// --- THEME CONFIGURATION ---
const THEMES = {
    light: { bg: "#ffffff", text: "#334155", header: "#ffffff", border: "#f1f5f9", tint: "#334155" },
    sepia: { bg: "#fbf0d9", text: "#5f4b32", header: "#f4e4c1", border: "#e8d5ae", tint: "#5f4b32" },
    dark:  { bg: "#0f172a", text: "#e2e8f0", header: "#1e293b", border: "#334155", tint: "#e2e8f0" }
};

type ThemeKey = keyof typeof THEMES;

export default function ReaderScreen() {
    const { chapterId } = useLocalSearchParams();
    const router = useRouter();

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);

    // --- READER PREFERENCES STATES ---
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState(18); // Default font size
    const [activeTheme, setActiveTheme] = useState<ThemeKey>('light');

    const currentTheme = THEMES[activeTheme];

    useEffect(() => {
        const fetchContent = async () => {
            // 1. Fetch Chapter
            const { data: chapterData, error } = await supabase
                .from("chapters")
                .select("*")
                .eq("id", chapterId)
                .single();

            if (error) {
                console.error(error);
            } else {
                setChapter(chapterData as any);

                // 2. Save Reading Progress
                const { data: { user } } = await supabase.auth.getUser();
                if (user && chapterData) {
                    await supabase
                        .from("reading_progress")
                        .upsert({
                            user_id: user.id,
                            book_id: chapterData.book_id,
                            chapter_id: chapterId,
                            updated_at: new Date().toISOString(),
                        });
                }
            }

            setLoading(false);
        };

        if (chapterId) fetchContent();
    }, [chapterId]);

    // --- HANDLERS ---
    const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 32)); // Max 32
    const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12)); // Min 12

    if (loading) return (
        <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator color="#2563EB" />
        </View>
    );

    if (!chapter) return <Text className="p-10 text-center">Chapter not found.</Text>;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.header }}>

            {/* --- DYNAMIC HEADER --- */}
            <View
                style={{ backgroundColor: currentTheme.header, borderBottomColor: currentTheme.border }}
                className="flex-row items-center justify-between px-4 py-3 border-b"
            >
                <Pressable onPress={() => router.back()} className="p-2">
                    <Ionicons name="arrow-back" size={24} color={currentTheme.tint} />
                </Pressable>

                <View className="items-center flex-1 px-4">
                    <Text style={{ color: currentTheme.tint }} className="text-xs uppercase font-bold tracking-wider opacity-70">
                        Chapter {chapter.sequence_number}
                    </Text>
                    <Text style={{ color: currentTheme.tint }} className="text-sm font-semibold" numberOfLines={1}>
                        {chapter.title}
                    </Text>
                </View>

                <Pressable className="p-2" onPress={() => setShowSettings(!showSettings)}>
                    <Ionicons name="text" size={22} color={currentTheme.tint} />
                </Pressable>
            </View>

            {/* --- DYNAMIC CONTENT AREA --- */}
            <ScrollView
                style={{ flex: 1, backgroundColor: currentTheme.bg }}
                contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                <Text
                    style={{
                        color: currentTheme.text,
                        fontSize: fontSize,
                        lineHeight: fontSize * 1.6 // Maintain readability
                    }}
                    className="text-justify font-normal"
                >
                    {chapter.content}
                </Text>

                <View className="mt-12 mb-10 items-center">
                    <Text style={{ color: currentTheme.tint }} className="opacity-50 text-sm">End of Chapter</Text>
                </View>
            </ScrollView>

            {/* --- SETTINGS MENU (MODAL) --- */}
            {showSettings && (
                <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg border-t border-gray-100 p-6 elevation-5 z-50">

                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-lg font-bold text-slate-900">Reader Settings</Text>
                        <Pressable onPress={() => setShowSettings(false)}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </Pressable>
                    </View>

                    {/* Font Size Controls */}
                    <View className="mb-6">
                        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Font Size</Text>
                        <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-2 border border-gray-200">
                            <Pressable onPress={decreaseFont} className="p-3 px-6 active:bg-gray-200 rounded-lg">
                                <Text className="text-xl font-medium text-slate-700">A-</Text>
                            </Pressable>
                            <Text className="text-lg font-bold text-slate-900">{fontSize}</Text>
                            <Pressable onPress={increaseFont} className="p-3 px-6 active:bg-gray-200 rounded-lg">
                                <Text className="text-xl font-medium text-slate-700">A+</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Theme Controls */}
                    <View className="mb-4">
                        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Theme</Text>
                        <View className="flex-row justify-between gap-4">

                            {/* Light Theme Button */}
                            <Pressable
                                onPress={() => setActiveTheme('light')}
                                className={`flex-1 py-3 rounded-xl border-2 items-center bg-white ${activeTheme === 'light' ? 'border-primary' : 'border-gray-200'}`}
                            >
                                <Text className="font-bold text-slate-900">Light</Text>
                            </Pressable>

                            {/* Sepia Theme Button */}
                            <Pressable
                                onPress={() => setActiveTheme('sepia')}
                                className={`flex-1 py-3 rounded-xl border-2 items-center bg-[#fbf0d9] ${activeTheme === 'sepia' ? 'border-primary' : 'border-[#e8d5ae]'}`}
                            >
                                <Text className="font-bold text-[#5f4b32]">Sepia</Text>
                            </Pressable>

                            {/* Dark Theme Button */}
                            <Pressable
                                onPress={() => setActiveTheme('dark')}
                                className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-900 ${activeTheme === 'dark' ? 'border-primary' : 'border-slate-700'}`}
                            >
                                <Text className="font-bold text-white">Dark</Text>
                            </Pressable>

                        </View>
                    </View>

                </View>
            )}
        </SafeAreaView>
    );
}