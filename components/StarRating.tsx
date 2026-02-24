import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StarRatingProps {
    rating: number; // 1 to 5
    onRate: (stars: number) => void;
    size?: number;
}

export const StarRating = ({ rating, onRate, size = 24 }: StarRatingProps) => {
    return (
        <View className="flex-row gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => onRate(star)} className="p-1">
                    <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={size}
                        color="#f59e0b" // Amber/Gold color
                    />
                </Pressable>
            ))}
        </View>
    );
};