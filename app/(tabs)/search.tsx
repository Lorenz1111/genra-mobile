import { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Searchbar } from "@/components/SearchBar";
import { BookCard } from "@/components/BookCard";
import { Book } from "@/lib/types";

export default function SearchScreen() {
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    // Function to perform the actual search
    const performSearch = async (searchText: string) => {
        if (!searchText.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // SUPABASE SEARCH QUERY
            // Hinahanap natin kung match ba sa Title OR sa Genre
            const { data, error } = await supabase
                .from("books")
                .select("*, profiles(full_name)")
                .or(`title.ilike.%${searchText}%, genre.ilike.%${searchText}%`)
                .order("views_count", { ascending: false }); // Show popular matches first

            if (error) throw error;
            setResults((data as any) || []);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handler kapag nagta-type si user (The Debounce Logic)
    const handleSearch = (text: string) => {
        setQuery(text);

        // 1. Clear previous timer kung meron man (Cancel previous search request)
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // 2. Set new timer. Wait 500ms before searching.
        const newTimeout = setTimeout(() => {
            performSearch(text);
        }, 500);

        setTypingTimeout(newTimeout);
    };

    return (
        <SafeAreaView className="flex-1 bg-white px-6 pt-4">
            <Text className="text-slate-900 text-2xl font-semibold">Explore</Text>
            <Text className="text-slate-600 mt-1 text-sm">Find stories, authors, and collections.</Text>

            {/* Search Input */}
            <Searchbar
                value={query}
                onChangeText={handleSearch}
                onClear={() => {
                    setQuery("");
                    setResults([]);
                    Keyboard.dismiss();
                }}
            />

            {/* Results Section */}
            <View className="flex-1 mt-6">
                {loading ? (
                    <ActivityIndicator color="#2563EB" className="mt-10" />
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        columnWrapperStyle={{ gap: 12 }}
                        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
                        keyboardShouldPersistTaps="handled" // Para pwede i-click result kahit naka-open keyboard

                        // Render Book Card
                        renderItem={({ item }) => (
                            <BookCard
                                book={item}
                                onPress={() => router.push(`/book/${item.id}`)}
                            />
                        )}

                        // Empty State (Kung walang tinype o walang nahanap)
                        ListEmptyComponent={
                            <View className="mt-10 items-center px-6">
                                {query.length > 0 ? (
                                    // Case A: Nag-search pero walang result
                                    <>
                                        <Text className="text-xl font-bold text-slate-900">No results found</Text>
                                        <Text className="text-slate-500 text-center mt-2">
                                            {`We couldn't find any books matching "${query}". Try a different keyword.`}
                                        </Text>
                                    </>
                                ) : (
                                    // Case B: Hindi pa nagse-search (Initial State)
                                    <>
                                        <Text className="text-slate-400 font-medium mb-4">Popular Genres</Text>
                                        <View className="flex-row flex-wrap gap-2 justify-center">
                                            {['Romance', 'Fantasy', 'Sci-Fi', 'Mystery', 'Horror'].map((genre) => (
                                                <Text
                                                    key={genre}
                                                    onPress={() => handleSearch(genre)} // Clickable tags
                                                    className="bg-gray-100 px-4 py-2 rounded-full text-slate-600 font-medium overflow-hidden"
                                                >
                                                    {genre}
                                                </Text>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}