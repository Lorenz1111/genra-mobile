import { View, TextInput, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SearchBarProps = TextInputProps;

export function SearchBar({ ...inputProps }: SearchBarProps) {
  return (
    <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <Ionicons name="search-outline" size={18} color="#2563EB" />
      <TextInput
        placeholderTextColor="#94a3b8"
        className="ml-3 flex-1 text-slate-900"
        {...inputProps}
      />
    </View>
  );
}
