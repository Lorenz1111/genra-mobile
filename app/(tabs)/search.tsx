import { View, Text } from "react-native";
import { SearchBar } from "../../components/SearchBar";

export default function SearchScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-12">
      <Text className="text-slate-900 text-2xl font-semibold">Search</Text>
      <Text className="text-slate-600 mt-2 text-sm">
        Find stories, authors, and collections.
      </Text>

      <View className="mt-6">
        <SearchBar placeholder="Search Genra" />
      </View>
    </View>
  );
}
