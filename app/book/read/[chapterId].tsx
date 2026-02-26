import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";

// --- THEME CONFIGURATION ---
const THEMES = {
    light: { bg: "#ffffff", text: "#334155", header: "#ffffff", border: "#f1f5f9", tint: "#334155" },
    sepia: { bg: "#fbf0d9", text: "#5f4b32", header: "#f4e4c1", border: "#e8d5ae", tint: "#5f4b32" },
    dark:  { bg: "#0f172a", text: "#e2e8f0", header: "#1e293b", border: "#334155", tint: "#e2e8f0" }
};

type ThemeKey = keyof typeof THEMES;
type SpacingKey = 'tight' | 'normal' | 'relaxed';

const SPACING_MULTIPLIERS = {
    tight: 1.4,
    normal: 1.6,
    relaxed: 2.0
};

export default function ReaderScreen() {
    const { chapterId } = useLocalSearchParams();
    const router = useRouter();

    const [chapter, setChapter] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [nextChapter, setNextChapter] = useState<{ id: string, sequence_number: number } | null>(null);
    const [prevChapter, setPrevChapter] = useState<{ id: string, sequence_number: number } | null>(null);

    // --- READER PREFERENCES STATES ---
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState(18);
    const [activeTheme, setActiveTheme] = useState<ThemeKey>('light');
    const [lineSpacing, setLineSpacing] = useState<SpacingKey>('normal');
    const [immersiveMode, setImmersiveMode] = useState(false);

    const currentTheme = THEMES[activeTheme];

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            const { data: chapterData, error } = await supabase
                .from("chapters")
                .select("*")
                .eq("id", chapterId)
                .single();

            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }

            setChapter(chapterData);

            // Fetch neighbors for navigation
            const { data: allChapters } = await supabase
                .from("chapters")
                .select("id, sequence_number")
                .eq("book_id", chapterData.book_id)
                .order("sequence_number", { ascending: true });

            if (allChapters) {
                const currentIndex = allChapters.findIndex(c => c.id === chapterId);
                setPrevChapter(currentIndex > 0 ? allChapters[currentIndex - 1] : null);
                setNextChapter(currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null);
            }

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
            setLoading(false);
        };

        if (chapterId) fetchContent();
    }, [chapterId]);

    const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 32));
    const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12));

    if (loading) return (
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: currentTheme.bg }}>
            <ActivityIndicator color="#2563EB" />
        </View>
    );

    if (!chapter) return <Text className="p-10 text-center">Chapter not found.</Text>;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.header }}>

            {/* --- ORIGINAL HEADER STYLE (Hidden if Immersive) --- */}
            {!immersiveMode && (
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

                    {/* SENIOR DEV FIX: Mas malinis na Settings Icon */}
                    <Pressable className="p-2" onPress={() => setShowSettings(!showSettings)}>
                        <Ionicons name="options-outline" size={24} color={currentTheme.tint} />
                    </Pressable>
                </View>
            )}

            {/* --- CONTENT AREA --- */}
            <ScrollView
                style={{ flex: 1, backgroundColor: currentTheme.bg }}
                contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Paragraph Formatting with Dynamic Spacing */}
                {chapter.content?.split('\n').map((paragraph: string, index: number) => {
                    if (!paragraph.trim()) return null;
                    return (
                        <Text
                            key={index}
                            style={{
                                color: currentTheme.text,
                                fontSize: fontSize,
                                lineHeight: fontSize * SPACING_MULTIPLIERS[lineSpacing],
                                marginBottom: fontSize * (SPACING_MULTIPLIERS[lineSpacing] - 0.5)
                            }}
                            className="font-normal"
                        >
                            {paragraph}
                        </Text>
                    );
                })}

                {/* --- CLEAN NEXT/PREV BUTTONS --- */}
                <View className="mt-12 items-center">
                    <Text style={{ color: currentTheme.tint }} className="opacity-50 text-sm font-bold uppercase tracking-widest mb-6">
                        End of Chapter
                    </Text>

                    <View className="flex-row w-full justify-between gap-4">
                        {prevChapter ? (
                            <Pressable
                                onPress={() => { setLoading(true); router.replace(`/book/read/${prevChapter.id}`); }}
                                style={{ borderColor: currentTheme.border }}
                                className="flex-1 py-3 px-2 border rounded-xl flex-row justify-center items-center active:opacity-50"
                            >
                                <Ionicons name="arrow-back" size={16} color={currentTheme.tint} style={{ marginRight: 4 }} />
                                <Text style={{ color: currentTheme.tint }} className="font-bold text-xs uppercase">Prev</Text>
                            </Pressable>
                        ) : <View className="flex-1" />}

                        {nextChapter ? (
                            <Pressable
                                onPress={() => { setLoading(true); router.replace(`/book/read/${nextChapter.id}`); }}
                                style={{ borderColor: currentTheme.border }}
                                className="flex-1 py-3 px-2 border rounded-xl flex-row justify-center items-center active:opacity-50"
                            >
                                <Text style={{ color: currentTheme.tint }} className="font-bold text-xs uppercase">Next</Text>
                                <Ionicons name="arrow-forward" size={16} color={currentTheme.tint} style={{ marginLeft: 4 }} />
                            </Pressable>
                        ) : <View className="flex-1" />}
                    </View>
                </View>
            </ScrollView>

            {/* --- IMERSIVE MODE FLOATING SETTINGS BUTTON --- */}
            {immersiveMode && !showSettings && (
                <Pressable
                    onPress={() => setShowSettings(true)}
                    style={{ backgroundColor: currentTheme.header, borderColor: currentTheme.border }}
                    className="absolute bottom-8 right-6 p-4 rounded-full border shadow-sm opacity-60"
                >
                    <Ionicons name="options-outline" size={24} color={currentTheme.tint} />
                </Pressable>
            )}

            {/* --- SETTINGS MENU (MODAL) --- */}
            {showSettings && (
                <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl border-t border-gray-100 p-6 pb-10 z-50">

                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-slate-900">Display Settings</Text>
                        <Pressable onPress={() => setShowSettings(false)} className="bg-slate-100 p-2 rounded-full">
                            <Ionicons name="close" size={20} color="#64748b" />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Immersive Toggle */}
                        <View className="flex-row justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <View>
                                <Text className="font-bold text-slate-900 text-base">Reading Mode</Text>
                                <Text className="text-xs text-slate-500 mt-1">Hide header for full focus</Text>
                            </View>
                            <Switch
                                value={immersiveMode}
                                onValueChange={setImmersiveMode}
                                trackColor={{ false: '#cbd5e1', true: '#2563EB' }}
                            />
                        </View>

                        {/* Font Size Controls */}
                        <View className="mb-6">
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Font Size</Text>
                            <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl p-2 border border-slate-100">
                                <Pressable onPress={decreaseFont} className="p-3 px-6 active:bg-slate-200 rounded-xl">
                                    <Text className="text-xl font-bold text-slate-700">A-</Text>
                                </Pressable>
                                <Text className="text-lg font-black text-slate-900">{fontSize}</Text>
                                <Pressable onPress={increaseFont} className="p-3 px-6 active:bg-slate-200 rounded-xl">
                                    <Text className="text-xl font-bold text-slate-700">A+</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Line Spacing Controls */}
                        <View className="mb-6">
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Line Spacing</Text>
                            <View className="flex-row justify-between gap-3">
                                <Pressable onPress={() => setLineSpacing('tight')} className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-50 ${lineSpacing === 'tight' ? 'border-primary' : 'border-slate-100'}`}>
                                    <Ionicons name="reorder-three" size={20} color={lineSpacing === 'tight' ? '#2563EB' : '#64748b'} />
                                    <Text className={`font-bold text-xs mt-1 ${lineSpacing === 'tight' ? 'text-primary' : 'text-slate-500'}`}>Tight</Text>
                                </Pressable>
                                <Pressable onPress={() => setLineSpacing('normal')} className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-50 ${lineSpacing === 'normal' ? 'border-primary' : 'border-slate-100'}`}>
                                    <Ionicons name="reorder-two" size={20} color={lineSpacing === 'normal' ? '#2563EB' : '#64748b'} />
                                    <Text className={`font-bold text-xs mt-1 ${lineSpacing === 'normal' ? 'text-primary' : 'text-slate-500'}`}>Normal</Text>
                                </Pressable>
                                <Pressable onPress={() => setLineSpacing('relaxed')} className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-50 ${lineSpacing === 'relaxed' ? 'border-primary' : 'border-slate-100'}`}>
                                    <Ionicons name="menu" size={20} color={lineSpacing === 'relaxed' ? '#2563EB' : '#64748b'} />
                                    <Text className={`font-bold text-xs mt-1 ${lineSpacing === 'relaxed' ? 'text-primary' : 'text-slate-500'}`}>Relaxed</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Theme Controls */}
                        <View className="mb-2">
                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Theme</Text>
                            <View className="flex-row justify-between gap-3">
                                <Pressable onPress={() => setActiveTheme('light')} className={`flex-1 py-4 rounded-2xl border-2 items-center bg-white ${activeTheme === 'light' ? 'border-primary' : 'border-slate-200'}`}>
                                    <Text className="font-bold text-slate-900">Light</Text>
                                </Pressable>
                                <Pressable onPress={() => setActiveTheme('sepia')} className={`flex-1 py-4 rounded-2xl border-2 items-center bg-[#fbf0d9] ${activeTheme === 'sepia' ? 'border-primary' : 'border-[#e8d5ae]'}`}>
                                    <Text className="font-bold text-[#5f4b32]">Sepia</Text>
                                </Pressable>
                                <Pressable onPress={() => setActiveTheme('dark')} className={`flex-1 py-4 rounded-2xl border-2 items-center bg-slate-900 ${activeTheme === 'dark' ? 'border-primary' : 'border-slate-700'}`}>
                                    <Text className="font-bold text-white">Dark</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>

                </View>
            )}
        </SafeAreaView>
    );
}