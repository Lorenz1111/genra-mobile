import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { Book, Chapter } from "../../lib/types";
import { Ionicons } from "@expo/vector-icons";

export default function BookDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [book, setBook] = useState<Book | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);

    // New State for Bookmark
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            const { data: { user } } = await supabase.auth.getUser();

            // 1. Get Book & Chapters (Existing logic)
            const { data: bookData } = await supabase.from("books").select("*, profiles(full_name)").eq("id", id).single();
            const { data: chapterData } = await supabase.from("chapters").select("*").eq("book_id", id).order("sequence_number", { ascending: true });

            if (bookData) setBook(bookData as any);
            if (chapterData) setChapters(chapterData as any);

            // 2. CHECK IF BOOKMARKED (New Logic)
            if (user) {
                const { data: bookmark } = await supabase
                    .from("user_library")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("book_id", id)
                    .single();

                // Kung may nahanap, true. Kung wala, false.
                setIsBookmarked(!!bookmark);
            }

            setLoading(false);
        };

        fetchData();
    }, [id]);

    // 3. TOGGLE BOOKMARK FUNCTION
    const toggleBookmark = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !book) return;

        // Optimistic UI Update (Palitan agad icon para mabilis tingnan)
        const previousState = isBookmarked;
        setIsBookmarked(!isBookmarked);

        try {
            if (previousState) {
                // Remove from Library
                const { error } = await supabase
                    .from("user_library")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("book_id", book.id);
                if (error) throw error;
            } else {
                // Add to Library
                const { error } = await supabase
                    .from("user_library")
                    .insert({ user_id: user.id, book_id: book.id });
                if (error) throw error;
            }
        } catch (error) {
            // Revert pag nag-error
            setIsBookmarked(previousState);
            Alert.alert("Error", "Could not update library.");
        }
    };

    if (loading) return <ActivityIndicator className="mt-10" color="#2563EB" />;
    if (!book) return <Text className="mt-10 text-center">Book not found</Text>;

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Back Button */}
            <Pressable onPress={() => router.back()} className="absolute top-12 left-6 z-10 bg-white/80 p-2 rounded-full shadow-sm">
                <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>

            <Image source={{ uri: book.cover_url || '' }} className="w-full h-80 bg-gray-200" resizeMode="cover"/>

            <View className="p-6 -mt-6 bg-white rounded-t-3xl min-h-screen">

                {/* HEADER WITH BOOKMARK BUTTON */}
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

                {/* Existing Stats Code... */}
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

                <Text className="mt-6 text-lg font-semibold text-slate-900">Synopsis</Text>
                <Text className="mt-2 text-slate-600 leading-6 mb-6">{book.description}</Text>

                <Text className="text-xl font-bold text-slate-900 mb-4">Chapters</Text>
                {/* Existing Chapter List Code... */}
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
            </View>
        </ScrollView>
    );
}