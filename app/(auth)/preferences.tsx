import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const GENRES = [
  "Romance",
  "Fantasy",
  "Sci-Fi",
  "Mystery",
  "Thriller",
  "Horror",
  "Non-Fiction",
  "History",
  "Biography",
  "Poetry",
  "Self-Help",
  "Comics",
  "Manga",
];

export default function PreferencesScreen() {
  const router = useRouter();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(item => item !== genre) : [...prev, genre]
    );
  };

  const savePreferences = async () => {
    if (saving) return;
    if (selectedGenres.length < 3) {
      Alert.alert("Select more", "Please choose at least 3 genres to continue.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        Alert.alert("Session missing", "Please sign in again.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ interests: selectedGenres })
        .eq("id", data.user.id);

      if (updateError) {
        Alert.alert("Update failed", updateError.message);
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Update failed", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <View className="gap-2">
        <Text className="text-slate-900 text-3xl font-semibold">
          What do you like to read?
        </Text>
        <Text className="text-slate-600 text-base">
          Select at least 3 genres to help us personalize your feed.
        </Text>
      </View>

      <ScrollView
        className="mt-8"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap gap-3">
          {GENRES.map(genre => {
            const selected = selectedGenres.includes(genre);
            return (
              <Pressable
                key={genre}
                onPress={() => toggleGenre(genre)}
                className={`rounded-full px-4 py-2 ${
                  selected ? "bg-primary" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selected ? "text-white" : "text-slate-800"
                  }`}
                >
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-10 pt-3">
        <Pressable
          className={`rounded-xl px-5 py-4 ${
            selectedGenres.length >= 3 && !saving
              ? "bg-primary"
              : "bg-slate-300"
          }`}
          onPress={savePreferences}
          disabled={selectedGenres.length < 3 || saving}
        >
          <Text className="text-white text-center font-semibold">
            {saving ? "Saving..." : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
