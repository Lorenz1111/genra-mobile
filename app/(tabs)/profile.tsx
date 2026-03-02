import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

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
  const [stats, setStats] = useState({ library: 0, read: 0, reviews: 0 });

  const fetchProfileData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.replace("/(auth)/login");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      setProfile({ ...profileData, email: user.email } as Profile);

      // --- SENIOR DEV FIX: DYNAMIC STATS FETCHING ---
      const [
        { count: libraryCount },
        { count: readCount },
        { count: reviewsCount },
      ] = await Promise.all([
        supabase
          .from("user_library")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("reading_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("book_ratings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setStats({
        library: libraryCount || 0,
        read: readCount || 0,
        reviews: reviewsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  }, [fetchProfileData]);

  const uploadAvatar = async (uri: string) => {
    if (!profile?.id) return;
    setUploading(true);
    try {
      if (
        profile.avatar_url &&
        !profile.avatar_url.includes("ui-avatars.com")
      ) {
        const oldFileName = profile.avatar_url.split("/").pop();
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      const ext = uri.substring(uri.lastIndexOf(".") + 1);
      const fileName = `${profile.id}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append("files", {
        uri,
        name: fileName,
        type: `image/${ext}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, formData);
      if (uploadError) {
        Alert.alert("Upload Failed", uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (profileUpdateError) {
        Alert.alert("Upload Failed", profileUpdateError.message);
        return;
      }

      setProfile({ ...profile, avatar_url: publicUrl });
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.";
      Alert.alert("Upload Failed", message);
    } finally {
      setUploading(false);
    }
  };

  const handleChangeAvatar = async () => {
    Alert.alert("Profile Picture", "Choose an option", [
      {
        text: "Take a Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted")
            return Alert.alert(
              "Permission needed",
              "Camera access is required.",
            );
          let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted")
            return Alert.alert(
              "Permission needed",
              "Gallery access is required.",
            );
          let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSaveAvatar = async () => {
    if (!profile?.avatar_url || profile.avatar_url.includes("ui-avatars.com")) {
      return Alert.alert(
        "Notice",
        "You don't have a custom profile picture to save.",
      );
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted")
        return Alert.alert(
          "Permission Required",
          "Please allow gallery access to save the image.",
        );

      const fileUri = `${FileSystem.documentDirectory}genra_avatar.jpg`;
      const downloadedFile = await FileSystem.downloadAsync(
        profile.avatar_url,
        fileUri,
      );

      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
      Alert.alert(
        "Saved!",
        "Profile picture saved to your gallery successfully.",
      );
    } catch {
      Alert.alert("Error", "Could not save the image. Please try again.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
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
          text: "Delete Forever",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Coming Soon",
              "Account deletion protocol is being set up by the server admin.",
            );
          },
        },
      ],
    );
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    const name = profile?.full_name
      ? encodeURIComponent(profile.full_name)
      : "User";
    return `https://ui-avatars.com/api/?name=${name}&background=eff6ff&color=2563eb&bold=true&size=200`;
  };

  const openWebsite = () => {
    if (profile?.website) {
      const url = profile.website.startsWith("http")
        ? profile.website
        : `https://${profile.website}`;
      Linking.openURL(url).catch(() =>
        Alert.alert("Error", "Could not open the link."),
      );
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
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <StatusBar style={darkModeEnabled ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      >
        {/* --- SENIOR DEV FIX: COMPACT HORIZONTAL HEADER --- */}
        <View className="bg-white dark:bg-slate-800 pt-14 pb-6 px-6 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
          <View className="flex-row items-center">
            {/* Avatar Column */}
            <View className="relative mr-5">
              <Pressable
                onPress={() => setIsViewingAvatar(true)}
                className="active:opacity-80"
              >
                <Image
                  source={{ uri: getAvatarUrl() }}
                  className="w-20 h-20 rounded-full border-[3px] border-slate-100 dark:border-slate-700 bg-slate-200"
                />
              </Pressable>

              {uploading && (
                <View className="absolute inset-0 bg-black/60 rounded-full items-center justify-center pointer-events-none">
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}

              <Pressable
                onPress={handleChangeAvatar}
                className="absolute bottom-0 right-0 bg-blue-600 w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 items-center justify-center shadow-sm active:bg-blue-700"
              >
                <Ionicons name="camera" size={12} color="white" />
              </Pressable>
            </View>

            {/* User Info Column */}
            <View className="flex-1 justify-center">
              <View className="flex-row items-center">
                <Text
                  className="text-xl font-black text-slate-900 dark:text-white tracking-tight"
                  numberOfLines={1}
                >
                  {profile?.full_name || "GenrA Reader"}
                </Text>
                {profile?.is_verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#0ea5e9"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>

              <Text className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-0.5">
                @{profile?.username || "reader"}
              </Text>

              <View className="flex-row items-center mt-2">
                <View className="bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800 mr-2">
                  <Text className="text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                    {profile?.role || "READER"}
                  </Text>
                </View>

                {profile?.website && (
                  <Pressable
                    onPress={openWebsite}
                    className="flex-row items-center"
                  >
                    <Ionicons
                      name="link-outline"
                      size={14}
                      color="#64748b"
                      style={{ marginRight: 2 }}
                    />
                    <Text
                      className="text-blue-600 dark:text-blue-400 text-[11px] font-bold"
                      numberOfLines={1}
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* Bio Row (Full Width) */}
          {profile?.bio && (
            <Text className="text-slate-600 dark:text-slate-300 mt-4 text-sm leading-5">
              {profile.bio}
            </Text>
          )}

          {/* Stats Row (Compact) */}
          <View className="flex-row mt-5 pt-5 border-t border-slate-100 dark:border-slate-700 justify-between px-2">
            <View className="items-center flex-1">
              <Text className="text-lg font-black text-slate-900 dark:text-white">
                {stats.library}
              </Text>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Library
              </Text>
            </View>
            <View className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700" />
            <View className="items-center flex-1">
              <Text className="text-lg font-black text-slate-900 dark:text-white">
                {stats.read}
              </Text>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Read
              </Text>
            </View>
            <View className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700" />
            <View className="items-center flex-1">
              <Text className="text-lg font-black text-slate-900 dark:text-white">
                {stats.reviews}
              </Text>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Reviews
              </Text>
            </View>
          </View>
        </View>

        {/* --- SETTINGS MENU SECTION --- */}
        <View className="px-5 mt-6 pb-12">
          {/* SENIOR DEV FIX: Sleek Horizontal Coin Banner */}
          <View className="bg-blue-600 dark:bg-blue-700 px-5 py-4 rounded-2xl mb-8 shadow-sm flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Text className="text-3xl mr-3">🪙</Text>
              <View>
                <Text className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                  GenrA Balance
                </Text>
                <Text className="text-xl font-black text-white">
                  {profile?.coins?.toLocaleString() || 0}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert("Store", "Coin top-up is coming soon!")
              }
              className="bg-white px-4 py-2 rounded-xl active:bg-slate-100 shadow-sm"
            >
              <Text className="text-blue-600 font-bold text-xs uppercase">
                Top Up
              </Text>
            </Pressable>
          </View>

          <Text className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[2px] mb-3 ml-2">
            Account Settings
          </Text>
          <View className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm mb-8">
            <MenuItem
              icon="person-outline"
              label="Edit Profile"
              onPress={() => router.push("/edit-profile")}
            />
            <MenuItem
              icon="heart-outline"
              label="Edit Interests"
              onPress={() => router.push("/edit-interests")}
            />
            <MenuItem
              icon="bookmark-outline"
              label="My Library"
              onPress={() => router.push("/(tabs)/library")}
            />
            <MenuItem
              icon="lock-closed-outline"
              label="Change Password"
              onPress={() => router.push("/change-password")}
              last
            />
          </View>

          <Text className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[2px] mb-3 ml-2">
            Preferences
          </Text>
          <View className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm mb-8">
            <MenuItem
              icon="notifications-outline"
              label="Push Notifications"
              onPress={() => setPushEnabled(!pushEnabled)}
              rightElement={
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
                  thumbColor={pushEnabled ? "#2563eb" : "#fff"}
                />
              }
            />
            <MenuItem
              icon="moon-outline"
              label="Dark Mode"
              onPress={() => setDarkModeEnabled(!darkModeEnabled)}
              last
              rightElement={
                <Switch
                  value={darkModeEnabled}
                  onValueChange={setDarkModeEnabled}
                  trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
                  thumbColor={darkModeEnabled ? "#2563eb" : "#fff"}
                />
              }
            />
          </View>

          <Text className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[2px] mb-3 ml-2">
            Danger Zone
          </Text>
          <View className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <Pressable
              className="flex-row items-center py-4 px-5 active:bg-slate-50 dark:active:bg-slate-700"
              onPress={handleLogout}
            >
              <View className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center mr-4 border border-red-100 dark:border-red-900/50">
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              </View>
              <Text className="text-base font-bold text-slate-700 dark:text-slate-200 flex-1">
                Sign Out
              </Text>
            </Pressable>

            <View className="h-[1px] bg-slate-100 dark:bg-slate-700 w-full" />

            <Pressable
              className="flex-row items-center py-4 px-5 active:bg-red-50 dark:active:bg-red-900/20"
              onPress={handleDeleteAccount}
            >
              <View className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center mr-4 border border-red-100 dark:border-red-900/50">
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </View>
              <Text className="text-base font-bold text-red-600 flex-1">
                Delete Account
              </Text>
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
            <Pressable
              onPress={() => setIsViewingAvatar(false)}
              className="p-2 bg-black/50 rounded-full active:bg-black/80"
            >
              <Ionicons name="close" size={28} color="white" />
            </Pressable>

            <Pressable
              onPress={handleSaveAvatar}
              className="p-2 bg-black/50 rounded-full active:bg-black/80"
            >
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
    </View>
  );
}

interface MenuItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  last?: boolean;
  rightElement?: React.ReactNode;
}

const MenuItem = ({
  icon,
  label,
  onPress,
  last = false,
  rightElement,
}: MenuItemProps) => (
  <Pressable
    className={`flex-row items-center py-4 px-5 bg-white dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700 ${!last ? "border-b border-slate-100 dark:border-slate-700" : ""}`}
    onPress={onPress}
  >
    <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 items-center justify-center mr-4 border border-slate-100 dark:border-slate-700">
      <Ionicons name={icon} size={20} color="#64748b" />
    </View>
    <View className="flex-1">
      <Text className="text-base font-bold text-slate-700 dark:text-slate-200">
        {label}
      </Text>
    </View>
    {rightElement ? (
      rightElement
    ) : (
      <Ionicons name="chevron-forward-outline" size={20} color="#cbd5e1" />
    )}
  </Pressable>
);
