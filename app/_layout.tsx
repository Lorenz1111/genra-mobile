import { Stack } from "expo-router";
import "./global.css"; // or your css import

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* Auth Screens */}
            <Stack.Screen name="(auth)" />

            {/* Main App with Tabs */}
            <Stack.Screen name="(tabs)" />

            {/* Book Details (Stack on top of Tabs) */}
            <Stack.Screen
                name="book/[id]"
                options={{
                    headerShown: false, // Tayo na bahala sa back button sa loob ng file
                    presentation: 'card' // Para maganda ang animation pagbukas
                }}
            />

            {/* Reader (Stack on top of everything) */}
            <Stack.Screen
                name="book/read/[chapterId]"
                options={{
                    headerShown: false
                }}
            />
        </Stack>
    );
}