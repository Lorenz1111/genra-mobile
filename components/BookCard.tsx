import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface BookCardProps {
    book: any;
    onPress: () => void;
    variant?: 'grid' | 'horizontal';
    isRanked?: boolean;
    rankNumber?: number;
}

export const BookCard = ({
                             book,
                             onPress,
                             variant = 'grid',
                             isRanked = false,
                             rankNumber
                         }: BookCardProps) => {

    const isHot = (book.views_count || 0) >= 100;
    const isNew = new Date(book.created_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);

    const chapterNumbers = book.chapters?.map((c: any) => c.sequence_number) || [];
    const latestChapter = chapterNumbers.length > 0 ? Math.max(...chapterNumbers) : 0;

    const validCover = book.cover_url && book.cover_url.trim() !== "" && book.cover_url !== "null"
        ? book.cover_url
        : 'https://placehold.co/150x200/e2e8f0/475569.png?text=No+Cover';

    return (
        <Pressable
            onPress={onPress}
            style={[
                variant === 'grid' ? { flex: 1, maxWidth: '48%', marginBottom: 24 } : { width: 128, marginRight: 16 },
                { overflow: 'visible' }
            ]}
        >
            <View style={{ position: 'relative', overflow: 'visible' }}>

                <Image
                    source={{ uri: validCover }}
                    style={{ width: '100%', height: 192, borderRadius: 12, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#f1f5f9', zIndex: 10 }}
                    resizeMode="cover"
                />

                {isRanked && rankNumber && (
                    <Text
                        style={{
                            position: 'absolute', left: -14, bottom: -14, fontSize: 75, fontWeight: '900', color: '#ffffff', zIndex: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 6
                        }}
                    >
                        {rankNumber}
                    </Text>
                )}

                <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 20, flexDirection: 'column', gap: 6 }}>
                    {isHot && (
                        <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hot</Text>
                        </View>
                    )}
                    {!isHot && isNew && (
                        <View style={{ backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>New</Text>
                        </View>
                    )}
                </View>

                {latestChapter > 0 && (
                    <View style={{ position: 'absolute', bottom: 10, right: 8, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>Ch. {latestChapter}</Text>
                    </View>
                )}
            </View>

            <Text className="font-bold text-slate-800 text-sm mt-2" numberOfLines={2}>
                {book.title || "Untitled"}
            </Text>

            <View className="flex-row items-center mt-1 justify-between pr-1">
                <View className="flex-row items-center">
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text className="text-xs font-bold text-slate-500 ml-1">
                        {Number(book.rating || 0).toFixed(1)}
                    </Text>
                </View>

                {/* SENIOR DEV FIX: Laging ipinapakita ang Views kasama ang eye icon! */}
                <View className="flex-row items-center">
                    <Ionicons name="eye" size={12} color="#94a3b8" style={{ marginRight: 3 }} />
                    <Text className="text-[10px] text-slate-400 font-medium" numberOfLines={1}>
                        {book.views_count || 0}
                    </Text>
                </View>
            </View>

        </Pressable>
    );
};