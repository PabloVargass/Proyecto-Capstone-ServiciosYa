import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '@/constants/api';
import { useAppPreferences } from '@/context/app-preferences';

export function PrivatePdfViewer({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const { t, colors } = useAppPreferences();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('');
  useEffect(() => {
    let active = true;
    const directory = `${FileSystem.cacheDirectory}identity-review-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    async function load() {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) throw new Error(t('Debes iniciar sesión nuevamente.'));
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        const file = await FileSystem.downloadAsync(`${API_URL}${path}`, `${directory}certificado.pdf`, { headers: { Authorization: `Bearer ${token}` } });
        if (file.status !== 200) throw new Error(t('No se pudo cargar el documento privado.'));
        if (active) setUri(file.uri);
      } catch {
        if (active) { setError(t('No se pudo cargar el documento privado.')); setLoading(false); }
      } finally {
        if (!active) await FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => {});
      }
    }
    void load();
    return () => { active = false; void FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => {}); };
  }, [path, t]);
  return <Modal animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={styles.header}><TouchableOpacity onPress={onClose} style={styles.back}><Text style={{ color: colors.text }}>← {t('Volver')}</Text></TouchableOpacity><Text style={{ color: colors.text }}>{t(title)}</Text></View>
    {page !== '' && <Text style={{ color: colors.muted, textAlign: 'center' }}>{page}</Text>}
    {loading && <ActivityIndicator color={colors.accent} />}
    {error !== '' && <Text style={{ color: colors.text, padding: 20 }}>{error}</Text>}
    {uri && !error && <Pdf source={{ uri, cache: false }} style={{ flex: 1, backgroundColor: colors.background }} trustAllCerts={false} onPressLink={() => {}} onLoadComplete={count => { setPage(`1 / ${count}`); setLoading(false); }} onPageChanged={(current, count) => setPage(`${current} / ${count}`)} onError={() => { setLoading(false); setError(t('No se pudo cargar el documento privado.')); }} />}
  </SafeAreaView></Modal>;
}
const styles = StyleSheet.create({ header: { paddingHorizontal: 18, gap: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { minHeight: 48, justifyContent: 'center' } });
