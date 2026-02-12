import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  genre: string;
  rating: number;
};

type BookCardProps = {
  book: Book;
  onPress?: (book: Book) => void;
};

export function BookCard({ book, onPress }: BookCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(book)}
      className="flex-1 rounded-2xl bg-white p-3"
    >
      <Image
        source={{ uri: book.cover_url }}
        className="w-full rounded-xl bg-gray-100"
        style={{ aspectRatio: 2 / 3 }}
        resizeMode="cover"
      />

      <Text
        className="mt-3 text-slate-900 text-sm font-semibold"
        numberOfLines={2}
      >
        {book.title}
      </Text>
      <Text className="mt-1 text-slate-500 text-xs" numberOfLines={1}>
        {book.author}
      </Text>

      <View className="mt-2 flex-row items-center gap-1">
        <Ionicons name="star" size={12} color="#f59e0b" />
        <Text className="text-slate-600 text-xs">{book.rating}</Text>
      </View>
    </Pressable>
  );
}
