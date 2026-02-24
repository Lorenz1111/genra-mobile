import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import GenreSelector from "@/components/GenreSelector"; // I-import ang ginawa natin!

export default function PreferencesScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      const userPrefsData = preferences.map((genreId) => ({
        profile_id: user.id,
        genre_id: genreId,
      }));

      const { error: prefsError } = await supabase
          .from("user_preferred_genres")
          .insert(userPrefsData);

      if (prefsError) throw prefsError;
      router.replace("/(tabs)/home");

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => router.replace("/(tabs)/home");
  const isButtonDisabled = loading || preferences.length === 0;

  return (
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
        <Pressable onPress={handleSkip} className="absolute top-16 right-6 p-2 z-10">
          <Text className="text-primary font-bold text-base">Skip</Text>
        </Pressable>

        <View className="px-8 gap-8 pt-32 pb-10 flex-1">
          <View className="mb-2">
            <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">Pick your favorites</Text>
            <Text className="text-slate-500 text-base mt-2">Select up to 5 genres to personalize your GenrA reading experience.</Text>
          </View>

          {/* SENIOR DEV MAGIC: Tinawag lang natin ang component dito! */}
          <GenreSelector onSelectionChange={setPreferences} />

          <View className="mt-auto pt-8">
            <Pressable
                className={`flex-row items-center justify-center rounded-full px-5 py-4 ${isButtonDisabled ? "bg-blue-300 opacity-60" : "bg-primary active:bg-blue-700"}`}
                onPress={handleFinalSubmit}
                disabled={isButtonDisabled}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Let's Read!</Text>}
            </Pressable>
          </View>
        </View>
      </ScrollView>
  );
}