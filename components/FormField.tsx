import { Text, TextInput, View, TextInputProps } from "react-native";

type FormFieldProps = TextInputProps & {
  label: string;
};

export function FormField({ label, ...inputProps }: FormFieldProps) {
  return (
    <View className="space-y-2">
      <Text className="text-slate-900 text-sm">{label}</Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-slate-900"
        {...inputProps}
      />
    </View>
  );
}
