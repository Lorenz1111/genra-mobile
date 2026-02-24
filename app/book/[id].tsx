import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { Book, Chapter } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { StarRating } from "@/components/StarRating";
import { CommentSection } from "@/components/CommentSection";

export default function BookDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    // FIX 1: Siguraduhin na "string" ang id at hindi array, para hindi mag-error ang Supabase
    const bookId = typeof id === 'string' ? id : (id?.[0] || '');

    const [book, setBook] = useState<Book | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [userRating, setUserRating] = useState<number>(0);

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            if (!bookId) return;

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Get Book Details
            const { data: bookData } = await supabase
                .from("books")
                .select("*, profiles(full_name)")
                .eq("id", bookId)
                .single();

            if (bookData) setBook(bookData as any);

            // 2. Get Chapters
            const { data: chapterData } = await supabase
                .from("chapters")
                .select("*")
                .eq("book_id", bookId)
                .order("sequence_number", { ascending: true });

            if (chapterData) setChapters(chapterData as any);

            // 3. Check Bookmark & Rating Status
            if (user) {
                // Check Bookmark
                const { data: bookmark } = await supabase
                    .from("user_library")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("book_id", bookId)
                    .single();

                setIsBookmarked(!!bookmark);

                // FIX 2: Check Rating (Nasa loob na ng `if (user)` para hindi mag null error)
                const { data: ratingData } = await supabase
                    .from("book_ratings")
                    .select("rating")
                    .eq("user_id", user.id)
                    .eq("book_id", bookId)
                    .single();

                // FIX 3: (ratingData as any) para mawala ang "never" error
                if (ratingData) setUserRating((ratingData as any).rating);
            }

            // 4. INCREMENT VIEW COUNT SA DATABASE
            await supabase.rpc('increment_view_count', { book_id_param: bookId });

            setLoading(false);
        };

        fetchData();
    }, [bookId]);

    // --- HANDLE RATING FUNCTION ---
    const handleRateBook = async (stars: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !book) {
            Alert.alert("Notice", "You must be logged in to rate a book.");
            return;
        }

        setUserRating(stars); // Optimistic UI update

        const { error } = await supabase
            .from("book_ratings")
            .upsert({
                user_id: user.id,
                book_id: book.id,
                rating: stars
            });

        if (error) {
            Alert.alert("Error", "Could not submit rating.");
            console.error(error);
        }
    };

    // --- TOGGLE BOOKMARK FUNCTION ---
    const toggleBookmark = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !book) {
            Alert.alert("Notice", "You must be logged in to bookmark.");
            return;
        }

        const previousState = isBookmarked;
        setIsBookmarked(!isBookmarked); // Optimistic Update

        try {
            if (previousState) {
                const { error } = await supabase
                    .from("user_library")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("book_id", book.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("user_library")
                    .insert({ user_id: user.id, book_id: book.id });
                if (error) throw error;
            }
        } catch (error) {
            setIsBookmarked(previousState);
            Alert.alert("Error", "Could not update library.");
        }
    };

    // --- UI RENDERING ---
    if (loading) return <ActivityIndicator className="mt-10" color="#2563EB" />;
    if (!book) return <Text className="mt-10 text-center">Book not found</Text>;

    return (
        <ScrollView className="flex-1 bg-white">
            <Pressable onPress={() => router.back()} className="absolute top-12 left-6 z-10 bg-white/80 p-2 rounded-full shadow-sm">
                <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>

            <Image source={{ uri: book.cover_url || '' }} className="w-full h-80 bg-gray-200" resizeMode="cover"/>

            {/* FIX 4: Nilinis ang UI para hindi doble-doble */}
            <View className="p-6 -mt-6 bg-white rounded-t-3xl min-h-screen">

                {/* HEADER & BOOKMARK BUTTON */}
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                        <Text className="text-2xl font-bold text-slate-900">{book.title}</Text>
                        <Text className="text-base text-primary font-medium mt-1">{book.genre}</Text>
                    </View>

                    <Pressable onPress={toggleBookmark} className="p-2">
                        <Ionicons
                            name={isBookmarked ? "heart" : "heart-outline"}
                            size={32}
                            color={isBookmarked ? "#dc2626" : "#64748b"}
                        />
                    </Pressable>
                </View>

                {/* STATS */}
                <View className="flex-row items-center mt-3 gap-4">
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="star" size={16} color="#f59e0b" />
                        <Text className="text-slate-700 font-bold">{book.rating || 0}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="eye" size={16} color="#64748b" />
                        <Text className="text-slate-700 font-bold">{book.views_count || 0}</Text>
                    </View>
                </View>

                {/* RATING COMPONENT */}
                <View className="mt-6 bg-slate-50 p-4 rounded-xl flex-row items-center justify-between border border-slate-100">
                    <View>
                        <Text className="font-bold text-slate-800">Rate this book</Text>
                        <Text className="text-xs text-slate-500">Tap a star to rate</Text>
                    </View>
                    <StarRating rating={userRating} onRate={handleRateBook} />
                </View>

                {/* SYNOPSIS */}
                <Text className="mt-6 text-lg font-semibold text-slate-900">Synopsis</Text>
                <Text className="mt-2 text-slate-600 leading-6 mb-6">{book.description}</Text>

                {/* CHAPTERS */}
                <Text className="text-xl font-bold text-slate-900 mb-4">Chapters</Text>
                {chapters.map((chapter) => (
                    <Pressable
                        key={chapter.id}
                        className="flex-row items-center justify-between py-4 border-b border-gray-100 active:bg-gray-50"
                        onPress={() => router.push(`/book/read/${chapter.id}`)}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                                <Text className="text-blue-600 font-bold text-xs">{chapter.sequence_number}</Text>
                            </View>
                            <Text className="text-slate-800 font-medium text-base">{chapter.title}</Text>
                        </View>
                        {chapter.is_locked ? <Ionicons name="lock-closed" size={18} color="#94a3b8" /> : <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />}
                    </Pressable>
                ))}
                <CommentSection bookId={bookId} />
            </View>
        </ScrollView>
    );
}