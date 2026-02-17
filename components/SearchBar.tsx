import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchbarProps {
    value: string;
    onChangeText: (text: string) => void;
    onClear: () => void;
}

export const Searchbar = ({ value, onChangeText, onClear }: SearchbarProps) => {
    return (
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
            <Ionicons name="search" size={20} color="#94a3b8" />

            <TextInput
                className="flex-1 ml-3 text-slate-800 text-base font-medium"
                placeholder="Search GenrA"
                placeholderTextColor="#94a3b8"
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                returnKeyType="search"
            />

            {/* Show Clear Button only if there is text */}
            {value.length > 0 && (
                <Pressable onPress={onClear}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </Pressable>
            )}
        </View>
    );
};