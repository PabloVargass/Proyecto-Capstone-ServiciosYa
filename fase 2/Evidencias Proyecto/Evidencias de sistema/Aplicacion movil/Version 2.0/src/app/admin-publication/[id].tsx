import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';

type Publication = {
  titulo: string; descripcion: string; categoria: string; comuna: string;
  presupuesto: number; tipo: string; estado: string; oculto: boolean;
  creadoEn: string; venceEn?: string | null; fechaTrabajo?: string | null;
  propietario: { nombre: string };
};

export default function AdminPublicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPublication(null);
    async function load() {
      try {
        if (!id) throw new Error(t('No se pudo cargar el trabajo.'));
        const data = await authenticatedApi<Publication>(`/admin/jobs/${encodeURIComponent(id)}`, 'GET', undefined, controller.signal);
        if (!controller.signal.aborted) setPublication(data);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : t('Error de conexión'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, revision, t]));

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.text}>← {t('Volver')}</Text></TouchableOpacity>
      <Text style={styles.title}>{t('Ver detalles')}</Text>
      {loading ? <ActivityIndicator color={colors.accent} /> : error ? <>
        <Text style={styles.text}>{error}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setRevision(value => value + 1)}><Text style={styles.text}>{t('Reintentar')}</Text></TouchableOpacity>
      </> : publication && <>
        <Text style={styles.title}>{publication.titulo}</Text>
        <Text style={styles.text}>{publication.propietario.nombre}</Text>
        <Text style={styles.help}>{t(publication.tipo === 'SERVICIO' ? 'Ofrecer servicio' : 'Solicitar servicio')} · {t(publication.estado)} · {t(publication.oculto ? 'Retirada del listado' : 'Visible')}</Text>
        <Text style={styles.text}>{publication.descripcion}</Text>
        <Text style={styles.text}>{t('Categoría')}: {publication.categoria}</Text>
        <Text style={styles.text}>{t('Comuna')}: {publication.comuna}</Text>
        <Text style={styles.text}>{t(publication.tipo === 'SERVICIO' ? 'Precio' : 'Presupuesto')}: {publication.presupuesto.toLocaleString(locale, { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</Text>
        <Text style={styles.help}>{t('Fecha de publicación')}: {new Date(publication.creadoEn).toLocaleString(locale)}</Text>
        {publication.venceEn && <Text style={styles.help}>{t('Vencimiento')}: {new Date(publication.venceEn).toLocaleString(locale)}</Text>}
        {publication.fechaTrabajo && <Text style={styles.help}>{t('Fecha del trabajo')}: {new Date(publication.fechaTrabajo).toLocaleString(locale)}</Text>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40, gap: 16 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  text: { color: colors.text, lineHeight: 23 },
  help: { color: colors.muted, lineHeight: 21 },
  button: { minHeight: 48, justifyContent: 'center' },
});
