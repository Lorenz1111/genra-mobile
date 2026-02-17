import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { BookCard } from "../../components/BookCard";
import { Book } from "../../lib/types"; // Import the real type
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  // Tanggalin ang manual "type Book = ..."
  // Gamitin ang Book type galing sa database
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasInterests, setHasInterests] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check User Interests
      const { data: profile } = await supabase
          .from("profiles")
          .select("interests")
          .eq("id", user.id)
          .single();

      const interests = profile?.interests || [];
      const hasPrefs = interests.length > 0;
      setHasInterests(hasPrefs);

      // 2. Build Query
      let query = supabase.from("books").select("*");

      if (hasPrefs) {
        // Postgrest syntax for array overlap is contains or overlaps
        // Pero simplehan muna natin: kumuha ng top rated books na pasok sa genre
        query = query.in("genre", interests).order("rating", { ascending: false });
      } else {
        query = query.order("rating", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
      } else {
        setBooks(data || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBooks();
  }, [loadBooks]);

  // Handle Book Click
  const handleBookPress = (book: Book) => {
    router.push(`/book/${book.id}`);
  };

  if (loading) {
    return (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator color="#2563EB" />
        </View>
    );
  }

  return (
      <View className="flex-1 bg-white px-6 pt-12">
        <Text className="text-slate-900 text-2xl font-semibold">
          {hasInterests ? "Recommended for You" : "Top Picks"}
        </Text>

        <FlatList
            className="mt-6"
            data={books}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            renderItem={({ item }) => (
                <BookCard
                    book={item}
                    onPress={() => handleBookPress(item)}
                />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="mt-10 items-center">
                <Text className="text-slate-500">No books found.</Text>
              </View>
            }
        />
      </View>
  );
}