import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Switch,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import RenderHtml from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";

// --- THEME CONFIGURATION ---
const THEMES = {
  light: {
    bg: "#ffffff",
    text: "#334155",
    header: "#ffffff",
    border: "#f1f5f9",
    tint: "#334155",
  },
  sepia: {
    bg: "#fbf0d9",
    text: "#5f4b32",
    header: "#f4e4c1",
    border: "#e8d5ae",
    tint: "#5f4b32",
  },
  dark: {
    bg: "#0f172a",
    text: "#e2e8f0",
    header: "#1e293b",
    border: "#334155",
    tint: "#e2e8f0",
  },
};

type ThemeKey = keyof typeof THEMES;
type SpacingKey = "tight" | "normal" | "relaxed";

const SPACING_MULTIPLIERS = {
  tight: 1.4,
  normal: 1.6,
  relaxed: 2.0,
};

export default function ReaderScreen() {
  const { chapterId } = useLocalSearchParams();
  const normalizedChapterId = Array.isArray(chapterId)
    ? chapterId[0]
    : chapterId;
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [nextChapter, setNextChapter] = useState<{
    id: string;
    sequence_number: number;
  } | null>(null);
  const [prevChapter, setPrevChapter] = useState<{
    id: string;
    sequence_number: number;
  } | null>(null);

  // --- READER PREFERENCES STATES (SENIOR DEV UPDATED DEFAULTS) ---
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(12); // Default is now 12
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("light"); // Default is Light
  const [lineSpacing, setLineSpacing] = useState<SpacingKey>("tight"); // Default is Tight
  const [immersiveMode, setImmersiveMode] = useState(false);

  const currentTheme = THEMES[activeTheme];

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const { data: chapterData, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", normalizedChapterId)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setChapter(chapterData);

      const { data: allChapters } = await supabase
        .from("chapters")
        .select("id, sequence_number")
        .eq("book_id", chapterData.book_id)
        .order("sequence_number", { ascending: true });

      if (allChapters) {
        const currentIndex = allChapters.findIndex(
          (c) => c.id === normalizedChapterId,
        );
        setPrevChapter(currentIndex > 0 ? allChapters[currentIndex - 1] : null);
        setNextChapter(
          currentIndex < allChapters.length - 1
            ? allChapters[currentIndex + 1]
            : null,
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && chapterData) {
        await supabase.from("reading_progress").upsert({
          user_id: user.id,
          book_id: chapterData.book_id,
          chapter_id: normalizedChapterId,
          updated_at: new Date().toISOString(),
        });
      }
      setLoading(false);
    };

    if (normalizedChapterId) fetchContent();
  }, [normalizedChapterId]);

  const increaseFont = () => setFontSize((prev) => Math.min(prev + 2, 32));
  const decreaseFont = () => setFontSize((prev) => Math.max(prev - 2, 12));

  const tagsStyles = {
    body: {
      color: currentTheme.text,
      fontSize: fontSize,
      lineHeight: fontSize * SPACING_MULTIPLIERS[lineSpacing],
    },
    p: {
      marginBottom: fontSize * (SPACING_MULTIPLIERS[lineSpacing] - 0.5),
      marginTop: 0,
    },
    b: { fontWeight: "bold" as const },
    strong: { fontWeight: "bold" as const },
    i: { fontStyle: "italic" as const },
    em: { fontStyle: "italic" as const },
    u: { textDecorationLine: "underline" as const },
    s: { textDecorationLine: "line-through" as const },
    h1: {
      fontWeight: "bold" as const,
      fontSize: fontSize * 1.5,
      marginTop: 15,
      marginBottom: 10,
      color: currentTheme.text,
    },
    h2: {
      fontWeight: "bold" as const,
      fontSize: fontSize * 1.3,
      marginTop: 12,
      marginBottom: 8,
      color: currentTheme.text,
    },
    h3: {
      fontWeight: "bold" as const,
      fontSize: fontSize * 1.1,
      marginTop: 10,
      marginBottom: 6,
      color: currentTheme.text,
    },
    ul: { marginTop: 0, marginBottom: fontSize, paddingLeft: 20 },
    ol: { marginTop: 0, marginBottom: fontSize, paddingLeft: 20 },
    li: {
      marginBottom: 4,
      color: currentTheme.text,
      fontSize: fontSize,
      lineHeight: fontSize * SPACING_MULTIPLIERS[lineSpacing],
    },
  };

  const classesStyles = {
    "ql-align-center": { textAlign: "center" as const },
    "ql-align-right": { textAlign: "right" as const },
    "ql-align-justify": { textAlign: "justify" as const },
  };

  if (loading)
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: currentTheme.bg }}
      >
        <ActivityIndicator color="#2563EB" />
      </View>
    );

  if (!chapter)
    return <Text className="p-10 text-center">Chapter not found.</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.header }}>
      <StatusBar
        hidden={immersiveMode}
        style={activeTheme === "dark" ? "light" : "dark"}
      />

      {/* --- HEADER --- */}
      {!immersiveMode && (
        <View
          style={{
            backgroundColor: currentTheme.header,
            borderBottomColor: currentTheme.border,
          }}
          className="flex-row items-center justify-between px-4 py-3 border-b"
        >
          <Pressable onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color={currentTheme.tint} />
          </Pressable>

          <View className="items-center flex-1 px-4">
            <Text
              style={{ color: currentTheme.tint }}
              className="text-xs uppercase font-bold tracking-wider opacity-70"
            >
              Chapter {chapter.sequence_number}
            </Text>
            <Text
              style={{ color: currentTheme.tint }}
              className="text-sm font-semibold"
              numberOfLines={1}
            >
              {chapter.title}
            </Text>
          </View>

          <Pressable
            className="p-2"
            onPress={() => setShowSettings(!showSettings)}
          >
            <Ionicons
              name="options-outline"
              size={24}
              color={currentTheme.tint}
            />
          </Pressable>
        </View>
      )}

      {/* --- CONTENT AREA --- */}
      <ScrollView
        style={{ flex: 1, backgroundColor: currentTheme.bg }}
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <RenderHtml
          contentWidth={width - 48}
          source={{ html: chapter.content || "" }}
          tagsStyles={tagsStyles}
          classesStyles={classesStyles}
          enableExperimentalMarginCollapsing={true}
        />

        {/* MODERN NAVIGATION */}
        <View className="mt-16 items-center w-full">
          <View className="flex-row items-center w-full mb-8">
            <View
              style={{
                backgroundColor: currentTheme.border,
                height: 1,
                flex: 1,
              }}
            />
            <Text
              style={{ color: currentTheme.tint }}
              className="px-4 opacity-40 font-bold tracking-widest text-xs uppercase"
            >
              End of Chapter
            </Text>
            <View
              style={{
                backgroundColor: currentTheme.border,
                height: 1,
                flex: 1,
              }}
            />
          </View>

          {nextChapter ? (
            <Pressable
              onPress={() => {
                setLoading(true);
                router.replace(`/book/read/${nextChapter.id}`);
              }}
              className="w-full bg-blue-600 py-4 rounded-2xl flex-row justify-center items-center active:bg-blue-700 shadow-sm mb-6"
            >
              <Text className="font-bold text-white text-base mr-2">
                Read Chapter {nextChapter.sequence_number}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </Pressable>
          ) : (
            <View className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl w-full items-center border border-dashed border-slate-300">
              <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              <Text
                style={{ color: currentTheme.text }}
                className="font-bold text-base mt-2"
              >
                You're All Caught Up!
              </Text>
              <Text
                style={{ color: currentTheme.tint }}
                className="opacity-60 text-xs text-center mt-1"
              >
                You've finished the latest chapter of this book.
              </Text>
            </View>
          )}

          {prevChapter && (
            <Pressable
              onPress={() => {
                setLoading(true);
                router.replace(`/book/read/${prevChapter.id}`);
              }}
              className="py-3 px-6 rounded-xl flex-row justify-center items-center active:opacity-50"
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={currentTheme.tint}
                style={{ opacity: 0.6, marginRight: 8 }}
              />
              <Text
                style={{ color: currentTheme.tint }}
                className="font-semibold text-sm opacity-60"
              >
                Previous Chapter
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* FLOATING SETTINGS BUTTON */}
      {immersiveMode && !showSettings && (
        <Pressable
          onPress={() => setShowSettings(true)}
          style={{
            backgroundColor: currentTheme.header,
            borderColor: currentTheme.border,
          }}
          className="absolute bottom-8 right-6 p-4 rounded-full border shadow-sm opacity-30 active:opacity-100"
        >
          <Ionicons
            name="options-outline"
            size={24}
            color={currentTheme.tint}
          />
        </Pressable>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl border-t border-gray-100 p-6 pb-10 z-50">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-slate-900">
              Display Settings
            </Text>
            <Pressable
              onPress={() => setShowSettings(false)}
              className="bg-slate-100 p-2 rounded-full"
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <View>
                <Text className="font-bold text-slate-900 text-base">
                  Reading Mode
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Hide header for full focus
                </Text>
              </View>
              <Switch
                value={immersiveMode}
                onValueChange={setImmersiveMode}
                trackColor={{ false: "#cbd5e1", true: "#2563EB" }}
              />
            </View>

            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Font Size
              </Text>
              <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl p-2 border border-slate-100">
                <Pressable
                  onPress={decreaseFont}
                  className="p-3 px-6 active:bg-slate-200 rounded-xl"
                >
                  <Text className="text-xl font-bold text-slate-700">A-</Text>
                </Pressable>
                <Text className="text-lg font-black text-slate-900">
                  {fontSize}
                </Text>
                <Pressable
                  onPress={increaseFont}
                  className="p-3 px-6 active:bg-slate-200 rounded-xl"
                >
                  <Text className="text-xl font-bold text-slate-700">A+</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Line Spacing
              </Text>
              <View className="flex-row justify-between gap-3">
                <Pressable
                  onPress={() => setLineSpacing("tight")}
                  className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-50 ${lineSpacing === "tight" ? "border-primary" : "border-slate-100"}`}
                >
                  <Ionicons
                    name="reorder-three"
                    size={20}
                    color={lineSpacing === "tight" ? "#2563EB" : "#64748b"}
                  />
                  <Text
                    className={`font-bold text-xs mt-1 ${lineSpacing === "tight" ? "text-primary" : "text-slate-500"}`}
                  >
                    Tight
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLineSpacing("normal")}
                  className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-50 ${lineSpacing === "normal" ? "border-primary" : "border-slate-100"}`}
                >
                  <Ionicons
                    name="reorder-two"
                    size={20}
                    color={lineSpacing === "normal" ? "#2563EB" : "#64748b"}
                  />
                  <Text
                    className={`font-bold text-xs mt-1 ${lineSpacing === "normal" ? "text-primary" : "text-slate-500"}`}
                  >
                    Normal
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLineSpacing("relaxed")}
                  className={`flex-1 py-3 rounded-xl border-2 items-center bg-slate-50 ${lineSpacing === "relaxed" ? "border-primary" : "border-slate-100"}`}
                >
                  <Ionicons
                    name="menu"
                    size={20}
                    color={lineSpacing === "relaxed" ? "#2563EB" : "#64748b"}
                  />
                  <Text
                    className={`font-bold text-xs mt-1 ${lineSpacing === "relaxed" ? "text-primary" : "text-slate-500"}`}
                  >
                    Relaxed
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Theme
              </Text>
              <View className="flex-row justify-between gap-3">
                <Pressable
                  onPress={() => setActiveTheme("light")}
                  className={`flex-1 py-4 rounded-2xl border-2 items-center bg-white ${activeTheme === "light" ? "border-primary" : "border-slate-200"}`}
                >
                  <Text className="font-bold text-slate-900">Light</Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTheme("sepia")}
                  className={`flex-1 py-4 rounded-2xl border-2 items-center bg-[#fbf0d9] ${activeTheme === "sepia" ? "border-primary" : "border-[#e8d5ae]"}`}
                >
                  <Text className="font-bold text-[#5f4b32]">Sepia</Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTheme("dark")}
                  className={`flex-1 py-4 rounded-2xl border-2 items-center bg-slate-900 ${activeTheme === "dark" ? "border-primary" : "border-slate-700"}`}
                >
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
