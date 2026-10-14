import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { API_URL } from '@/constants/api';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';

export function ServiceActions({ serviceId, price }: { serviceId: string; price: number }) {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  async function submit(acceptPublishedPrice: boolean) {
    if (sending) return;
    const value = Number(amount);
    if (!acceptPublishedPrice && (!Number.isInteger(value) || value <= 0 || value > 2147483647)) {
      Alert.alert(t('Oferta inválida'), t('Ingresa un importe entero mayor que cero.')); return;
    }
    setSending(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) { router.push('/login'); return; }
      const response = await fetch(`${API_URL}/jobs/${serviceId}/ofertas-servicio`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptPublishedPrice, ...(!acceptPublishedPrice ? { amount: value } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('\n') : data.message);
      router.push({ pathname: '/chat/[id]', params: { id: data.conversationId } });
    } catch (error) { Alert.alert(t('No se pudo enviar'), error instanceof Error ? error.message : t('Error de conexión')); }
    finally { setSending(false); }
  }
  return <View style={styles.container}>
    <Text style={styles.label}>{t('Precio propuesto')}: ${price.toLocaleString(locale)}</Text>
    <TouchableOpacity disabled={sending} style={styles.button} onPress={() => submit(true)}>
      {sending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{t('Aceptar precio y abrir chat')}</Text>}
    </TouchableOpacity>
    <Text style={styles.help}>{t('O propone otro importe. El prestador deberá aceptar tu oferta.')}</Text>
    <TextInput accessibilityLabel={t('Importe de tu oferta')} style={styles.input} placeholder={t('Importe de tu oferta')}
      placeholderTextColor={colors.muted} keyboardType="number-pad" value={amount} onChangeText={setAmount} editable={!sending} />
    <TouchableOpacity disabled={sending} style={styles.outline} onPress={() => submit(false)}>
      <Text style={styles.label}>{t('Hacer una oferta y abrir chat')}</Text>
    </TouchableOpacity>
  </View>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginVertical: 20, gap: 12 }, label: { color: colors.text, fontWeight: '600' },
  help: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 16 },
  button: { minHeight: 54, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  buttonText: { color: colors.onPrimary, fontWeight: '700' },
  outline: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
