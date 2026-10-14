import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/constants/api';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { PrivatePdfViewer } from './private-pdf-viewer';

export function PrivateDocumentViewer(props: { path: string; title: string; type?: string; onClose: () => void }) {
  return props.type === 'application/pdf' ? <PrivatePdfViewer {...props} /> : <PrivateImageViewer {...props} />;
}

function PrivateImageViewer({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const { t, colors } = useAppPreferences(); const styles = useThemedStyles(createStyles); const { width, height } = useWindowDimensions();
  const [token, setToken] = useState<string | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [zoom, setZoom] = useState(1);
  useEffect(() => { let active = true; SecureStore.getItemAsync('accessToken').then(value => { if (active) { setToken(value); if (!value) { setError(t('Debes iniciar sesión nuevamente.')); setLoading(false); } } }).catch(() => { if (active) { setError(t('Ocurrió un error.')); setLoading(false); } }); return () => { active = false; }; }, [t]);
  return <Modal animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.screen}>
    <View style={styles.header}><TouchableOpacity onPress={onClose} style={styles.button}><Text style={styles.text}>← {t('Volver')}</Text></TouchableOpacity><Text style={styles.text}>{t(title)}</Text></View>
    <View style={styles.header}><TouchableOpacity style={styles.button} onPress={() => setZoom(value => Math.max(1, value - 0.5))}><Text style={styles.text}>−</Text></TouchableOpacity><Text style={styles.text}>{Math.round(zoom * 100)}%</Text><TouchableOpacity style={styles.button} onPress={() => setZoom(value => Math.min(3, value + 0.5))}><Text style={styles.text}>+</Text></TouchableOpacity></View>
    {loading && <ActivityIndicator color={colors.accent} />}{error && <Text style={styles.error}>{error}</Text>}
    {token && !error && <ScrollView><ScrollView horizontal contentContainerStyle={{ alignItems: 'center' }}><Image source={{ uri: `${API_URL}${path}`, headers: { Authorization: `Bearer ${token}` } }} cachePolicy="none" style={{ width: width * zoom, height: (height - 180) * zoom }} contentFit="contain" accessibilityLabel={t(title)} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(t('No se pudo cargar el documento privado.')); }} /></ScrollView></ScrollView>}
  </SafeAreaView></Modal>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, button: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }, text: { color: colors.text, fontWeight: '600' }, error: { color: colors.text, padding: 20 } });
