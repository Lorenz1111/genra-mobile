import "./global.css"
import { View, Text } from 'react-native';

export default function Index() {
    return (
        // "bg-slate-900" -> Dark background
        // "flex-1 justify-center items-center" -> Gitna lahat
        <View className="flex-1 justify-center items-center bg-slate-900">

            {/* "bg-white p-6 rounded-2xl" -> Card effect na puti at bilog ang kanto */}
            <View className="bg-white p-6 rounded-2xl shadow-lg w-3/4">

                {/* "text-2xl font-bold text-blue-600" -> Malaki, bold, at asul na text */}
                <Text className="text-2xl font-bold text-blue-600 mb-2">
                    Success! 🎉
                </Text>

                <Text className="text-slate-600 text-lg">
                    Gumagana na ang NativeWind sa Genra Mobile App.
                </Text>

                <View className="mt-4 bg-blue-100 p-2 rounded">
                    <Text className="text-blue-800 text-center font-medium">
                        Tailwind Classes Applied
                    </Text>
                </View>

            </View>
        </View>
    );
}