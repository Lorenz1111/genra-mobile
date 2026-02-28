import { useCallback, useEffect, useState, useRef } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View, Image, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { BookCard } from "@/components/BookCard";

const HorizontalBookList = ({ title, books, onBookPress, emptyMessage = "No books found.", isRanked = false }: { title: string, books: any[], onBookPress: (book: any) => void, emptyMessage?: string, isRanked?: boolean }) => {
    if (!books || books.length === 0) return (
        <View className="mb-8 px-6">
            <Text className="text-xl font-bold text-slate-900 mb-2 flex-1" numberOfLines={1}>{title}</Text>
            <Text className="text-slate-400 italic">{emptyMessage}</Text>
        </View>
    );

    return (
        <View className="mb-8">
            <View className="flex-row justify-between items-center px-6 mb-3">
                <Text className="text-xl font-bold text-slate-900 pr-2 flex-1" numberOfLines={1}>{title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>

            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 10 }}
                data={books}
                // SENIOR DEV FIX: Pinilit nating maging string ang key para iwas crash
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item, index }) => (
                    // SENIOR DEV FIX: Tinanggal na yung wrapper View, BookCard na lang direktang nag-ha-handle ng margin!
                    <BookCard
                        book={item}
                        onPress={() => onBookPress(item)}
                        variant="horizontal"
                        isRanked={isRanked}
                        rankNumber={index + 1}
                    />
                )}
            />
        </View>
    );
};

