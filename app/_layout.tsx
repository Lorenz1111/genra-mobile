import { Stack } from "expo-router";
import "./global.css";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTintColor: "#0f172a",
        headerShadowVisible: false,
      }}
    />
  );
}
