import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';

export function durationMinutes(hours: string) {
  const minutes = Number(hours.replace(',', '.')) * 60;
  return [180, 360, 720, 1440].includes(minutes) ? minutes : null;
}

export function PublicationDuration({ value, onChange, disabled = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const { t } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.container}>
    <Text style={styles.label}>{t('Duración de la publicación')}</Text>
    <View style={styles.options}>
      {[3, 6, 12, 24].map(hours => <TouchableOpacity key={hours} disabled={disabled}
        accessibilityRole="button" accessibilityState={{ selected: Number(value) === hours }}
        onPress={() => onChange(String(hours))} style={[styles.option, Number(value) === hours && styles.selected]}>
        <Text style={styles.text}>{hours} h</Text>
      </TouchableOpacity>)}
    </View>
  </View>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginBottom: 20 }, label: { color: colors.secondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  options: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  option: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selected: { borderColor: colors.accent }, text: { color: colors.text, fontWeight: '600' },
});
