import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, Pressable, Image, Alert } from "react-native";
import { useFocusEffect, useRouter, Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Book } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from 'react-native-gesture-handler';

// --- TIME AGO FORMATTER ---
const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
};

export default function LibraryScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'history' | 'bookmarks' | 'downloads'>('history');

    const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
    const [historyBooks, setHistoryBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [sortOption, setSortOption] = useState<'recent' | 'az'>('recent');

    const fetchLibraryData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: bookmarksData, error: bookmarksError } = await supabase
                .from("user_library")
                .select(`book_id, books:books (*)`)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (!bookmarksError && bookmarksData) {
                setBookmarkedBooks(bookmarksData.map((item) => item.books) as Book[]);
            }

            const { data: historyData, error: historyError } = await supabase
                .from("reading_progress")
                .select(`updated_at, chapter_id, book_id, books (*), chapters (sequence_number, title)`)
                .eq("user_id", user.id)
                .order("updated_at", { ascending: false });

            if (!historyError && historyData) {
                setHistoryBooks(historyData);
            }

        } catch (error) {
            console.error("Error fetching library:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchLibraryData(); }, []));

    const onRefresh = () => { setRefreshing(true); fetchLibraryData(); };

    // --- SWIPE TO DELETE LOGIC ---
    const handleDeleteHistory = async (bookId: string) => {
        Alert.alert("Remove History", "Are you sure you want to remove this book from your history?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { error } = await supabase
                        .from("reading_progress")
                        .delete()
                        .eq("user_id", user.id)
                        .eq("book_id", bookId);

                    if (!error) {
                        setHistoryBooks(prev => prev.filter(item => item.book_id !== bookId));
                    } else {
                        Alert.alert("Error", "Could not remove from history.");
                    }
                }
            }
        ]);
    };

    const renderHistoryItem = ({ item }: { item: any }) => {
        const book = item.books;
        const chapter = item.chapters;
        if (!book) return null;

        const renderRightActions = () => (
            <Pressable
                onPress={() => handleDeleteHistory(item.book_id)}
                className="bg-red-500 justify-center items-center w-20 rounded-2xl mb-3 ml-3 active:bg-red-600"
            >
                <Ionicons name="trash" size={24} color="white" />
            </Pressable>
        );

        return (
            <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
                <Pressable
                    onPress={() => router.push(`/book/${book.id}`)}
                    className="flex-row items-center bg-white border border-slate-100 p-3 rounded-2xl mb-3 shadow-sm active:bg-slate-50"
                >
                    <Image source={{ uri: book.cover_url || 'https://placehold.co/150x200/ffffff/94a3b8.png?text=No+Cover' }} className="w-16 h-24 rounded-lg bg-slate-200" resizeMode="cover" />

                    <View className="flex-1 ml-4 justify-center">
                        <Text className="text-slate-900 font-bold text-base mb-0.5" numberOfLines={1}>{book.title}</Text>
                        <Text className="text-blue-600 font-semibold text-xs mb-2">Ch. {chapter?.sequence_number || '?'}</Text>

                        <View className="h-1.5 bg-slate-100 rounded-full w-3/4 mb-2 overflow-hidden">
                            <View className="h-full bg-blue-500 rounded-full w-1/2" />
                        </View>

                        <Text className="text-[10px] text-slate-400 uppercase tracking-widest">
                            {timeAgo(item.updated_at)}
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => item.chapter_id && router.push(`/book/read/${item.chapter_id}`)}
                        className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center active:bg-blue-100 ml-2"
                    >
                        <Ionicons name="play" size={20} color="#2563EB" style={{ marginLeft: 2 }} />
                    </Pressable>
                </Pressable>
            </Swipeable>
        );
    };

    const getSortedBookmarks = () => {
        if (sortOption === 'az') {
            return [...bookmarkedBooks].sort((a, b) => {
                const titleA = a.title?.toLowerCase() || '';
                const titleB = b.title?.toLowerCase() || '';
                return titleA.localeCompare(titleB);
            });
        }
        return bookmarkedBooks;
    };

    const sortedBookmarks = getSortedBookmarks();

    const HistorySkeleton = () => (
        <View className="flex-row bg-slate-50 border border-slate-100 p-3 rounded-2xl mb-3">
            <View className="w-16 h-24 rounded-lg bg-slate-200" />
            <View className="flex-1 ml-4 justify-center">
                <View className="w-3/4 h-5 bg-slate-200 rounded mb-2" />
                <View className="w-1/2 h-3 bg-slate-200 rounded mb-3" />
                <View className="w-3/4 h-1.5 bg-slate-200 rounded-full mb-3" />
                <View className="w-1/3 h-2 bg-slate-200 rounded" />
            </View>
            <View className="w-12 h-12 rounded-full bg-slate-200 ml-2 self-center" />
        </View>
    );

    const BookmarkSkeleton = () => (
        <View style={{ width: '31%' }} className="mb-4">
            <View className="w-full aspect-[2/3] bg-slate-200 rounded-xl mb-2" />
            <View className="w-full h-3 bg-slate-200 rounded mb-1" />
            <View className="w-2/3 h-2 bg-slate-200 rounded" />
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>

            <Tabs.Screen options={{
                title: 'Library',
                href: '/library'
            }} />

            <View className="px-6 pt-6 flex-1">

                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-slate-900 text-3xl font-black">Library</Text>
                </View>

                {/* TAB NAVIGATION */}
                <View className="flex-row bg-slate-100 p-1 rounded-full mb-4">
                    <Pressable onPress={() => setActiveTab('history')} className="flex-1 py-2 rounded-full items-center justify-center shadow-sm" style={{ backgroundColor: activeTab === 'history' ? 'white' : 'transparent' }}>
                        <Text className={`font-bold text-sm ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-500'}`}>History</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('bookmarks')} className="flex-1 py-2 rounded-full items-center justify-center shadow-sm" style={{ backgroundColor: activeTab === 'bookmarks' ? 'white' : 'transparent' }}>
                        <Text className={`font-bold text-sm ${activeTab === 'bookmarks' ? 'text-blue-600' : 'text-slate-500'}`}>Saved</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('downloads')} className="flex-1 py-2 rounded-full items-center justify-center shadow-sm" style={{ backgroundColor: activeTab === 'downloads' ? 'white' : 'transparent' }}>
                        <Text className={`font-bold text-sm ${activeTab === 'downloads' ? 'text-blue-600' : 'text-slate-500'}`}>Downloads</Text>
                    </Pressable>
                </View>

                {/* SORTING TOGGLE FOR BOOKMARKS */}
                {activeTab === 'bookmarks' && bookmarkedBooks.length > 0 && (
                    <View className="flex-row justify-end mb-4">
                        <Pressable
                            onPress={() => setSortOption(sortOption === 'recent' ? 'az' : 'recent')}
                            className="flex-row items-center bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 active:bg-slate-100"
                        >
                            <Ionicons name="filter" size={12} color="#64748b" />
                            <Text className="text-xs font-bold text-slate-600 ml-1.5">
                                {sortOption === 'recent' ? 'Recently Added' : 'A-Z Alphabetical'}
                            </Text>
                        </Pressable>
                    </View>
                )}

                {loading ? (
                    <View className="flex-1">
                        {activeTab === 'history' ? (
                            <><HistorySkeleton /><HistorySkeleton /><HistorySkeleton /></>
                        ) : (
                            <View className="flex-row justify-between">
                                <BookmarkSkeleton /><BookmarkSkeleton /><BookmarkSkeleton />
                            </View>
                        )}
                    </View>
                ) : (
                    <>
                        {/* --- HISTORY TAB --- */}
                        {activeTab === 'history' && (
                            <FlatList
                                data={historyBooks}
                                keyExtractor={(item) => item.book_id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 24 }}
                                renderItem={renderHistoryItem}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                                ListEmptyComponent={
                                    <View className="mt-20 items-center px-8">
                                        <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
                                            <Ionicons name="time-outline" size={40} color="#93c5fd" />
                                        </View>
                                        <Text className="text-slate-800 font-bold text-lg mb-2">No history yet</Text>
                                        <Text className="text-slate-500 text-sm text-center">Start reading some stories and they will magically appear here.</Text>
                                    </View>
                                }
                            />
                        )}

                        {/* --- BOOKMARKS / SAVED TAB --- */}
                        {activeTab === 'bookmarks' && (
                            <FlatList
                                data={sortedBookmarks}
                                keyExtractor={(item) => item.id}
                                numColumns={3}
                                showsVerticalScrollIndicator={false}
                                columnWrapperStyle={{ justifyContent: 'flex-start', gap: 12, marginBottom: 20 }}
                                contentContainerStyle={{ paddingBottom: 24 }}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={{ width: '31%' }}
                                        onPress={() => router.push(`/book/${item.id}`)}
                                        className="active:opacity-70 mb-2"
                                    >
                                        <View className="w-full aspect-[2/3] rounded-xl bg-slate-200 border border-slate-100 overflow-hidden mb-2 shadow-sm">
                                            <Image
                                                source={{ uri: item.cover_url || 'https://placehold.co/600x900/ffffff/94a3b8.png?text=No+Cover' }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        </View>
                                        <Text className="text-slate-800 font-bold text-xs leading-4 mb-0.5" numberOfLines={2}>
                                            {item.title || "Untitled Book"}
                                        </Text>

                                        {/* SENIOR DEV FIX: justify-between at lighter gray views */}
                                        <View className="flex-row items-center justify-between mt-1">
                                            <View className="flex-row items-center gap-0.5">
                                                <Ionicons name="star" size={10} color="#f59e0b" />
                                                <Text style={{ color: "#94a3b8" }} className="text-[10px] font-bold">
                                                    {(item as any).rating ? Number((item as any).rating).toFixed(1) : '0.0'}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center gap-0.5">
                                                <Ionicons name="eye" size={10} color="#94a3b8" />
                                                <Text className="text-[10px] font-medium text-slate-400">
                                                    {(item as any).views_count || 0}
                                                </Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                )}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                                ListEmptyComponent={
                                    <View className="mt-20 items-center px-8">
                                        <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-4">
                                            <Ionicons name="bookmark-outline" size={40} color="#fca5a5" />
                                        </View>
                                        <Text className="text-slate-800 font-bold text-lg mb-2">Library is empty</Text>
                                        <Text className="text-slate-500 text-sm text-center">Go explore and bookmark the stories you love so you won&#39;t lose them!</Text>
                                    </View>
                                }
                            />
                        )}

                        {/* --- DOWNLOADS TAB (STATIC) --- */}
                        {activeTab === 'downloads' && (
                            <View className="flex-1 items-center mt-20 px-8">
                                <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-4 border border-slate-200">
                                    <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
                                </View>
                                <Text className="text-slate-800 font-bold text-lg mb-2">Offline Reading</Text>
                                <Text className="text-slate-500 text-sm text-center mb-8">
                                    The ability to download chapters and read without an internet connection is coming in the next update!
                                </Text>
                                <Pressable
                                    onPress={() => Alert.alert("Coming Soon", "We're working hard to bring you offline reading. Stay tuned!")}
                                    className="bg-slate-900 px-6 py-3 rounded-full active:bg-slate-800"
                                >
                                    <Text className="text-white font-bold text-sm">Notify Me</Text>
                                </Pressable>
                            </View>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}