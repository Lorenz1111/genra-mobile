import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Profile } from "../../lib/types";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (error) throw error;
      setProfile(data as any);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
      useCallback(() => {
        fetchProfile();
      }, [])
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login"); // Balik sa Login screen
        },
      },
    ]);
  };

  if (loading) {
    return (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator color="#2563EB" />
        </View>
    );
  }

  return (
      <ScrollView className="flex-1 bg-white">
        {/* --- HEADER SECTION --- */}
        <View className="items-center pt-12 pb-8 bg-slate-50">
          <View className="relative">
            <Image
                source={{
                  uri: profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (profile?.full_name || "User") + "&background=2563EB&color=fff"
                }}
                className="w-28 h-28 rounded-full border-4 border-white shadow-sm"
            />
            <View className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-2 border-white" />
          </View>

          <Text className="text-2xl font-bold text-slate-900 mt-4">
            {profile?.full_name || "Reader"}
          </Text>
          <Text className="text-slate-500 text-sm">
            {profile?.email || "No email"}
          </Text>

          {/* Role Badge */}
          <View className="mt-2 bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-700 text-xs font-bold uppercase tracking-wide">
              {profile?.role || "Reader"}
            </Text>
          </View>
        </View>

        {/* --- MENU SECTION --- */}
        <View className="px-6 mt-6">
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
            Account Settings
          </Text>

          {/* 1. Edit Interests (Reusing your preferences page) */}
          <MenuItem
              icon="heart"
              label="My Interests"
              onPress={() => router.push("/auth/preferences")} // Recycle natin yung page
          />

          {/* 2. Account (Placeholder) */}
          <MenuItem
              icon="person-circle"
              label="Personal Details"
              onPress={() => alert("Edit Profile coming soon!")}
          />

          {/* 3. Notifications (Placeholder) */}
          <MenuItem
              icon="notifications"
              label="Notifications"
              onPress={() => alert("Notification settings coming soon!")}
          />

          <View className="h-px bg-gray-100 my-4" />

          <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
            Support
          </Text>

          <MenuItem
              icon="help-circle"
              label="Help Center"
              onPress={() => alert("Help Center")}
          />

          <MenuItem
              icon="shield-checkmark"
              label="Privacy Policy"
              onPress={() => alert("Privacy Policy")}
          />

          {/* --- LOGOUT BUTTON --- */}
          <Pressable
              className="flex-row items-center py-4 mt-4"
              onPress={handleLogout}
          >
            <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
              <Ionicons name="log-out" size={20} color="#dc2626" />
            </View>
            <Text className="text-lg font-medium text-red-600">Log Out</Text>
          </Pressable>

          <Text className="text-center text-gray-300 text-xs mt-8 mb-10">
            Version 1.0.0 (Beta)
          </Text>
        </View>
      </ScrollView>
  );
}

// Helper Component para malinis tignan ang Menu Items
const MenuItem = ({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) => (
    <Pressable
        className="flex-row items-center py-4 border-b border-gray-50 active:bg-gray-50"
        onPress={onPress}
    >
      <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
        <Ionicons name={icon} size={20} color="#2563EB" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-medium text-slate-700">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </Pressable>
);