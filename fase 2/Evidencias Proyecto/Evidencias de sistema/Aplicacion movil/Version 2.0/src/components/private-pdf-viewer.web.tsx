import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/constants/api';
import { useAppPreferences } from '@/context/app-preferences';

export function PrivatePdfViewer({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const { t, colors } = useAppPreferences(); const [url, setUrl] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = '';
    async function load() {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) throw new Error();
        const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
      } catch { if (!controller.signal.aborted) setError(t('No se pudo cargar el documento privado.')); }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, t]);
  return <Modal onRequestClose={onClose}><View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
    <TouchableOpacity onPress={onClose} style={{ minHeight: 48 }}><Text style={{ color: colors.text }}>← {t('Volver')} · {t(title)}</Text></TouchableOpacity>
    {error ? <Text style={{ color: colors.text }}>{error}</Text> : url ? <iframe title={t(title)} src={url} style={{ flex: 1, width: '100%', border: 0 }} /> : <ActivityIndicator color={colors.accent} />}
  </View></Modal>;
}
