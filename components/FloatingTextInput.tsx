import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Animated, Pressable, TextInputProps } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

interface FloatingTextInputProps extends TextInputProps {
    label: string;
    isPassword?: boolean;
    value: string; // Required ang value para alam natin kung mag-flo-float
}

export const FloatingTextInput = ({ label, isPassword, value, ...props }: FloatingTextInputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Mag-flo-float siya kapag naka-focus OR kung may tinype na text
    const isFloating = isFocused || (value && value.length > 0);
    const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedIsFocused, {
            toValue: isFloating ? 1 : 0,
            duration: 150,
            useNativeDriver: false, // REQUIRED na false ito kapag ina-animate ang fontSize at top
        }).start();
    }, [isFloating]);

    // THE FIX: Diretsong fontSize at top ang ina-animate, walang transform scale na nakakatabingi!
    const labelStyle = {
        position: 'absolute' as const,
        left: 20, // Katumbas ng px-5
        top: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [17, 6], // 17 (Nasa gitna pag walang laman) -> 6 (Aangat pataas)
        }),
        fontSize: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12], // 16 (text-base) -> 12 (text-xs)
        }),
        color: '#94a3b8', // FIXED: Laging gray na!
        fontWeight: '400' as const,
    };

    return (
        // EXACT layout mo: h-[56px] bg-gray-50 rounded-2xl
        <View className="w-full justify-center bg-gray-50 border border-gray-200 rounded-2xl relative h-[56px]">
            <Animated.Text style={labelStyle} pointerEvents="none">
                {label}
            </Animated.Text>

            <TextInput
                {...props}
                value={value}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                secureTextEntry={isPassword && !showPassword}
                // Ginamit natin ang inline styles para sa exact padding para perfect yung pwesto ng cursor
                style={{
                    width: '100%',
                    paddingLeft: 20, // px-5
                    paddingRight: isPassword ? 56 : 20, // pr-14
                    paddingTop: 22, // Pinu-push yung text pababa para di mag-overlap sa label
                    paddingBottom: 10,
                    fontSize: 16,
                    color: '#0f172a'
                }}
            />

            {isPassword && (
                <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-0 h-full px-5 justify-center items-center"
                >
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#94a3b8" />
                </Pressable>
            )}
        </View>
    );
};