import { View, Text } from "react-native";

export default function LibraryScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-12">
      <Text className="text-slate-900 text-2xl font-semibold">My Library</Text>
      <Text className="text-slate-600 mt-2 text-sm">
        Your saved books and highlights live here.
      </Text>
    </View>
  );
}
