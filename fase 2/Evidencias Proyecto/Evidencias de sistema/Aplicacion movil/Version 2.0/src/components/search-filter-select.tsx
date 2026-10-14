import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { normalizeSearch } from '@/services/publication-search';

export function SearchFilterSelect({ label, value, options, onChange, emptyLabel, emptyValue = '', disabled = false, allowCustom = false }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; emptyLabel: string; emptyValue?: string; disabled?: boolean; allowCustom?: boolean;
}) {
  const { t, colors } = useAppPreferences(); const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  const choose = (selected: string) => { onChange(selected); setOpen(false); setQuery(''); };
  const filtered = options.filter(option => normalizeSearch(option.label).includes(normalizeSearch(query)));
  return <View style={styles.container}>
    <Text style={styles.label}>{t(label)}</Text>
    <TouchableOpacity disabled={disabled} accessibilityRole="combobox" accessibilityLabel={t(label)} accessibilityState={{ expanded: open && !disabled, disabled }} style={[styles.input, disabled && { opacity: 0.5 }]} onPress={() => setOpen(previous => !previous)}>
      <Text style={styles.text}>{value === emptyValue ? t(emptyLabel) : options.find(option => option.value === value)?.label || value || t(emptyLabel)}</Text><Text style={styles.text}>{open && !disabled ? '▴' : '▾'}</Text>
    </TouchableOpacity>
    {open && !disabled && <View style={styles.menu}>
      <TextInput style={styles.search} value={query} onChangeText={setQuery} maxLength={150} placeholder={t(allowCustom ? 'Busca o escribe otra categoría' : 'Buscar opción')} placeholderTextColor={colors.muted} accessibilityLabel={t(`Buscar ${label.toLowerCase()}`)} />
      <ScrollView nestedScrollEnabled style={{ maxHeight: 210 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.option} onPress={() => choose(emptyValue)}><Text style={styles.text}>{t(emptyLabel)}</Text></TouchableOpacity>
        {filtered.map(option => <TouchableOpacity accessibilityState={{ selected: option.value === value }} key={option.value} style={styles.option} onPress={() => choose(option.value)}><Text style={styles.text}>{option.label}</Text></TouchableOpacity>)}
        {allowCustom && query.trim() !== '' && !options.some(option => normalizeSearch(option.value) === normalizeSearch(query)) && <TouchableOpacity style={styles.option} onPress={() => choose(query.trim())}><Text style={[styles.text, { color: colors.accent }]}>{t('Usar categoría escrita')}: {query.trim()}</Text></TouchableOpacity>}
        {filtered.length === 0 && !allowCustom && <Text style={styles.help}>{t('No hay resultados.')}</Text>}
      </ScrollView>
    </View>}
  </View>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({ container: { marginBottom: 14 }, label: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 8 }, input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, text: { color: colors.text, flexShrink: 1, fontSize: 14 }, menu: { marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' }, search: { minHeight: 48, padding: 12, color: colors.text, borderBottomWidth: 1, borderColor: colors.border }, option: { minHeight: 44, padding: 12, justifyContent: 'center' }, help: { padding: 12, color: colors.muted } });
