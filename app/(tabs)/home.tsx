import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { BookCard } from "../../components/BookCard";

type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  genre: string;
  rating: number;
};

export default function HomeScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasInterests, setHasInterests] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setBooks([]);
        setHasInterests(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError) {
        setBooks([]);
        setHasInterests(false);
        return;
      }

      const interests = Array.isArray(profile?.interests)
        ? profile?.interests
        : [];
      const hasPrefs = interests.length > 0;
      setHasInterests(hasPrefs);

      let query = supabase.from("books").select("*");

      if (hasPrefs) {
        query = query.in("genre", interests);
      } else {
        query = query.order("rating", { ascending: false });
      }

      const { data: booksData, error: booksError } = await query;

      if (booksError) {
        setBooks([]);
        return;
      }

      setBooks((booksData as Book[]) ?? []);
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
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => <BookCard book={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="mt-10 items-center">
            <Text className="text-slate-500">No recommendations yet.</Text>
          </View>
        }
      />
    </View>
  );
}
