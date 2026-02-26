import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, Alert, ScrollView, ActivityIndicator, Switch, Linking, RefreshControl, Modal } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
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
  const [refreshing, setRefreshing] = useState(false);

  // States for Preferences & Modal
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isViewingAvatar, setIsViewingAvatar] = useState(false);

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
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
      useCallback(() => {
        fetchProfileData();
      }, [])
  );

  // --- PULL TO REFRESH LOGIC ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  }, []);

  // --- CHANGE AVATAR LOGIC ---
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
      // 1. DELETE OLD AVATAR (Kung meron at hindi default UI-Avatar)
      if (profile.avatar_url && !profile.avatar_url.includes('ui-avatars.com')) {
        const oldFileName = profile.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('avatars').remove([oldFileName]);
        }
      }

      // 2. UPLOAD NEW AVATAR
      const ext = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${profile.id}_${Date.now()}.${ext}`; // Timestamp prevents cache issues
      const formData = new FormData();
      formData.append('files', { uri, name: fileName, type: `image/${ext}` } as any);

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData);
      if (uploadError) throw uploadError;

      // 3. UPDATE PROFILE WITH NEW URL
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

  // --- SAVE AVATAR TO GALLERY LOGIC ---
  const handleSaveAvatar = async () => {
    if (!profile?.avatar_url || profile.avatar_url.includes('ui-avatars.com')) {
      return Alert.alert("Notice", "You don't have a custom profile picture to save.");
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert("Permission Required", "Please allow gallery access to save the image.");

      const fileUri = `${FileSystem.documentDirectory}genra_avatar.jpg`;
      const downloadedFile = await FileSystem.downloadAsync(profile.avatar_url, fileUri);

      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
      Alert.alert("Saved!", "Profile picture saved to your gallery successfully.");
    } catch (error) {
      Alert.alert("Error", "Could not save the image. Please try again.");
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

  const handleDeleteAccount = () => {
    Alert.alert(
        "Delete Account",
        "Are you absolutely sure? This action is permanent and will erase all your stories, coins, and data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete Forever", style: "destructive",
            onPress: () => {
              // NOTE: Proper deletion requires a Supabase Edge Function to bypass foreign key constraints
              Alert.alert("Coming Soon", "Account deletion protocol is being set up by the server admin.");
            },
          },
        ]
    );
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    const name = profile?.full_name ? encodeURIComponent(profile.full_name) : "User";
    return `https://ui-avatars.com/api/?name=${name}&background=eff6ff&color=2563eb&bold=true&size=200`;
  };

  const openWebsite = () => {
    if (profile?.website) {
      const url = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
      Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open the link."));
    }
  };

  if (loading) {
    return (
        <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
          <View className="w-16 h-16 bg-blue-100 rounded-2xl items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
          <Text className="text-slate-500 font-bold">Loading Profile...</Text>
        </View>
    );
  }

  return (
      <>
        <ScrollView
            className="flex-1 bg-slate-50 dark:bg-slate-900"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        >

          {/* --- HEADER SECTION --- */}
          <View className="items-center pt-16 pb-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">

            <View className="relative">
              {/* SENIOR DEV FIX: Click Image -> View Modal | Click Icon -> Change Photo */}
              <Pressable onPress={() => setIsViewingAvatar(true)} className="active:opacity-80">
                <Image source={{ uri: getAvatarUrl() }} className="w-28 h-28 rounded-full border-4 border-slate-50 dark:border-slate-800 bg-slate-200" />
              </Pressable>

              {uploading && (
                  <View className="absolute inset-0 bg-black/60 rounded-full items-center justify-center pointer-events-none">
                    <ActivityIndicator color="#fff" />
                  </View>
              )}

              <Pressable
                  onPress={handleChangeAvatar}
                  className="absolute bottom-0 right-0 bg-blue-600 w-9 h-9 rounded-full border-[3px] border-white dark:border-slate-800 items-center justify-center shadow-md active:bg-blue-700"
              >
                <Ionicons name="camera-outline" size={16} color="white" />
              </Pressable>
            </View>

            <View className="flex-row items-center mt-4 px-4">
              <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center" numberOfLines={1}>
                {profile?.full_name || "GenrA Reader"}
              </Text>
              {profile?.is_verified && (
                  <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" style={{ marginLeft: 6 }} />
              )}
            </View>

            {profile?.username ? (
                <Text className="text-slate-500 dark:text-slate-400 font-medium mt-0.5">@{profile.username}</Text>
            ) : (
                <Text className="text-slate-400 dark:text-slate-500 italic text-xs mt-1">Add a username in Edit Profile</Text>
            )}

            <View className="mt-3 bg-blue-50 dark:bg-blue-900/30 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
              <Text className="text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">
                {profile?.role || "READER"}
              </Text>
            </View>

            {profile?.bio && (
                <Text className="text-slate-600 dark:text-slate-300 text-center mt-4 px-8 text-sm leading-5">
                  {profile.bio}
                </Text>
            )}

            {profile?.website && (
                <Pressable onPress={openWebsite} className="flex-row items-center mt-4 bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 active:bg-slate-100">
                  <Ionicons name="link-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                  <Text className="text-blue-600 dark:text-blue-400 text-sm font-bold">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </Text>
                </Pressable>
            )}
          </View>

          {/* --- BODY/SETTINGS SECTION --- */}
          <View className="px-5 mt-6 pb-12">

            <View className="flex-row items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 rounded-[24px] border border-amber-200 dark:border-amber-900/30 mb-8 shadow-sm">
              <View className="flex-row items-center flex-1">
                <View className="w-14 h-14 rounded-full bg-white dark:bg-amber-800/50 items-center justify-center mr-4 border border-amber-100 dark:border-amber-700 shadow-sm">
                  <Text className="text-2xl">🪙</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-0.5">My GenrA Coins</Text>
                  <Text className="text-3xl font-black text-amber-600 dark:text-amber-500" numberOfLines={1}>
                    {profile?.coins?.toLocaleString() || 0}
                  </Text>
                </View>
              </View>
              <Pressable
                  onPress={() => Alert.alert("Coming Soon", "The Coin Top-up store is currently under construction!")}
                  className="bg-amber-500 active:bg-amber-600 px-5 py-3 rounded-full shadow-sm ml-2"
              >
                <Text className="text-white font-black text-sm tracking-wide">Get Coins</Text>
              </Pressable>
            </View>

            <Text className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mb-3 ml-2">Account Settings</Text>

            <View className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
              <MenuItem icon="heart-outline" label="Edit Interests" onPress={() => router.push("/edit-interests")} showBorder={true} />
              <MenuItem icon="person-outline" label="Edit Profile" onPress={() => router.push("/edit-profile")} showBorder={true} />
              <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => router.push("/change-password")} showBorder={false} />
            </View>

            <Text className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-8 mb-3 ml-2">Preferences</Text>

            <View className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
              <MenuItem
                  icon="notifications-outline"
                  label="Push Notifications"
                  onPress={() => setPushEnabled(!pushEnabled)}
                  showBorder={true}
                  rightElement={
                    <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: '#e2e8f0', true: '#93c5fd' }} thumbColor={pushEnabled ? '#2563eb' : '#fff'} />
                  }
              />
              <MenuItem
                  icon="moon-outline"
                  label="Dark Mode"
                  onPress={() => setDarkModeEnabled(!darkModeEnabled)}
                  showBorder={false}
                  rightElement={
                    <Switch value={darkModeEnabled} onValueChange={setDarkModeEnabled} trackColor={{ false: '#e2e8f0', true: '#93c5fd' }} thumbColor={darkModeEnabled ? '#2563eb' : '#fff'} />
                  }
              />
            </View>

            <Text className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-8 mb-3 ml-2">Danger Zone</Text>

            <View className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
              <Pressable className="flex-row items-center py-4 px-5 active:bg-slate-50" onPress={handleLogout}>
                <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4 border border-red-100">
                  <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                </View>
                <Text className="text-base font-bold text-slate-700 flex-1">Sign Out</Text>
              </Pressable>

              <View className="h-[1px] bg-slate-100 w-full" />

              {/* SENIOR DEV FIX: Delete Account Option */}
              <Pressable className="flex-row items-center py-4 px-5 active:bg-red-50" onPress={handleDeleteAccount}>
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-4 border border-red-100">
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </View>
                <Text className="text-base font-bold text-red-600 flex-1">Delete Account</Text>
              </Pressable>
            </View>

            <Text className="text-center text-slate-400 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-8 mb-4">
              GenrA App Version 1.0.0 (Beta)
            </Text>

          </View>
        </ScrollView>

        {/* --- AVATAR VIEWER MODAL --- */}
        <Modal visible={isViewingAvatar} transparent={true} animationType="fade">
          <View className="flex-1 bg-black/95 justify-center items-center">

            {/* Toolbar */}
            <View className="absolute top-14 w-full flex-row justify-between px-6 z-20">
              <Pressable onPress={() => setIsViewingAvatar(false)} className="p-2 bg-black/50 rounded-full active:bg-black/80">
                <Ionicons name="close" size={28} color="white" />
              </Pressable>

              <Pressable onPress={handleSaveAvatar} className="p-2 bg-black/50 rounded-full active:bg-black/80">
                <Ionicons name="download-outline" size={28} color="white" />
              </Pressable>
            </View>

            {/* Image Viewer */}
            <Image
                source={{ uri: getAvatarUrl() }}
                className="w-full h-full"
                resizeMode="contain"
            />
          </View>
        </Modal>
      </>
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
    <Pressable
        className={`flex-row items-center py-4 px-5 bg-white dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700 ${showBorder ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}
        onPress={onPress}
    >
      <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 items-center justify-center mr-4 border border-slate-100 dark:border-slate-700">
        <Ionicons name={icon} size={20} color="#64748b" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-700 dark:text-slate-200">{label}</Text>
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward-outline" size={20} color="#cbd5e1" />}
    </Pressable>
);