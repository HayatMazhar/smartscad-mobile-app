import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  /** Called after internal clear (value cleared). */
  onClear?: () => void;
  leading?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  fontFamily?: string;
  testID?: string;
  inputTestID?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder = 'Search…',
  onClear,
  leading,
  containerStyle,
  inputStyle,
  fontFamily,
  testID,
  inputTestID,
}) => {
  const { colors } = useTheme();
  const clear = () => {
    onChangeText('');
    onClear?.();
  };
  return (
    <View
      style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border }, containerStyle]}
      testID={testID}
    >
      {leading ?? <Text style={[styles.leadEmoji, { color: colors.textMuted }]}>🔍</Text>}
      <TextInput
        style={[
          styles.input,
          { color: colors.text },
          fontFamily ? { fontFamily } : {},
          inputStyle,
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {},
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
        autoCorrect={false}
        testID={inputTestID}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={clear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.clear, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 38,
  },
  leadEmoji: { fontSize: 14, marginRight: 6 },
  input: { flex: 1, fontSize: 14, padding: 0, paddingVertical: Platform.OS === 'ios' ? 8 : 6 },
  clear: { fontSize: 14, paddingHorizontal: 4 },
});

export default SearchBar;
