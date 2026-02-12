import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function testConnection() {
  const { data, error } = await supabase.from("example_table").select("*").limit(1);

  if (error) {
    console.log("Supabase testConnection error:", error);
    return { data: null, error };
  }

  console.log("Supabase testConnection data:", data);
  return { data, error: null };
}
