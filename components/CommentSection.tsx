import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Image, Keyboard, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

interface CommentVote { user_id: string; vote_type: 'like' | 'dislike'; }
interface Comment {
    id: string; comment_text: string; created_at: string; user_id: string; parent_id: string | null;
    profiles: { full_name: string | null; avatar_url: string | null; is_verified: boolean; } | null;
    comment_votes: CommentVote[];
}

const timeAgo = (dateString: string) => {
    const now = new Date(); const past = new Date(dateString); const diffMs = now.getTime() - past.getTime();
    if (diffMs < 60000) return "Just now"; const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`; const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`; const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d`; return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CommentSection = ({ bookId }: { bookId: string }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [visibleCount, setVisibleCount] = useState(5);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [shownReplies, setShownReplies] = useState<{ [key: string]: boolean }>({});

    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [selectedComment, setSelectedComment] = useState<{ id: string, isMyComment: boolean } | null>(null);

    const replyInputRef = useRef<TextInput>(null);

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
            .select(`*, profiles(full_name, avatar_url, is_verified), comment_votes(user_id, vote_type)`)
            .eq("book_id", bookId)
            .order("created_at", { ascending: false });

        if (!error && data) setComments(data as any);
        setLoading(false);
    };

    const handlePostComment = async (parentId: string | null = null, replyTargetName: string = "") => {
        let finalCommentText = parentId ? replyText.trim() : newComment.trim();
        if (parentId && replyTargetName && !finalCommentText.startsWith('@')) {
            finalCommentText = `@${replyTargetName} ${finalCommentText}`;
        }
        if (!finalCommentText) return;
        if (!currentUserId) return Alert.alert("Notice", "You need to log in to post.");

        setSubmitting(true);
        const { error } = await supabase.from("book_comments").insert({ book_id: bookId, user_id: currentUserId, comment_text: finalCommentText, parent_id: parentId });

        if (error) { Alert.alert("Error", "Failed to post comment."); }
        else {
            if (parentId) {
                setReplyingToId(null); setReplyText(""); setShownReplies(prev => ({ ...prev, [parentId]: true }));
            } else { setNewComment(""); }
            Keyboard.dismiss(); fetchComments();
        }
        setSubmitting(false);
    };

    const openActionSheet = (commentId: string, isMyComment: boolean) => {
        setSelectedComment({ id: commentId, isMyComment }); setActionSheetVisible(true);
    };

    const handleActionSheetAction = async (action: 'delete' | 'report') => {
        setActionSheetVisible(false);
        if (!selectedComment) return;

        setTimeout(async () => {
            if (action === 'delete') {
                const { error } = await supabase.from("book_comments").delete().eq("id", selectedComment.id);
                if (!error) setComments(comments.filter(c => c.id !== selectedComment.id));
                else Alert.alert("Error", "Failed to delete.");
            } else if (action === 'report') {
                Alert.alert("Reported", "Thanks for keeping our community safe. Our team will review this comment.");
            }
        }, 300);
    };

    const handleVote = async (commentId: string, type: 'like' | 'dislike') => {
        if (!currentUserId) return Alert.alert("Notice", "Please log in to vote.");

        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                let newVotes = [...(c.comment_votes || [])];
                const index = newVotes.findIndex(v => v.user_id === currentUserId);
                if (index >= 0) {
                    if (newVotes[index].vote_type === type) newVotes.splice(index, 1);
                    else newVotes[index].vote_type = type;
                } else newVotes.push({ user_id: currentUserId, vote_type: type });
                return { ...c, comment_votes: newVotes };
            }
            return c;
        }));

        const comment = comments.find(c => c.id === commentId);
        const existingVote = comment?.comment_votes?.find(v => v.user_id === currentUserId);

        if (existingVote && existingVote.vote_type === type) {
            await supabase.from("comment_votes").delete().eq("comment_id", commentId).eq("user_id", currentUserId);
        } else {
            await supabase.from("comment_votes").upsert({ comment_id: commentId, user_id: currentUserId, vote_type: type }, { onConflict: 'comment_id, user_id' });
        }
    };

    const mainComments = comments.filter(c => c.parent_id === null);
    const displayedMainComments = mainComments.slice(0, visibleCount);
    const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const CommentAvatar = ({ url, size = "w-10 h-10", iconSize = 20 }: { url: string | null, size?: string, iconSize?: number }) => {
        if (url && url !== "null" && url.trim() !== "") return <Image source={{ uri: url }} className={`${size} rounded-full bg-slate-200 border border-slate-100`} />;
        return <View className={`${size} rounded-full bg-slate-100 items-center justify-center border border-slate-200`}><Ionicons name="person" size={iconSize} color="#94a3b8" /></View>;
    };

    // SENIOR DEV FIX: Skeleton Loader para sa Comments
    if (loading) return (
        <View className="pb-10">
            <Text className="text-lg font-bold text-slate-900 mb-4">Reviews & Comments</Text>
            {[1, 2, 3].map((i) => (
                <View key={i} className="mb-6 flex-row items-start">
                    <View className="w-10 h-10 rounded-full bg-slate-200 animate-pulse mr-2" />
                    <View className="flex-1">
                        <View className="bg-slate-100 p-4 rounded-2xl border border-slate-50 w-full animate-pulse h-20" />
                        <View className="flex-row gap-4 mt-2 ml-2">
                            <View className="w-8 h-3 bg-slate-200 animate-pulse rounded" />
                            <View className="w-8 h-3 bg-slate-200 animate-pulse rounded" />
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <View className="pb-10 relative">
            <Text className="text-lg font-bold text-slate-900 mb-4">Reviews & Comments ({comments.length})</Text>

            <View className="flex-row items-center bg-slate-100 rounded-3xl pl-4 pr-1.5 py-1 border border-slate-200 mb-8 shadow-sm">
                <TextInput
                    className="flex-1 text-slate-800 max-h-32 py-3 px-3 text-[15px] leading-5 p-0"
                    placeholder="Write a review..."
                    placeholderTextColor="#94a3b8"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                />
                <Pressable
                    onPress={() => handlePostComment(null)} disabled={submitting || !newComment.trim()}
                    className="w-10 h-10 rounded-full items-center justify-center ml-1"
                    style={{ backgroundColor: newComment.trim() ? '#2563EB' : 'transparent' }}
                >
                    {submitting && !replyingToId ? <ActivityIndicator color="#94a3b8" size="small" /> : <Ionicons name="send" size={18} color={newComment.trim() ? "white" : "#94a3b8"} style={newComment.trim() ? { marginLeft: 2 } : {}} />}
                </Pressable>
            </View>

            {displayedMainComments.length === 0 ? (
                <View className="items-center justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <Ionicons name="chatbubbles-outline" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <Text className="text-slate-500 font-medium">No comments yet.</Text>
                </View>
            ) : (
                displayedMainComments.map((mainComment) => {
                    const isMyMainComment = mainComment.user_id === currentUserId;
                    const mainVotes = mainComment.comment_votes || [];
                    const mainLikeCount = mainVotes.filter(v => v.vote_type === 'like').length;
                    const mainDislikeCount = mainVotes.filter(v => v.vote_type === 'dislike').length;
                    const myMainVote = mainVotes.find(v => v.user_id === currentUserId)?.vote_type;

                    const replies = getReplies(mainComment.id);
                    const isReplyingInline = replyingToId === mainComment.id;
                    const showReplies = shownReplies[mainComment.id];

                    return (
                        <View key={mainComment.id} className="mb-6">
                            <Pressable onLongPress={() => openActionSheet(mainComment.id, isMyMainComment)} delayLongPress={300} className="flex-row items-start active:opacity-80 mb-2">
                                <View className="mr-2 mt-0.5"><CommentAvatar url={mainComment.profiles?.avatar_url || null} /></View>
                                <View className="flex-1">
                                    <View className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-100">
                                        <View className="flex-row items-center gap-1.5 mb-1">
                                            <Text className="font-bold text-slate-900 text-[13px]">{mainComment.profiles?.full_name || "Anonymous Reader"}</Text>
                                            {mainComment.profiles?.is_verified && <Ionicons name="checkmark-circle" size={14} color="#2563EB" />}
                                            <Text className="text-[11px] text-slate-400 font-medium ml-1">{timeAgo(mainComment.created_at)}</Text>
                                        </View>
                                        <Text className="text-slate-800 text-[15px] leading-5">{mainComment.comment_text}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-5 mt-1.5 ml-2">
                                        <Pressable onPress={() => handleVote(mainComment.id, 'like')} className="flex-row items-center gap-1 active:opacity-50">
                                            <Ionicons name={myMainVote === 'like' ? "thumbs-up" : "thumbs-up-outline"} size={14} color={myMainVote === 'like' ? "#2563EB" : "#94a3b8"} />
                                            <Text className={`text-xs font-bold ${myMainVote === 'like' ? 'text-blue-600' : 'text-slate-500'}`}>{mainLikeCount}</Text>
                                        </Pressable>
                                        <Pressable onPress={() => handleVote(mainComment.id, 'dislike')} className="flex-row items-center gap-1 active:opacity-50">
                                            <Ionicons name={myMainVote === 'dislike' ? "thumbs-down" : "thumbs-down-outline"} size={14} color={myMainVote === 'dislike' ? "#ef4444" : "#94a3b8"} />
                                            <Text className={`text-xs font-bold ${myMainVote === 'dislike' ? 'text-red-500' : 'text-slate-500'}`}>{mainDislikeCount}</Text>
                                        </Pressable>
                                        <Pressable onPress={() => { setReplyingToId(isReplyingInline ? null : mainComment.id); setReplyText(""); if (!isReplyingInline) setTimeout(() => replyInputRef.current?.focus(), 100); }}>
                                            <Text className="text-xs font-bold text-slate-500">Reply</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </Pressable>

                            {(replies.length > 0 || isReplyingInline) && (
                                <View className="ml-[48px]">
                                    {replies.length > 0 && !showReplies && (
                                        <Pressable onPress={() => setShownReplies(prev => ({ ...prev, [mainComment.id]: true }))} className="mb-3 py-1 active:opacity-60">
                                            <Text className="text-sm font-bold text-blue-600">View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}...</Text>
                                        </Pressable>
                                    )}

                                    {showReplies && replies.map(reply => {
                                        const isMyReply = reply.user_id === currentUserId;
                                        const replyVotes = reply.comment_votes || [];
                                        const replyLikeCount = replyVotes.filter(v => v.vote_type === 'like').length;
                                        const replyDislikeCount = replyVotes.filter(v => v.vote_type === 'dislike').length;
                                        const myReplyVote = replyVotes.find(v => v.user_id === currentUserId)?.vote_type;

                                        let replyName = ""; let actualText = reply.comment_text;
                                        if (actualText.startsWith('@')) {
                                            const spaceIdx = actualText.indexOf(' ');
                                            if (spaceIdx !== -1) { replyName = actualText.substring(0, spaceIdx); actualText = actualText.substring(spaceIdx + 1); }
                                        }

                                        return (
                                            <Pressable key={reply.id} onLongPress={() => openActionSheet(reply.id, isMyReply)} delayLongPress={300} className="flex-row items-start mb-2 active:opacity-80">
                                                <View className="mr-2 mt-0.5"><CommentAvatar url={reply.profiles?.avatar_url || null} size="w-8 h-8" iconSize={16} /></View>
                                                <View className="flex-1">
                                                    <View className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-100">
                                                        <View className="flex-row items-center gap-1.5 mb-1">
                                                            <Text className="font-bold text-slate-900 text-[13px]">{reply.profiles?.full_name || "Anonymous Reader"}</Text>
                                                            {reply.profiles?.is_verified && <Ionicons name="checkmark-circle" size={14} color="#2563EB" />}
                                                            <Text className="text-[11px] text-slate-400 font-medium ml-1">{timeAgo(reply.created_at)}</Text>
                                                        </View>
                                                        <Text className="text-slate-800 text-[15px] leading-5">{replyName ? <Text className="text-blue-600 font-bold">{replyName} </Text> : null}{actualText}</Text>
                                                    </View>
                                                    <View className="flex-row items-center gap-4 mt-1.5 ml-2">
                                                        <Pressable onPress={() => handleVote(reply.id, 'like')} className="flex-row items-center gap-1 active:opacity-50">
                                                            <Ionicons name={myReplyVote === 'like' ? "thumbs-up" : "thumbs-up-outline"} size={14} color={myReplyVote === 'like' ? "#2563EB" : "#94a3b8"} />
                                                            <Text className={`text-[11px] font-bold ${myReplyVote === 'like' ? 'text-blue-600' : 'text-slate-500'}`}>{replyLikeCount}</Text>
                                                        </Pressable>
                                                        <Pressable onPress={() => handleVote(reply.id, 'dislike')} className="flex-row items-center gap-1 active:opacity-50">
                                                            <Ionicons name={myReplyVote === 'dislike' ? "thumbs-down" : "thumbs-down-outline"} size={14} color={myReplyVote === 'dislike' ? "#ef4444" : "#94a3b8"} />
                                                            <Text className={`text-[11px] font-bold ${myReplyVote === 'dislike' ? 'text-red-500' : 'text-slate-500'}`}>{replyDislikeCount}</Text>
                                                        </Pressable>
                                                        <Pressable onPress={() => { setReplyingToId(mainComment.id); setReplyText(`@${reply.profiles?.full_name?.split(" ")[0]} `); setTimeout(() => replyInputRef.current?.focus(), 100); }}>
                                                            <Text className="text-[11px] font-bold text-slate-500">Reply</Text>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        );
                                    })}

                                    {isReplyingInline && (
                                        <View className="flex-row items-center mt-2 mb-2">
                                            <TextInput
                                                ref={replyInputRef} className="flex-1 bg-white border border-blue-200 text-slate-800 py-1.5 px-3 text-[15px] leading-5 rounded-full"
                                                placeholder={`Reply to ${mainComment.profiles?.full_name?.split(" ")[0]}...`} placeholderTextColor="#94a3b8" value={replyText} onChangeText={setReplyText}
                                            />
                                            <Pressable onPress={() => handlePostComment(mainComment.id, mainComment.profiles?.full_name || "User")} disabled={submitting || !replyText.trim()} className="w-9 h-9 ml-2 justify-center items-center rounded-full bg-blue-600" style={{ backgroundColor: replyText.trim() ? '#2563EB' : 'transparent' }}>
                                                <Ionicons name="send" size={14} color={replyText.trim() ? "white" : "#94a3b8"} style={replyText.trim() ? { marginLeft: 2 } : {}}/>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })
            )}

            {visibleCount < mainComments.length && (
                <Pressable onPress={() => setVisibleCount(prev => prev + 5)} className="py-3 items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 active:bg-slate-100 mt-2 shadow-sm">
                    <Text className="text-slate-700 font-bold text-base">View more reviews</Text>
                </Pressable>
            )}

            <Modal transparent={true} visible={actionSheetVisible} animationType="slide" onRequestClose={() => setActionSheetVisible(false)}>
                <View className="flex-1 justify-end bg-black/40">
                    <Pressable className="absolute inset-0" onPress={() => setActionSheetVisible(false)} />
                    <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl z-10">
                        <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
                        <Text className="text-center text-slate-400 font-black text-xs uppercase tracking-widest mb-4">Comment Options</Text>
                        {selectedComment?.isMyComment ? (
                            <Pressable onPress={() => handleActionSheetAction('delete')} className="flex-row items-center p-4 bg-red-50 rounded-2xl mb-3 active:opacity-70">
                                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4"><Ionicons name="trash" size={20} color="#dc2626" /></View>
                                <Text className="text-red-600 font-bold text-lg">Delete my comment</Text>
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => handleActionSheetAction('report')} className="flex-row items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-3 active:opacity-70">
                                <View className="w-10 h-10 bg-slate-200 rounded-full items-center justify-center mr-4"><Ionicons name="flag" size={20} color="#475569" /></View>
                                <Text className="text-slate-800 font-bold text-lg">Report this comment</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={() => setActionSheetVisible(false)} className="items-center py-4 mt-2 active:bg-slate-50 rounded-2xl">
                            <Text className="text-slate-500 font-bold text-lg">Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
};