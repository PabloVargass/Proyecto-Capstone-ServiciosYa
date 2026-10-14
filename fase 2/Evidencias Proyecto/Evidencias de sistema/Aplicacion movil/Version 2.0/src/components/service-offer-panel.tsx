import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/constants/api';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';

export type ServiceOffer = { id: string; status: string; amount: number; providerId: string };

export function ServiceOfferPanel({ offer, userId, onRespond }: { offer: ServiceOffer; userId: string; onRespond: (status: string) => void }) {
  const { t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [responding, setResponding] = useState(false);
  async function respond(accept: boolean) {
    if (responding) return;
    setResponding(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const response = await fetch(`${API_URL}/jobs/ofertas-servicio/${offer.id}/${accept ? 'aceptar' : 'rechazar'}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('\n') : data.message);
      onRespond(data.status);
    } catch (error) { Alert.alert(t('Error'), error instanceof Error ? error.message : t('Error de conexión')); }
    finally { setResponding(false); }
  }
  return <View style={styles.card}>
    <Text style={styles.title}>{t(offer.status === 'ACEPTADA' ? 'Servicio acordado' : offer.status === 'RECHAZADA' ? 'Oferta rechazada' : 'Oferta pendiente')}</Text>
    <Text style={styles.text}>${offer.amount.toLocaleString(locale)}</Text>
    <Text style={styles.text}>{t(offer.status === 'PENDIENTE' ? 'Pueden conversar. El servicio comenzará cuando el prestador acepte la oferta.' : 'Puedes revisar el estado del servicio en Mis trabajos.')}</Text>
    {offer.status === 'PENDIENTE' && userId === offer.providerId && <View style={styles.actions}>
      <TouchableOpacity disabled={responding} style={styles.button} onPress={() => respond(true)}><Text style={styles.text}>{t('Aceptar oferta')}</Text></TouchableOpacity>
      <TouchableOpacity disabled={responding} style={styles.button} onPress={() => respond(false)}><Text style={styles.text}>{t('Rechazar oferta')}</Text></TouchableOpacity>
    </View>}
  </View>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 10, marginBottom: 20 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 }, text: { color: colors.text, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 }, button: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', padding: 8 },
});
