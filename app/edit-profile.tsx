import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function EditProfileScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form States
    const [form, setForm] = useState({
        full_name: "",
        username: "",
        bio: "",
        website: ""
    });

    // Initial States para sa Dirty Checking
    const [initialForm, setInitialForm] = useState({
        full_name: "",
        username: "",
        bio: "",
        website: ""
    });

    // Username Checking States ('idle' | 'checking' | 'available' | 'taken' | 'invalid')
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.back();
                return;
            }

            setUserId(user.id);

            const { data, error: profileError } = await supabase
                .from("profiles")
                .select("full_name, username, bio, website")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("Failed to load profile:", profileError);
                setLoading(false);
                return;
            }

            if (data) {
                const fetchedData = {
                    full_name: data.full_name || "",
                    username: data.username || "",
                    bio: data.bio || "",
                    website: data.website || ""
                };
                setForm(fetchedData);
                setInitialForm(fetchedData);
            }
            setLoading(false);
        };

        fetchProfile();
    }, [router]);

    // SENIOR DEV FIX: Live Username Availability Check (Debounced)
    useEffect(() => {
        if (!userId || form.username === initialForm.username) {
            setUsernameStatus('idle');
            return;
        }

        const cleanUsername = form.username.trim().toLowerCase();

        if (cleanUsername.length > 0 && cleanUsername.length < 3) {
            setUsernameStatus('invalid');
            return;
        }

        if (cleanUsername.length === 0) {
            setUsernameStatus('idle');
            return;
        }

        setUsernameStatus('checking');

        // Maghihintay ng 500ms bago mag-check sa DB (para hindi ma-spam ang API habang nagtatype)
        const timeoutId = setTimeout(async () => {
            const { data, error: usernameCheckError } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", cleanUsername)
                .neq("id", userId) // Wag isama yung sariling ID natin
                .maybeSingle(); // maybeSingle para hindi mag-throw ng error kung walang mahanap

            if (usernameCheckError) {
                console.error("Username check failed:", usernameCheckError);
                setUsernameStatus('idle');
                return;
            }

            if (data) {
                setUsernameStatus('taken');
            } else {
                setUsernameStatus('available');
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [form.username, userId, initialForm.username]);

    const handleSave = async () => {
        if (!userId || !canSave) return;
        setSaving(true);

        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: form.full_name.trim(),
                username: form.username.trim().toLowerCase(),
                bio: form.bio.trim(),
                website: form.website.trim()
            })
            .eq("id", userId);

        if (error) {
            Alert.alert("Error", "Could not update profile. Make sure your username is unique.");
            console.error(error);
        } else {
            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        }
        setSaving(false);
    };

    // SENIOR DEV FIX: Dirty State Checking
    const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
    const isUsernameValid = usernameStatus === 'idle' || usernameStatus === 'available';
    const canSave = hasChanges && !saving && isUsernameValid && form.full_name.trim().length > 0;

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#2563EB" size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* --- HEADER --- */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 z-10 bg-white shadow-sm">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-50">
                    <Ionicons name="close" size={28} color="#334155" />
                </Pressable>

                <Text className="text-lg font-black text-slate-900">Edit Profile</Text>

                <Pressable onPress={handleSave} disabled={!canSave} className="p-2 -mr-2 active:opacity-50">
                    {saving ? (
                        <ActivityIndicator color="#2563EB" size="small" />
                    ) : (
                        <Text
                            className="font-bold text-base"
                            style={{ color: canSave ? '#2563EB' : '#94a3b8' }} // Blue kapag pwede i-save, Gray-Blue kapag disabled
                        >
                            Save
                        </Text>
                    )}
                </Pressable>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

                {/* --- FULL NAME FIELD --- */}
                <View className="mb-6">
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Full Name</Text>
                    <TextInput
                        className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 text-base font-medium"
                        placeholder="Juan Dela Cruz"
                        placeholderTextColor="#94a3b8"
                        value={form.full_name}
                        onChangeText={(text) => setForm({ ...form, full_name: text })}
                    />
                    <Text className="text-[11px] text-slate-400 mt-1.5 font-medium ml-1">
                        This name will appear on your comments and reviews.
                    </Text>
                </View>

                {/* --- USERNAME FIELD (With Live Status) --- */}
                <View className="mb-6">
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Username</Text>
                    <View className="relative justify-center">
                        <TextInput
                            className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 text-base font-medium pl-9"
                            placeholder="juandelacruz"
                            placeholderTextColor="#94a3b8"
                            autoCapitalize="none"
                            value={form.username}
                            onChangeText={(text) => setForm({ ...form, username: text.replace(/\s/g, '') })} // Bawal space sa username
                        />
                        <Text className="absolute left-4 text-slate-400 text-base font-medium">@</Text>

                        {/* Live Feedback Icon */}
                        <View className="absolute right-4">
                            {usernameStatus === 'checking' && <ActivityIndicator size="small" color="#64748b" />}
                            {usernameStatus === 'available' && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                            {usernameStatus === 'taken' && <Ionicons name="close-circle" size={20} color="#ef4444" />}
                        </View>
                    </View>

                    {/* Live Feedback Message */}
                    {usernameStatus === 'taken' && (
                        <Text className="text-[11px] text-red-500 mt-1.5 font-bold ml-1">Username is already taken.</Text>
                    )}
                    {usernameStatus === 'invalid' && (
                        <Text className="text-[11px] text-red-500 mt-1.5 font-bold ml-1">Must be at least 3 characters long.</Text>
                    )}
                    {usernameStatus === 'available' && (
                        <Text className="text-[11px] text-emerald-500 mt-1.5 font-bold ml-1">Username is available!</Text>
                    )}
                </View>

                {/* --- WEBSITE FIELD --- */}
                <View className="mb-6">
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Website / Links</Text>
                    <TextInput
                        className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 text-base font-medium"
                        placeholder="https://yourportfolio.com"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        keyboardType="url"
                        value={form.website}
                        onChangeText={(text) => setForm({ ...form, website: text })}
                    />
                </View>

                {/* --- BIO FIELD --- */}
                <View className="mb-12">
                    <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">About Me (Bio)</Text>
                    <TextInput
                        className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 text-base font-medium h-32"
                        placeholder="I love reading fantasy and sci-fi books..."
                        placeholderTextColor="#94a3b8"
                        value={form.bio}
                        onChangeText={(text) => setForm({ ...form, bio: text })}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
