import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, Alert, ScrollView, ActivityIndicator, Switch, Linking } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  email?: string;
  username: string | null;
  bio: string | null;
  website: string | null;
  is_verified: boolean;
  coins: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/(auth)/login");

      const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (error) throw error;
      setProfile({ ...profileData, email: user.email } as Profile);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
      useCallback(() => {
        fetchProfileData();
      }, [])
  );

  const handleChangeAvatar = async () => {
    Alert.alert("Profile Picture", "Choose an option", [
      {
        text: "Take a Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return Alert.alert("Permission needed", "Camera access is required.");
          let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        }
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return Alert.alert("Permission needed", "Gallery access is required.");
          let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const uploadAvatar = async (uri: string) => {
    if (!profile?.id) return;
    setUploading(true);
    try {
      const ext = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${profile.id}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('files', { uri, name: fileName, type: `image/${ext}` } as any);

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);

      setProfile({ ...profile, avatar_url: publicUrl });
      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    const name = profile?.full_name ? encodeURIComponent(profile.full_name) : "User";
    return `https://ui-avatars.com/api/?name=${name}&background=eff6ff&color=2563eb&bold=true&size=200`;
  };

  const openWebsite = () => {
    if (profile?.website) {
      const url = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
        <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
    );
  }

  return (
      <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" showsVerticalScrollIndicator={false}>

        <View className="items-center pt-12 pb-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <Pressable onPress={handleChangeAvatar} className="relative">
            <Image source={{ uri: getAvatarUrl() }} className="w-28 h-28 rounded-full border-4 border-slate-50 dark:border-slate-800" />
            {uploading && (
                <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                  <ActivityIndicator color="#fff" />
                </View>
            )}
            <View className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 items-center justify-center shadow-sm">
              {/* SENIOR DEV FIX: Ginawang outline din ang camera icon */}
              <Ionicons name="camera-outline" size={16} color="white" />
            </View>
          </Pressable>

          <View className="flex-row items-center mt-4 gap-1">
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {profile?.full_name || "GenrA Reader"}
            </Text>
            {profile?.is_verified && (
                <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" style={{ marginLeft: 4 }} />
            )}
          </View>

          {profile?.username ? (
              <Text className="text-slate-500 dark:text-slate-400 font-medium mt-1">@{profile.username}</Text>
          ) : (
              <Text className="text-slate-400 dark:text-slate-500 italic text-sm mt-1">Add a username in Edit Profile</Text>
          )}

          <View className="mt-3 bg-blue-50 dark:bg-blue-900/30 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
            <Text className="text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">
              {profile?.role || "READER"}
            </Text>
          </View>

          {profile?.bio && (
              <Text className="text-slate-600 dark:text-slate-300 text-center mt-4 px-8 text-sm leading-5">{profile.bio}</Text>
          )}

          {profile?.website && (
              <Pressable onPress={openWebsite} className="flex-row items-center mt-3 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                <Ionicons name="link-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                <Text className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  {profile.website.replace(/^https?:\/\//, '')}
                </Text>
              </Pressable>
          )}
        </View>

        <View className="px-5 mt-6">

          {/* WALLET CARD */}
          <View className="flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/30 mb-6 shadow-sm shadow-amber-100 dark:shadow-none">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/50 items-center justify-center mr-4 border border-amber-300 dark:border-amber-700">
                <Ionicons name="sparkles-outline" size={24} color="#d97706" />
              </View>
              <View>
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">My Balance</Text>
                <Text className="text-3xl font-black text-amber-600 dark:text-amber-500">
                  {profile?.coins?.toLocaleString() || 0}
                </Text>
              </View>
            </View>
            <Pressable className="bg-amber-500 active:bg-amber-600 px-4 py-2.5 rounded-full shadow-sm">
              <Text className="text-white font-bold text-sm">Top Up</Text>
            </Pressable>
          </View>

          <Text className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mb-3 ml-2">Account Settings</Text>

          <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* SENIOR DEV FIX: Lahat ng icons ginawang -outline */}
            <MenuItem icon="heart-outline" label="Edit Interests" onPress={() => router.push("/edit-interests")} showBorder={true} />
            <MenuItem icon="person-circle-outline" label="Personal Details" onPress={() => router.push("/edit-profile")} showBorder={true} />
            <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => router.push("/change-password")} showBorder={true} />
          </View>

          <Text className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-8 mb-3 ml-2">Preferences</Text>

          <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <MenuItem
                icon="notifications-outline"
                label="Push Notifications"
                onPress={() => setPushEnabled(!pushEnabled)}
                showBorder={true}
                rightElement={
                  <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: '#334155', true: '#93c5fd' }} thumbColor={pushEnabled ? '#2563eb' : '#f8fafc'} />
                }
            />
            <MenuItem
                icon="moon-outline"
                label="Dark Mode"
                onPress={() => setDarkModeEnabled(!darkModeEnabled)}
                showBorder={false}
                rightElement={
                  <Switch value={darkModeEnabled} onValueChange={setDarkModeEnabled} trackColor={{ false: '#334155', true: '#93c5fd' }} thumbColor={darkModeEnabled ? '#2563eb' : '#f8fafc'} />
                }
            />
          </View>

          <Pressable className="flex-row items-center justify-center py-4 mt-10 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 active:bg-red-100 dark:active:bg-red-900/40" onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
            <Text className="text-lg font-bold text-red-600 dark:text-red-500">Sign Out</Text>
          </Pressable>

          <Text className="text-center text-slate-400 dark:text-slate-500 text-xs mt-8 mb-12 font-medium">GenrA App Version 1.0.0 (Beta)</Text>
        </View>
      </ScrollView>
  );
}

interface MenuItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  showBorder?: boolean;
  rightElement?: React.ReactNode;
}

const MenuItem = ({ icon, label, onPress, showBorder = true, rightElement }: MenuItemProps) => (
    <Pressable className={`flex-row items-center py-4 px-4 bg-white dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700 ${showBorder ? 'border-b border-slate-100 dark:border-slate-700' : ''}`} onPress={onPress}>
      <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-700 items-center justify-center mr-4">
        <Ionicons name={icon} size={20} color="#2563EB" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-700 dark:text-slate-200">{label}</Text>
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward-outline" size={20} color="#cbd5e1" />}
    </Pressable>
);