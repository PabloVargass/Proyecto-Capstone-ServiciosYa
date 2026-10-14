import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { API_URL } from '@/constants/api';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { PublicationTimestamp } from '@/components/publication-timestamp';

type Service = { id: string; title: string; description: string; category: string; commune: string; budget: number; createdAt: string; expiresAt: string; owner: { name: string } };

export default function ServicesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale, colors } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/jobs?kind=SERVICIO&ownerId=${encodeURIComponent(id)}`);
      const data = await response.json();
      if (!response.ok) throw Error('No se pudieron cargar los servicios.');
      setServices(data);
    } catch { Alert.alert(t('Error'), t('No se pudieron cargar los servicios.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id, t]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('Volver')}><Text style={styles.back}>←</Text></TouchableOpacity>
      <Text style={styles.title}>{t('Servicios ofrecidos')}</Text>
      {services[0] && <Text style={styles.subtitle}>{services[0].owner.name}</Text>}
      {loading ? <ActivityIndicator color={colors.accent} /> : services.length === 0 ? <Text style={styles.subtitle}>{t('No hay servicios disponibles de esta persona.')}</Text> : services.map(service => <View key={service.id} style={styles.card}>
        <Text style={styles.category}>{service.category}</Text>
        <Text style={styles.name}>{service.title}</Text>
        <Text style={styles.subtitle} numberOfLines={3}>{service.description}</Text>
        <Text style={styles.subtitle}>📍 {service.commune}</Text>
        <PublicationTimestamp createdAt={service.createdAt} expiresAt={service.expiresAt} style={styles.date} />
        <Text style={styles.price}>${service.budget.toLocaleString(locale)}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push({ pathname: '/job/[id]', params: { id: service.id } })}>
          <Text style={styles.buttonText}>{t('Ver detalle')}</Text>
        </TouchableOpacity>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 14, paddingBottom: 40 },
  back: { color: colors.text, fontSize: 26 }, title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 }, date: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  category: { color: colors.accent, fontSize: 12 }, name: { color: colors.text, fontSize: 20, fontWeight: '700' },
  price: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  button: { backgroundColor: colors.primary, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.onPrimary, fontWeight: '700' },
});
