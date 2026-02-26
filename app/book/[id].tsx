import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert, Share, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Book, Chapter } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { StarRating } from "@/components/StarRating";
import { CommentSection } from "@/components/CommentSection";
import { LinearGradient } from 'expo-linear-gradient';

export default function BookDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const bookId = typeof id === 'string' ? id : (id?.[0] || '');

    const [book, setBook] = useState<any>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [userRating, setUserRating] = useState<number>(0);

    const [activeTab, setActiveTab] = useState<'about' | 'chapters' | 'comments'>('about');
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const [sortAsc, setSortAsc] = useState(true);
    const [readingProgress, setReadingProgress] = useState<any>(null);

    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!bookId) return;
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();

            const { data: bookData } = await supabase
                .from("books")
                .select(`
                    *, 
                    profiles(full_name),
                    book_genres(genres(name))
                `)
                .eq("id", bookId)
                .single();

            if (bookData) setBook(bookData);

            const { data: chapterData } = await supabase
                .from("chapters")
                .select("*")
                .eq("book_id", bookId)
                .order("sequence_number", { ascending: true });

            if (chapterData) setChapters(chapterData as any);

            if (user) {
                const { data: bookmark } = await supabase.from("user_library").select("*").eq("user_id", user.id).eq("book_id", bookId).single();
                setIsBookmarked(!!bookmark);

                const { data: ratingData } = await supabase.from("book_ratings").select("rating").eq("user_id", user.id).eq("book_id", bookId).single();
                if (ratingData) setUserRating((ratingData as any).rating);

                const { data: progressData } = await supabase
                    .from("reading_progress")
                    .select("chapter_id, chapters(sequence_number)")
                    .eq("user_id", user.id)
                    .eq("book_id", bookId)
                    .single();

                if (progressData) setReadingProgress(progressData);
            }

            await supabase.rpc('increment_view_count', { book_id_param: bookId });
            setLoading(false);
        };

        fetchData();
    }, [bookId]);

    const sortedChapters = [...chapters].sort((a, b) =>
        sortAsc ? a.sequence_number - b.sequence_number : b.sequence_number - a.sequence_number
    );
    const firstChapter = chapters.length > 0 ? chapters[0] : null;

    const handleRateBook = async (stars: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !book) return Alert.alert("Notice", "You must be logged in to rate a book.");

        setUserRating(stars);
        const { error } = await supabase.from("book_ratings").upsert({ user_id: user.id, book_id: book.id, rating: stars });
        if (error) Alert.alert("Error", "Could not submit rating.");
    };

    const toggleBookmark = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !book) return Alert.alert("Notice", "You must be logged in to bookmark.");

        const previousState = isBookmarked;
        setIsBookmarked(!isBookmarked);

        try {
            if (previousState) {
                const { error } = await supabase.from("user_library").delete().eq("user_id", user.id).eq("book_id", book.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("user_library").insert({ user_id: user.id, book_id: book.id });
                if (error) throw error;
            }
        } catch (error) {
            setIsBookmarked(previousState);
            Alert.alert("Error", "Could not update library.");
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this awesome story I'm reading on GenrA: "${book.title}" by ${book.profiles?.full_name || 'Unknown Author'}!\n\nRead it here: https://genra.app/book/${book.id}`,
                title: book.title,
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handleReadAction = () => {
        if (readingProgress && readingProgress.chapter_id) {
            router.push(`/book/read/${readingProgress.chapter_id}`);
        } else if (firstChapter) {
            router.push(`/book/read/${firstChapter.id}`);
        } else {
            Alert.alert("Oops!", "No chapters available yet.");
        }
    };

    // SENIOR DEV FIX: Improved Locked Alert
    const handleLockedChapter = (chapterTitle: string) => {
        Alert.alert(
            "Premium Chapter",
            `Unlock "${chapterTitle}" to continue reading. It costs 5 Coins.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unlock (5 🪙)",
                    onPress: () => Alert.alert("Coming Soon", "The Coin Top-up and Unlocking system is currently under development.")
                }
            ]
        );
    };

    if (loading) return <View className="flex-1 justify-center bg-white"><ActivityIndicator size="large" color="#2563EB" /></View>;
    if (!book) return <Text className="mt-10 text-center font-bold text-slate-500">Book not found</Text>;

    const genres = book.book_genres?.map((bg: any) => bg.genres?.name).filter(Boolean) || [];
    const validCover = book.cover_url || 'https://placehold.co/400x600/ffffff/94a3b8.png?text=No+Cover';

    return (
        <View className="flex-1 bg-white">

            {/* SENIOR DEV FIX: Tinanggal ang paddingBottom dito para 'di lumabas yung shadow */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                <View className="absolute top-12 left-0 right-0 z-20 flex-row justify-between px-6">
                    <Pressable onPress={() => router.back()} className="bg-black/30 p-2.5 rounded-full active:bg-black/50">
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </Pressable>
                    <Pressable onPress={handleShare} className="bg-black/30 p-2.5 rounded-full active:bg-black/50">
                        <Ionicons name="share-social" size={22} color="white" />
                    </Pressable>
                </View>

                <Pressable onPress={() => setIsImageViewerVisible(true)} className="relative active:opacity-90">
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent']}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 10 }}
                    />
                    <Image
                        source={{ uri: validCover }}
                        className="w-full h-[420px]"
                        resizeMode="cover"
                    />
                </Pressable>

                {/* SENIOR DEV FIX: Nilagay ang `pb-32` dito sa puting card para humaba hanggang ilalim ang puti */}
                <View className="px-6 -mt-32 pb-32 bg-white rounded-t-[40px] min-h-screen shadow-xl z-10 relative" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>

                    <View className="flex-row justify-between items-start pt-8">
                        <View className="flex-1 mr-4">
                            <Text className="text-3xl font-black text-slate-900 leading-tight">{book.title}</Text>
                            <Text className="text-base text-slate-500 font-medium mt-1">by {book.profiles?.full_name || 'Unknown Author'}</Text>
                        </View>

                        <Pressable onPress={toggleBookmark} className="p-3 bg-slate-50 rounded-full border border-slate-100 shadow-sm active:bg-slate-100">
                            <Ionicons
                                name={isBookmarked ? "heart" : "heart-outline"}
                                size={28}
                                color={isBookmarked ? "#dc2626" : "#64748b"}
                            />
                        </Pressable>
                    </View>

                    <View className="flex-row flex-wrap gap-2 mt-4">
                        {genres.map((genre: string, idx: number) => (
                            <View key={idx} className="bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                <Text className="text-blue-600 font-bold text-xs">{genre}</Text>
                            </View>
                        ))}
                    </View>

                    <View className="flex-row items-center mt-5 gap-6">
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="star" size={18} color="#f59e0b" />
                            <Text className="text-slate-700 font-bold text-base">{book.rating ? book.rating.toFixed(1) : '0.0'}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="eye" size={18} color="#64748b" />
                            <Text className="text-slate-700 font-bold text-base">{book.views_count || 0}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="list" size={18} color="#64748b" />
                            <Text className="text-slate-700 font-bold text-base">{chapters.length} Chaps</Text>
                        </View>
                    </View>

                    <View className="flex-row border-b border-slate-200 mt-8 mb-6">
                        <Pressable onPress={() => setActiveTab('about')} className={`flex-1 pb-3 items-center border-b-2 ${activeTab === 'about' ? 'border-primary' : 'border-transparent'}`}>
                            <Text className={`font-bold ${activeTab === 'about' ? 'text-primary' : 'text-slate-400'}`}>About</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveTab('chapters')} className={`flex-1 pb-3 items-center border-b-2 ${activeTab === 'chapters' ? 'border-primary' : 'border-transparent'}`}>
                            <Text className={`font-bold ${activeTab === 'chapters' ? 'text-primary' : 'text-slate-400'}`}>Chapters</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveTab('comments')} className={`flex-1 pb-3 items-center border-b-2 ${activeTab === 'comments' ? 'border-primary' : 'border-transparent'}`}>
                            <Text className={`font-bold ${activeTab === 'comments' ? 'text-primary' : 'text-slate-400'}`}>Comments</Text>
                        </Pressable>
                    </View>

                    {activeTab === 'about' && (
                        <View>
                            <Text className="text-lg font-bold text-slate-900 mb-2">Synopsis</Text>
                            <Text className="text-slate-600 leading-6 text-justify" numberOfLines={isDescExpanded ? undefined : 4}>
                                {book.description || "No synopsis available."}
                            </Text>

                            {(book.description?.length > 150) && (
                                <Pressable onPress={() => setIsDescExpanded(!isDescExpanded)} className="mt-2 self-start active:opacity-50">
                                    <Text className="text-primary font-bold text-sm">
                                        {isDescExpanded ? "Show Less" : "Read More"}
                                    </Text>
                                </Pressable>
                            )}

                            <View className="mt-8 bg-slate-50 p-5 rounded-2xl flex-row items-center justify-between border border-slate-100">
                                <View>
                                    <Text className="font-bold text-slate-800 text-base">Rate this book</Text>
                                    <Text className="text-[11px] text-slate-500 mt-0.5">Tell us what you think</Text>
                                </View>
                                <StarRating rating={userRating} onRate={handleRateBook} />
                            </View>
                        </View>
                    )}

                    {activeTab === 'chapters' && (
                        <View>
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-slate-800 font-bold text-base">
                                    Table of Contents
                                </Text>

                                <Pressable
                                    onPress={() => setSortAsc(!sortAsc)}
                                    className="flex-row items-center bg-slate-50 px-4 py-2 rounded-full border border-slate-200 active:bg-slate-100"
                                >
                                    <Ionicons name="swap-vertical" size={14} color="#64748b" />
                                    <Text className="text-xs font-bold text-slate-600 ml-1">
                                        {sortAsc ? "Oldest First" : "Newest First"}
                                    </Text>
                                </Pressable>
                            </View>

                            {chapters.length === 0 ? (
                                <Text className="text-center text-slate-400 italic mt-6">No chapters uploaded yet.</Text>
                            ) : (
                                sortedChapters.map((chapter) => {
                                    const isCurrentChapter = readingProgress?.chapter_id === chapter.id;

                                    return (
                                        <Pressable
                                            key={chapter.id}
                                            className={`flex-row items-center py-3 px-4 mb-3 rounded-2xl border ${isCurrentChapter ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'} ${chapter.is_locked ? 'opacity-80' : 'active:border-blue-300'}`}
                                            onPress={() => {
                                                if (chapter.is_locked) {
                                                    handleLockedChapter(chapter.title);
                                                } else {
                                                    router.push(`/book/read/${chapter.id}`);
                                                }
                                            }}
                                        >
                                            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${isCurrentChapter ? 'bg-blue-600' : 'bg-slate-100'}`}>
                                                <Text className={`font-black text-sm ${isCurrentChapter ? 'text-white' : 'text-slate-400'}`}>
                                                    {chapter.sequence_number}
                                                </Text>
                                            </View>

                                            <View className="flex-1 pr-4">
                                                <View className="flex-row items-center gap-2 mb-0.5">
                                                    <Text className={`font-bold text-sm flex-1 ${isCurrentChapter ? 'text-blue-900' : 'text-slate-800'}`} numberOfLines={1}>
                                                        {chapter.title}
                                                    </Text>
                                                    {isCurrentChapter && (
                                                        <View className="bg-blue-200 px-1.5 py-0.5 rounded">
                                                            <Text className="text-[9px] font-bold text-blue-800 uppercase tracking-widest">Reading</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                                                    {new Date(chapter.created_at).toLocaleDateString()}
                                                </Text>
                                            </View>

                                            {/* SENIOR DEV FIX: Improved Lock & Download UI */}
                                            {chapter.is_locked ? (
                                                <View className="flex-row items-center gap-1.5">
                                                    <Text className="text-amber-500 font-bold text-xs">5</Text>
                                                    <Ionicons name="sparkles" size={12} color="#f59e0b" />
                                                    <View className="bg-red-50 p-1.5 rounded-full ml-1">
                                                        <Ionicons name="lock-closed" size={14} color="#ef4444" />
                                                    </View>
                                                </View>
                                            ) : (
                                                <View className="flex-row items-center gap-3">
                                                    {/* Download Icon para sa Unlocked Chapters */}
                                                    <Ionicons name="cloud-download-outline" size={20} color="#cbd5e1" />
                                                    <Ionicons name="play-circle" size={28} color={isCurrentChapter ? "#2563EB" : "#e2e8f0"} />
                                                </View>
                                            )}
                                        </Pressable>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {activeTab === 'comments' && (
                        <View>
                            <CommentSection bookId={bookId} />
                        </View>
                    )}

                </View>
            </ScrollView>

            {chapters.length > 0 && (
                <View className="absolute bottom-8 right-6 z-30 shadow-lg">
                    <Pressable
                        onPress={handleReadAction}
                        className="bg-blue-600 rounded-full px-6 py-3.5 flex-row justify-center items-center shadow-md active:bg-blue-800"
                        style={{ elevation: 5 }}
                    >
                        <Ionicons
                            name={readingProgress ? "play" : "book"}
                            size={18}
                            color="white"
                            style={{ marginRight: 6 }}
                        />
                        <Text className="text-white font-black text-sm uppercase tracking-wider">
                            {readingProgress ? `Ch. ${readingProgress.chapters?.sequence_number || ''}` : 'Read'}
                        </Text>
                    </Pressable>
                </View>
            )}

            <Modal
                visible={isImageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsImageViewerVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center">
                    <View className="w-[80%] aspect-[2/3] bg-black p-1.5 rounded-2xl relative shadow-2xl">
                        <Pressable
                            onPress={() => setIsImageViewerVisible(false)}
                            className="absolute -top-4 -right-4 z-50 p-1.5 bg-slate-800 border-[1.5px] border-slate-600 rounded-full active:bg-slate-700 shadow-lg"
                        >
                            <Ionicons name="close" size={20} color="white" />
                        </Pressable>
                        <Image
                            source={{ uri: validCover }}
                            className="w-full h-full rounded-xl"
                            resizeMode="cover"
                        />
                    </View>
                </View>
            </Modal>

        </View>
    );
}