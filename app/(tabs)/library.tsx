import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { BookCard } from "../../components/BookCard";
import { Book } from "../../lib/types";

export default function LibraryScreen() {
    const router = useRouter();
    const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLibrary = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Kuhanin ang user_library at i-join sa books table
            const { data, error } = await supabase
                .from("user_library")
                .select(`
          book_id,
          books:books (*) 
        `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // 2. Format data (Extract book details from the join)
            // Note: TypeScript might complain about the join shape, casting as any helps for now
            const books = data.map((item: any) => item.books) as Book[];
            setLibraryBooks(books);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // useFocusEffect: Tuwing bubuksan mo ang Tab na to, magre-refresh siya.
    // (Para kung kaka-add mo lang sa Home, kita agad dito)
    useFocusEffect(
        useCallback(() => {
            fetchLibrary();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchLibrary();
    };

    return (
        <View className="flex-1 bg-white px-6 pt-12">
            <Text className="text-slate-900 text-2xl font-bold mb-4">My Library</Text>

            {loading ? (
                <ActivityIndicator color="#2563EB" className="mt-10" />
            ) : (
                <FlatList
                    data={libraryBooks}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 12 }}
                    contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
                    renderItem={({ item }) => (
                        <BookCard
                            book={item}
                            onPress={() => router.push(`/book/${item.id}`)}
                        />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View className="mt-20 items-center">
                            <Text className="text-slate-400 text-lg mb-2">Your library is empty.</Text>
                            <Text className="text-slate-400 text-sm text-center px-10">
                                Go explore and bookmark stories you love!
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}