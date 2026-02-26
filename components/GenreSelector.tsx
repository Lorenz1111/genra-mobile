import { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";

interface Genre {
    id: string;
    name: string;
}

interface GenreSelectorProps {
    initialSelected?: string[];
    onSelectionChange: (selectedIds: string[]) => void;
}

export default function GenreSelector({ initialSelected = [], onSelectionChange }: GenreSelectorProps) {
    const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
    const [selected, setSelected] = useState<string[]>(initialSelected);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (initialSelected.length > 0) {
            setSelected(initialSelected);
        }
    }, [initialSelected]);

    useEffect(() => {
        const fetchGenres = async () => {
            const { data, error } = await supabase
                .from('genres')
                .select('id, name')
                .order('name', { ascending: true });

            if (!error && data) {
                setAvailableGenres(data);
            }
            setLoading(false);
        };
        fetchGenres();
    }, []);

    const togglePreference = (genreId: string) => {
        let newSelected;
        if (selected.includes(genreId)) {
            newSelected = selected.filter(id => id !== genreId);
        } else {
            if (selected.length >= 5) return; // Hanggang 5 lang
            newSelected = [...selected, genreId];
        }

        setSelected(newSelected);
        onSelectionChange(newSelected);
    };

    if (loading) {
        return <ActivityIndicator color="#2563EB" />;
    }

    return (
        <View>
            <Text className="font-bold text-slate-400 mb-4 uppercase text-xs tracking-wider">
                Selected: {selected.length} / 5
            </Text>

            <View className="flex-row flex-wrap gap-3">
                {availableGenres.map((genre) => {
                    const isSelected = selected.includes(genre.id);
                    const isMaxReached = selected.length >= 5;
                    const isDisabled = isMaxReached && !isSelected;

                    // SENIOR DEV FIX: Malinis na variable assignment para sa Tailwind classes
                    let bgClass = "bg-white border-gray-200";
                    let textClass = "text-slate-600";

                    if (isSelected) {
                        bgClass = "bg-blue-50 border-primary";
                        textClass = "text-primary";
                    } else if (isDisabled) {
                        bgClass = "bg-gray-100 border-gray-100 opacity-50"; // Gray kapag disabled na
                        textClass = "text-slate-400";
                    }

                    return (
                        <Pressable
                            key={genre.id}
                            onPress={() => togglePreference(genre.id)}
                            disabled={isDisabled}
                            className={`px-5 py-3 rounded-full border-2 transition-all active:opacity-70 ${bgClass}`}
                        >
                            <Text className={`font-bold ${textClass}`}>
                                {genre.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}