export default function HomeScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    useScrollToTop(scrollViewRef);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
    const [userCoins, setUserCoins] = useState(0);
    const [isPremium, setIsPremium] = useState(false);
    const [continueReading, setContinueReading] = useState<any>(null);

    const [sliderGenres, setSliderGenres] = useState<string[]>(['For You']);
    const [activeGenre, setActiveGenre] = useState<string>('For You');
    const [userInterests, setUserInterests] = useState<string[]>([]);

    const [allFetchedBooks, setAllFetchedBooks] = useState<any[]>([]);
    const [dynamicGenreBooks, setDynamicGenreBooks] = useState<any[]>([]);
    const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
    const [topRatedBooks, setTopRatedBooks] = useState<any[]>([]);
    const [freshBooks, setFreshBooks] = useState<any[]>([]);
    const [bookOfTheWeek, setBookOfTheWeek] = useState<any>(null);

    const loadDashboardData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from("profiles").select("avatar_url, coins, is_verified").eq("id", user.id).single();
            if (profile) {
                setProfileAvatar(profile.avatar_url);
                setUserCoins(profile.coins || 0);
                setIsPremium(profile.is_verified || false);
            }

            const { data: userPrefs } = await supabase.from("user_preferred_genres").select("genres(name)").eq("profile_id", user.id);
            const myInterests = userPrefs?.map((up: any) => up.genres?.name).filter(Boolean) || [];
            setUserInterests(myInterests);

            const { data: allGenresData } = await supabase.from("genres").select("name").order("name");
            const allGenreNames = allGenresData?.map(g => g.name) || [];
            setSliderGenres(Array.from(new Set(['For You', ...myInterests, ...allGenreNames])));

            const { data: progressData } = await supabase
                .from("reading_progress")
                .select("*, books(*), chapters(title, sequence_number)")
                .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).single();
            if (progressData) setContinueReading(progressData);

            const { data: booksData, error } = await supabase
                .from("books")
                .select(`*, profiles(full_name), book_genres(genres(name)), chapters(sequence_number)`)
                .eq("status", "approved")
                .order("created_at", { ascending: false });

            if (!error && booksData) {
                const formattedBooks = booksData.map(book => ({
                    ...book,
                    genreList: book.book_genres?.map((bg: any) => bg.genres?.name) || []
                }));

                setAllFetchedBooks(formattedBooks);

                const topRated = [...formattedBooks].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
                setTopRatedBooks(topRated.slice(0, 10));

                const trending = [...formattedBooks].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
                setTrendingBooks(trending.slice(0, 10));

                const fresh = [...formattedBooks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setFreshBooks(fresh.slice(0, 10));

                if (topRated.length > 0) {
                    setBookOfTheWeek(topRated[0]);
                }

                filterDynamicBooks('For You', formattedBooks, myInterests);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

    const onRefresh = useCallback(() => { setRefreshing(true); loadDashboardData(); }, [loadDashboardData]);

    const handleGenreClick = (genreName: string) => {
        setActiveGenre(genreName);
        filterDynamicBooks(genreName, allFetchedBooks, userInterests);
    };

    const filterDynamicBooks = (selectedGenre: string, allBooks: any[], interests: string[]) => {
        if (selectedGenre === 'For You') {
            if (interests.length > 0) {
                const matchedBooks = allBooks.filter(b => b.genreList.some((g: string) => interests.includes(g)));
                setDynamicGenreBooks(matchedBooks.length > 0 ? matchedBooks.slice(0, 10) : allBooks.slice(0, 10));
            } else {
                setDynamicGenreBooks(allBooks.slice(0, 10));
            }
        } else {
            const filtered = allBooks.filter(b => b.genreList.includes(selectedGenre));
            setDynamicGenreBooks(filtered.slice(0, 10));
        }
    };

    const handleBookPress = (book: any) => { router.push(`/book/${book.id}`); };

    const showPremiumAlert = () => Alert.alert("Coming Soon 🚀", "GenrA Premium subscriptions are currently in development. Stay tuned!");
    const showCoinAlert = () => Alert.alert("Coming Soon 🪙", "Coin top-ups and daily rewards will be available in the next update!");

    if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#2563EB" /></View>;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* TOP HEADER */}
                <View className="flex-row justify-between items-center px-6 pt-2 pb-6">
                    <Pressable
                        onPress={showPremiumAlert}
                        className="flex-row items-center bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-full active:bg-slate-100"
                    >
                        <View className={`w-2 h-2 rounded-full mr-2 ${isPremium ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        <Text className="text-slate-800 font-bold text-sm">{isPremium ? 'GenrA Premium' : 'Free Tier'}</Text>
                        <Ionicons name="chevron-down" size={14} color="#64748b" style={{ marginLeft: 4 }} />
                    </Pressable>

                    <View className="flex-row items-center gap-3">
                        <Pressable
                            onPress={showCoinAlert}
                            className="flex-row items-center bg-amber-50 border border-amber-200 py-1 px-3 rounded-full active:bg-amber-100"
                        >
                            <Ionicons name="sparkles" size={14} color="#d97706" />
                            <Text className="text-amber-700 font-bold ml-1.5">{userCoins}</Text>
                        </Pressable>

                        <Pressable onPress={() => router.push("/(tabs)/profile")}>
                            <Image source={{ uri: profileAvatar || "https://ui-avatars.com/api/?name=User&background=2563EB&color=fff" }} className="w-9 h-9 rounded-full border border-slate-200" />
                        </Pressable>
                    </View>
                </View>

                {/* CONTINUE READING CARD */}
                {continueReading && (
                    <View className="px-6 mb-8">
                        <Text className="text-lg font-extrabold text-slate-900 mb-3">Pick up where you left off</Text>
                        <Pressable
                            // SENIOR DEV FIX: Tinanggal ang shadow-* classes para iwas crash
                            className="flex-row bg-slate-900 rounded-2xl p-4 active:bg-slate-800"
                            onPress={() => router.push(`/book/read/${continueReading.chapter_id}`)}
                        >
                            <Image source={{ uri: continueReading.books.cover_url || 'https://via.placeholder.com/150x200' }} className="w-20 h-28 rounded-lg bg-gray-700 border border-slate-700" resizeMode="cover" />
                            <View className="flex-1 ml-4 justify-center">
                                <Text className="text-white font-bold text-xl mb-1" numberOfLines={1}>{continueReading.books.title}</Text>
                                <Text className="text-slate-400 text-sm mb-4 font-medium" numberOfLines={1}>
                                    Ch. {continueReading.chapters.sequence_number}: {continueReading.chapters.title}
                                </Text>
                                <View className="self-start bg-blue-600 px-5 py-2.5 rounded-full flex-row items-center">
                                    <Ionicons name="book" size={14} color="white" />
                                    <Text className="text-white font-bold text-xs ml-2 uppercase tracking-wider">Continue Reading</Text>
                                </View>
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* GENRE SLIDER */}
                <View className="mb-6">
                    <FlatList
                        horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}
                        data={sliderGenres} keyExtractor={(item) => item}
                        renderItem={({ item }) => {
                            const isActive = activeGenre === item;
                            return (
                                <Pressable onPress={() => handleGenreClick(item)} className={`mr-2 px-4 py-2 rounded-full border ${isActive ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}>
                                    <Text className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-600'}`}>{item}</Text>
                                </Pressable>
                            )
                        }}
                    />
                </View>

                {/* DYNAMIC BOOK ROW */}
                <HorizontalBookList title={activeGenre === 'For You' ? 'Recommended for You' : `Best in ${activeGenre}`} books={dynamicGenreBooks} onBookPress={handleBookPress} emptyMessage={`No books found for ${activeGenre} yet.`} />

                {/* TRENDING RANKED */}
                <HorizontalBookList title="Trending on GenrA" books={trendingBooks} onBookPress={handleBookPress} isRanked={true} />

                {/* THE HERO CARD: BOOK OF THE WEEK */}
                {bookOfTheWeek && (
                    <View className="px-6 mb-8 mt-2">
                        <Text className="text-xl font-bold text-slate-900 mb-3">Book of the Week</Text>
                        <Pressable
                            onPress={() => handleBookPress(bookOfTheWeek)}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-row items-start active:bg-slate-100"
                        >
                            <Image source={{ uri: bookOfTheWeek.cover_url || 'https://via.placeholder.com/150x200' }} className="w-24 h-36 rounded-lg bg-slate-200" resizeMode="cover" />
                            <View className="flex-1 ml-4">
                                <View className="bg-amber-100 self-start px-2 py-0.5 rounded text-amber-800 mb-1 border border-amber-200"><Text className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Editor&#39;s Pick</Text></View>
                                <Text className="text-lg font-bold text-slate-900" numberOfLines={2}>{bookOfTheWeek.title}</Text>
                                <Text className="text-xs text-slate-500 font-medium mb-2">by {bookOfTheWeek.profiles?.full_name || 'Unknown Author'}</Text>
                                <Text className="text-sm text-slate-600 mb-2 leading-5" numberOfLines={3}>
                                    {bookOfTheWeek.description || "No description provided for this masterpiece."}
                                </Text>
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* PROMO BANNER */}
                <View className="px-6 mb-8 mt-2">
                    <Pressable
                        onPress={showCoinAlert}
                        // SENIOR DEV FIX: Tinanggal ang shadow-* classes para iwas crash
                        className="bg-blue-600 rounded-2xl p-5 items-center flex-row justify-between active:bg-blue-700"
                    >
                        <View className="flex-1 pr-4">
                            <Text className="text-white font-extrabold text-lg mb-1">Unlock Premium Stories</Text>
                            <Text className="text-blue-100 text-xs leading-4">
                                Get 500 free coins on your first top-up and support your favorite authors.
                            </Text>
                        </View>
                        <View className="bg-white px-5 py-2.5 rounded-full">
                            <Text className="text-blue-600 font-black text-xs uppercase tracking-wider">Top Up</Text>
                        </View>
                    </Pressable>
                </View>

                {/* NEW RELEASES */}
                <HorizontalBookList title="Freshly Published" books={freshBooks} onBookPress={handleBookPress} />

                {/* TOP RATED */}
                <HorizontalBookList title="Top Rated Masterpieces" books={topRatedBooks} onBookPress={handleBookPress} />

            </ScrollView>
        </SafeAreaView>
    );
}
