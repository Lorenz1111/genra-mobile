import { useState } from "react";
import { View, Text, Pressable, Alert, Image, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from "@expo/vector-icons";

export default function SetupProfileScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams();

    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    const pickImage = async (useCamera: boolean) => {
        let result;
        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert("Permission Needed", "We need camera permissions to take a photo.");
            result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        } else {
            result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        }

        if (!result.canceled) setAvatarUri(result.assets[0].uri);
    };

    const handleContinue = () => {
        router.push({
            pathname: "/(auth)/password",
            params: { email: email, avatarUri: avatarUri }
        });
    };

    const handleSkip = () => {
        router.push({
            pathname: "/(auth)/password",
            params: { email: email, avatarUri: null }
        });
    };

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>

            {/* ABSOLUTE HEADER FOR CONSISTENCY */}
            <Pressable onPress={() => router.back()} className="absolute top-16 left-6 p-2 z-10">
                <Ionicons name="arrow-back" size={24} color="#334155" />
            </Pressable>

            <Pressable onPress={handleSkip} className="absolute top-16 right-6 p-2 z-10">
                <Text className="text-primary font-bold text-base">Skip</Text>
            </Pressable>

            {/* Consistent Spacing: pt-32 pb-10 */}
            <View className="px-8 gap-8 pt-32 pb-10 flex-1 justify-between">
                <View>
                    <View className="mb-10">
                        <Text className="text-slate-900 text-3xl font-extrabold tracking-tight">Add a profile photo</Text>
                        <Text className="text-slate-500 text-base mt-2 leading-6">
                            Show your personality to the GenrA community.
                        </Text>
                    </View>

                    <View className="items-center mb-10">
                        <View className="w-40 h-40 rounded-full bg-blue-50 border-4 border-blue-100 items-center justify-center overflow-hidden">
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                                <Ionicons name="person" size={60} color="#93c5fd" />
                            )}
                        </View>
                    </View>

                    <View className="gap-4">
                        <Pressable className="flex-row items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl py-4 active:bg-gray-100" onPress={() => pickImage(false)}>
                            <Ionicons name="image-outline" size={20} color="#334155" className="mr-2" />
                            <Text className="text-slate-800 font-bold text-base">Upload from Gallery</Text>
                        </Pressable>

                        <Pressable className="flex-row items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl py-4 active:bg-gray-100" onPress={() => pickImage(true)}>
                            <Ionicons name="camera-outline" size={20} color="#334155" className="mr-2" />
                            <Text className="text-slate-800 font-bold text-base">Take a Photo</Text>
                        </Pressable>
                    </View>
                </View>

                {avatarUri && (
                    <View className="mt-auto pt-8">
                        <Pressable className="flex-row items-center justify-center rounded-full bg-primary px-5 py-4 active:bg-blue-700" onPress={handleContinue}>
                            <Text className="text-white font-bold text-base">Looks Good</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}