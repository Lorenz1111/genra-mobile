import { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator, Keyboard, Pressable, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Searchbar } from "@/components/SearchBar";
import { BookCard } from "@/components/BookCard";
import AsyncStorage from '@react-native-async-storage/async-storage'; // SENIOR DEV FIX: Import AsyncStorage

export default function SearchScreen() {
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [allBooks, setAllBooks] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [dbGenres, setDbGenres] = useState<string[]>([]);
    const [trendingAuthors, setTrendingAuthors] = useState<any[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        // SENIOR DEV FIX: Load saved search history on startup
        const loadHistory = async () => {
            try {
                const savedHistory = await AsyncStorage.getItem('search_history');
                if (savedHistory) {
                    setRecentSearches(JSON.parse(savedHistory));
                }
            } catch (error) {
                console.error("Failed to load history", error);
            }
        };

        const fetchSearchData = async () => {
            const { data: genresData } = await supabase.from("genres").select("name").order("name");
            if (genresData) setDbGenres(genresData.map(g => g.name));

            const { data: booksData, error } = await supabase
                .from("books")
                .select(`
                    *, 
                    profiles(id, full_name, avatar_url), 
                    book_genres(genres(name)), 
                    chapters(sequence_number)
                `)
                .eq("status", "approved")
                .order("views_count", { ascending: false });

            if (!error && booksData) {
                const formattedBooks = booksData.map(book => ({
                    ...book,
                    genreList: book.book_genres?.map((bg: any) => bg.genres?.name) || []
                }));
                setAllBooks(formattedBooks);

                const authorsMap = new Map();
                formattedBooks.forEach(book => {
                    if (book.profiles && book.author_id) {
                        if (!authorsMap.has(book.author_id)) {
                            authorsMap.set(book.author_id, {
                                id: book.author_id,
                                name: book.profiles.full_name || 'Unknown Author',
                                avatar: book.profiles.avatar_url || `https://ui-avatars.com/api/?name=${book.profiles.full_name}&background=cbd5e1&color=fff`
                            });
                        }
                    }
                });
                setTrendingAuthors(Array.from(authorsMap.values()).slice(0, 10));
            }
            setLoading(false);
        };

        loadHistory();
        fetchSearchData();
    }, []);

    const handleSearch = (text: string) => {
        setQuery(text);

        if (!text.trim()) {
            setResults([]);
            return;
        }

        const searchLower = text.toLowerCase();
        const filtered = allBooks.filter((book) => {
            const titleMatch = book.title?.toLowerCase().includes(searchLower);
            const authorMatch = book.profiles?.full_name?.toLowerCase().includes(searchLower);
            const genreMatch = book.genreList.some((genre: string) => genre.toLowerCase().includes(searchLower));

            return titleMatch || authorMatch || genreMatch;
        });

        setResults(filtered);
    };

    // SENIOR DEV FIX: Save to AsyncStorage
    const saveToHistory = async (searchTerm: string) => {
        const term = searchTerm.trim();
        if (!term) return;

        setRecentSearches(prev => {
            const newHistory = [term, ...prev.filter(item => item.toLowerCase() !== term.toLowerCase())].slice(0, 8);

            // Save immediately sa storage ng phone
            AsyncStorage.setItem('search_history', JSON.stringify(newHistory)).catch(err => console.error("Error saving history:", err));

            return newHistory;
        });
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        Keyboard.dismiss();
    };

    // SENIOR DEV FIX: Clear from AsyncStorage
    const handleClearHistory = async () => {
        setRecentSearches([]);
        try {
            await AsyncStorage.removeItem('search_history');
        } catch (error) {
            console.error("Error clearing history", error);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white pt-4" edges={['top']}>
            <View className="px-6 mb-4">
                <Text className="text-slate-900 text-3xl font-black">Explore</Text>
                <Text className="text-slate-500 mt-1 text-sm font-medium mb-5">Find stories, authors, and collections.</Text>

                <Searchbar
                    value={query}
                    onChangeText={handleSearch}
                    onClear={handleClear}
                    onSubmitEditing={() => saveToHistory(query)}
                />
            </View>

            <View className="flex-1">
                {loading ? (
                    <ActivityIndicator color="#2563EB" className="mt-10" />
                ) : query.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => String(item.id)}
                        numColumns={2}
                        showsVerticalScrollIndicator={false}
                        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
                        contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <BookCard
                                book={item}
                                onPress={() => {
                                    saveToHistory(query);
                                    router.push(`/book/${item.id}`);
                                }}
                                variant="grid"
                            />
                        )}
                        ListEmptyComponent={
                            <View className="mt-16 items-center px-6">
                                <Ionicons name="search-outline" size={48} color="#cbd5e1" className="mb-4" />
                                <Text className="text-xl font-bold text-slate-900">No results found</Text>
                                <Text className="text-slate-500 text-center mt-2 leading-5">
                                    We couldn't find any stories matching "{query}". Try searching for a different title or author.
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                        <View className="mt-2 mb-8">
                            <Text className="px-6 text-slate-800 font-bold text-base mb-3">Browse Genres</Text>
                            {dbGenres.length > 0 ? (
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 24 }}
                                    data={dbGenres}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            onPress={() => {
                                                handleSearch(item);
                                                saveToHistory(item);
                                            }}
                                            className="mr-2 px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200 active:bg-slate-100"
                                        >
                                            <Text className="font-bold text-sm text-slate-700">{item}</Text>
                                        </Pressable>
                                    )}
                                />
                            ) : (
                                <Text className="px-6 text-slate-400 italic">Loading genres...</Text>
                            )}
                        </View>

                        {recentSearches.length > 0 && (
                            <View className="px-6 mb-8">
                                <View className="flex-row justify-between items-center mb-3">
                                    <Text className="text-slate-800 font-bold text-base">Recent Searches</Text>
                                    <Pressable onPress={handleClearHistory} className="active:opacity-50">
                                        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">Clear</Text>
                                    </Pressable>
                                </View>

                                <View className="flex-row flex-wrap gap-2">
                                    {recentSearches.map((searchItem, index) => (
                                        <Pressable
                                            key={index}
                                            onPress={() => handleSearch(searchItem)}
                                            className="flex-row items-center py-2 px-4 bg-slate-50 border border-slate-200 rounded-full active:bg-slate-100"
                                        >
                                            <Ionicons name="time-outline" size={14} color="#94a3b8" />
                                            <Text className="ml-1.5 text-slate-600 font-medium text-sm">{searchItem}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {trendingAuthors.length > 0 && (
                            <View className="mb-8">
                                <Text className="px-6 text-slate-800 font-bold text-base mb-4">Trending Authors</Text>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 24, gap: 20 }}
                                    data={trendingAuthors}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            onPress={() => {
                                                handleSearch(item.name);
                                                saveToHistory(item.name);
                                            }}
                                            className="items-center w-20 active:opacity-70"
                                        >
                                            <Image
                                                source={{ uri: item.avatar }}
                                                className="w-16 h-16 rounded-full bg-slate-200 mb-2 border border-slate-200"
                                            />
                                            <Text className="text-xs font-bold text-slate-800 text-center" numberOfLines={2}>
                                                {item.name}
                                            </Text>
                                        </Pressable>
                                    )}
                                />
                            </View>
                        )}

                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}