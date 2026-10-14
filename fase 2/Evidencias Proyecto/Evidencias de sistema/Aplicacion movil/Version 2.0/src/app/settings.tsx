import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors, ThemeMode } from '@/constants/app-theme';
import type { Language } from '@/constants/translations';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, language, theme, t, setLanguage, setTheme } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [saving, setSaving] = useState(false);

  async function save(change: () => Promise<void>) {
    setSaving(true);
    try { await change(); }
    catch { Alert.alert(t('Error'), t('No se pudieron guardar los ajustes. Inténtalo nuevamente.')); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Volver')}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Ajustes')}</Text>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.subtitle}>{t('Personaliza tu experiencia')}</Text>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.icon}><Ionicons name="language-outline" size={24} color={colors.accent} /></View>
            <Text style={styles.sectionTitle}>{t('Idioma')}</Text>
          </View>
          <Text style={styles.description}>{t('Elige el idioma de la aplicación.')}</Text>
          <View accessibilityRole="radiogroup">
            {([{ value: 'es', label: 'Español', native: 'Español' }, { value: 'en', label: 'Inglés', native: 'English' }] satisfies { value: Language; label: string; native: string }[]).map(option => (
              <TouchableOpacity key={option.value} testID={`language-${option.value}`} style={[styles.option, language === option.value && styles.selectedOption]} disabled={saving}
                accessibilityRole="radio" accessibilityState={{ selected: language === option.value, disabled: saving }} accessibilityLabel={option.native}
                onPress={() => { void save(() => setLanguage(option.value)); }}>
                <View><Text style={styles.optionTitle}>{option.native}</Text><Text style={styles.optionSubtitle}>{t(option.label)}</Text></View>
                <Ionicons name={language === option.value ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={language === option.value ? colors.accent : colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.icon}><Ionicons name="color-palette-outline" size={24} color={colors.accent} /></View>
            <Text style={styles.sectionTitle}>{t('Apariencia')}</Text>
          </View>
          <Text style={styles.description}>{t('Elige el fondo que te resulte más cómodo.')}</Text>
          <View accessibilityRole="radiogroup">
            {([{ value: 'light', label: 'Claro', icon: 'sunny-outline' }, { value: 'dark', label: 'Oscuro', icon: 'moon-outline' }] satisfies { value: ThemeMode; label: string; icon: 'sunny-outline' | 'moon-outline' }[]).map(option => (
              <TouchableOpacity key={option.value} testID={`theme-${option.value}`} style={[styles.option, theme === option.value && styles.selectedOption]} disabled={saving}
                accessibilityRole="radio" accessibilityState={{ selected: theme === option.value, disabled: saving }} accessibilityLabel={t(option.label)}
                onPress={() => { void save(() => setTheme(option.value)); }}>
                <View style={styles.themeLabel}><Ionicons name={option.icon} size={22} color={colors.text} /><Text style={styles.optionTitle}>{t(option.label)}</Text></View>
                <Ionicons name={theme === option.value ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={theme === option.value ? colors.accent : colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {saving && <ActivityIndicator color={colors.accent} />}
        <Text style={styles.footer}>{t('Tus preferencias se guardan automáticamente en este dispositivo.')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  spacer: { width: 44 },
  title: { color: colors.text, fontSize: 21, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 18, marginBottom: 28, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, marginVertical: 16 },
  option: { minHeight: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selectedOption: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  optionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  themeLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },
});
