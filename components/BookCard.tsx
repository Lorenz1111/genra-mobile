import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Book } from "@/lib/types";

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

export const BookCard = ({ book, onPress }: BookCardProps) => {
  return (
      // Max-w-[48%] ensures exactly 2 items fit in a row cleanly
      <Pressable className="flex-1 max-w-[48%] mb-4" onPress={onPress}>
        <Image
            source={{ uri: book.cover_url || '' }}
            className="w-full h-56 rounded-xl bg-gray-200 mb-2"
            resizeMode="cover"
        />
        <Text className="font-bold text-slate-800 text-sm" numberOfLines={2}>
          {book.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text className="text-xs text-slate-500 ml-1">
            {book.rating ? book.rating.toFixed(1) : '0.0'}
          </Text>
        </View>
      </Pressable>
  );
};