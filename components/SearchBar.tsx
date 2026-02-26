import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchbarProps {
    value: string;
    onChangeText: (text: string) => void;
    onClear: () => void;
    onSubmitEditing?: () => void; // SENIOR DEV FIX: Bagong prop para sa History
}

export const Searchbar = ({ value, onChangeText, onClear, onSubmitEditing }: SearchbarProps) => {
    return (
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <Ionicons name="search" size={20} color="#94a3b8" />

            <TextInput
                className="flex-1 ml-3 text-slate-800 text-base font-medium p-0"
                placeholder="Search GenrA..."
                placeholderTextColor="#94a3b8"
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={onSubmitEditing} // I-trigger kapag pinindot ang Search sa keyboard
                autoCapitalize="none"
                returnKeyType="search"
            />

            {value.length > 0 && (
                <Pressable onPress={onClear} className="p-1 active:opacity-50">
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </Pressable>
            )}
        </View>
    );
};