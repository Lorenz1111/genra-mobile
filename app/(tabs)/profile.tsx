import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }

      if (error) {
        setEmail(null);
        return;
      }

      setEmail(data.user?.email ?? null);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Sign out failed", error.message);
      return;
    }

    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="flex-1 items-center justify-center">
        <Text className="text-slate-900 text-2xl font-semibold">
          {email ?? "Account"}
        </Text>
        <Text className="text-slate-600 mt-2 text-sm">
          Manage your account and preferences.
        </Text>
      </View>

      <View className="pb-8">
        <Pressable
          className="rounded-xl border border-red-200 px-5 py-4"
          onPress={onSignOut}
        >
          <Text className="text-red-500 text-center font-semibold">Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
