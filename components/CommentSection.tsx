import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

interface Comment {
    id: string;
    comment_text: string;
    created_at: string;
    user_id: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
}

export const CommentSection = ({ bookId }: { bookId: string }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchComments();
        checkUser();
    }, [bookId]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const fetchComments = async () => {
        const { data, error } = await supabase
            .from("book_comments")
            .select("*, profiles(full_name, avatar_url)")
            .eq("book_id", bookId)
            .order("created_at", { ascending: false });

        if (error) {
            // Dito natin makikita sa terminal (console) kung may mali sa database
            console.error("Error fetching comments:", error);
        } else if (data) {
            setComments(data as any);
        }
        setLoading(false);
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        if (!currentUserId) {
            Alert.alert("Notice", "You need to log in to post a comment.");
            return;
        }

        setSubmitting(true);
        const { error } = await supabase
            .from("book_comments")
            .insert({
                book_id: bookId,
                user_id: currentUserId,
                comment_text: newComment.trim(),
            });

        if (error) {
            Alert.alert("Error", "Failed to post comment.");
            console.error(error);
        } else {
            setNewComment("");
            fetchComments(); // Refresh list after posting
        }
        setSubmitting(false);
    };

    if (loading) return <ActivityIndicator color="#2563EB" className="mt-4" />;

    return (
        <View className="mt-6">
            <Text className="text-xl font-bold text-slate-900 mb-4">Reviews & Comments</Text>

            {/* Input Area */}
            <View className="flex-row items-center gap-2 mb-6">
                <TextInput
                    className="flex-1 bg-gray-100 px-4 py-3 rounded-xl text-slate-800"
                    placeholder="What do you think of this book?"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                />
                <Pressable
                    onPress={handlePostComment}
                    disabled={submitting || !newComment.trim()}
                    className={`p-3 rounded-full ${newComment.trim() ? 'bg-primary' : 'bg-gray-300'}`}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Ionicons name="send" size={20} color="white" className="ml-1" />
                    )}
                </Pressable>
            </View>

            {/* Comment List */}
            {comments.length === 0 ? (
                <Text className="text-slate-500 italic text-center py-4">
                    No comments yet. Be the first to share your thoughts!
                </Text>
            ) : (
                comments.map((comment) => (
                    <View key={comment.id} className="mb-4 border-b border-gray-100 pb-4">
                        <View className="flex-row items-center mb-2">
                            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                                <Text className="text-blue-600 font-bold text-xs uppercase">
                                    {comment.profiles?.full_name?.charAt(0) || "U"}
                                </Text>
                            </View>
                            <View>
                                <Text className="font-bold text-slate-800 text-sm">
                                    {comment.profiles?.full_name || "Anonymous Reader"}
                                </Text>
                                <Text className="text-xs text-slate-400">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-slate-700 leading-5">
                            {comment.comment_text}
                        </Text>
                    </View>
                ))
            )}
        </View>
    );
};