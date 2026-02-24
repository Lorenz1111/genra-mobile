import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View, Image, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Book } from "@/lib/types";
import { useRouter } from "expo-router";

// --- COMPONENT: Horizontal Book List ---
const HorizontalBookList = ({ title, books, onBookPress }: { title: string, books: Book[], onBookPress: (book: Book) => void }) => {
  if (!books || books.length === 0) return null;

  return (
      <View className="mb-8">
        <View className="flex-row justify-between items-center px-6 mb-3">
          <Text className="text-xl font-bold text-slate-900">{title}</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>

        <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
            data={books}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <Pressable className="w-32" onPress={() => onBookPress(item)}>
                  <Image
                      source={{ uri: item.cover_url || '' }}
                      className="w-full h-48 rounded-xl bg-gray-200 mb-2"
                      resizeMode="cover"
                  />
                  <Text className="font-bold text-slate-800 text-sm" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text className="text-xs text-slate-500 ml-1">{item.rating ? item.rating.toFixed(1) : '0.0'}</Text>
                  </View>
                </Pressable>
            )}
        />
      </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [profileName, setProfileName] = useState("Reader");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [continueReading, setContinueReading] = useState<any>(null);

  // Netflix-style Category States
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [topRatedBooks, setTopRatedBooks] = useState<Book[]>([]);
  const [romanceBooks, setRomanceBooks] = useState<Book[]>([]);
  const [sciFiBooks, setSciFiBooks] = useState<Book[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, interests")
          .eq("id", user.id)
          .single();

      if (profile) {
        setProfileName(profile.full_name || "Reader");
        setProfileAvatar(profile.avatar_url);
      }

      const userInterests = profile?.interests || [];

      const { data: progressData } = await supabase
          .from("reading_progress")
          .select("*, books(*), chapters(title, sequence_number)")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

      if (progressData) setContinueReading(progressData);

      const { data: allBooks, error } = await supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false });

      if (!error && allBooks) {
        const books = allBooks as Book[];

        // --- FILTERING LOGIC ---
        const topRated = [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setTopRatedBooks(topRated.slice(0, 10));

        // THE FIX: Fallback kung walang interests o walang nag-match
        if (userInterests.length > 0) {
          const recs = books.filter(b => userInterests.includes(b.genre || ''));
          setRecommendedBooks(recs.length > 0 ? recs.slice(0, 10) : topRated.slice(0, 10));
        } else {
          setRecommendedBooks(topRated.slice(0, 10)); // Top rated na lang ipapakita if no preference
        }

        const trending = [...books].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        setTrendingBooks(trending.slice(0, 10));

        setRomanceBooks(books.filter(b => b.genre === 'Romance').slice(0, 10));
        setSciFiBooks(books.filter(b => b.genre === 'Sci-Fi' || b.genre === 'Fantasy').slice(0, 10));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleBookPress = (book: Book) => {
    router.push(`/book/${book.id}`);
  };

  if (loading) return (
      <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#2563EB" /></View>
  );

  return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView
            className="flex-1 pt-4"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 mb-6">
            <View>
              <Text className="text-slate-500 text-sm font-medium uppercase tracking-wider">Welcome back,</Text>
              <Text className="text-2xl font-bold text-slate-900">{profileName}</Text>
            </View>
            <Image
                source={{ uri: profileAvatar || "https://ui-avatars.com/api/?name=" + profileName + "&background=2563EB&color=fff" }}
                className="w-12 h-12 rounded-full bg-blue-100"
            />
          </View>

          {/* Continue Reading */}
          {continueReading && (
              <View className="px-6 mb-8">
                <Text className="text-lg font-bold text-slate-900 mb-3">Jump back in</Text>
                <Pressable
                    className="flex-row bg-slate-900 rounded-2xl p-4 active:bg-slate-800 shadow-md"
                    onPress={() => router.push(`/book/read/${continueReading.chapter_id}`)}
                >
                  <Image source={{ uri: continueReading.books.cover_url || '' }} className="w-20 h-28 rounded-lg bg-gray-700" resizeMode="cover" />
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-white font-bold text-xl mb-1" numberOfLines={1}>{continueReading.books.title}</Text>
                    <Text className="text-slate-400 text-sm mb-4">Chapter {continueReading.chapters.sequence_number}: {continueReading.chapters.title}</Text>
                    <View className="self-start bg-primary px-4 py-2 rounded-full flex-row items-center">
                      <Ionicons name="play" size={14} color="white" />
                      <Text className="text-white font-bold text-xs ml-2 uppercase tracking-wider">Resume</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
          )}

          {/* Horizontal Rows */}
          <HorizontalBookList title="Recommended for You" books={recommendedBooks} onBookPress={handleBookPress} />
          <HorizontalBookList title="Trending Now" books={trendingBooks} onBookPress={handleBookPress} />
          <HorizontalBookList title="Top Rated" books={topRatedBooks} onBookPress={handleBookPress} />
          <HorizontalBookList title="Swoon-Worthy Romance" books={romanceBooks} onBookPress={handleBookPress} />
          <HorizontalBookList title="Epic Sci-Fi & Fantasy" books={sciFiBooks} onBookPress={handleBookPress} />

          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
  );
}