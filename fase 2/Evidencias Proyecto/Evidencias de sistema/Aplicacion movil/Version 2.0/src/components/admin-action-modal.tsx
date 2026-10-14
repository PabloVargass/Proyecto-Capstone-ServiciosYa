import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';

export type AdminAction = { title: string; explanation: string; path: string; body: Record<string, unknown> };

export function AdminActionModal({ action, onClose, onSuccess }: { action: AdminAction; onClose: () => void; onSuccess: () => void }) {
  const { t, colors } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    if (reason.trim().length < 5) { Alert.alert(t('Motivo requerido'), t('Escribe un motivo de al menos 5 caracteres.')); return; }
    setBusy(true);
    try {
      await authenticatedApi(action.path, 'PATCH', { ...action.body, motivo: reason.trim() });
      onSuccess();
    } catch (error) { Alert.alert(t('No se pudo realizar el cambio'), error instanceof Error ? error.message : t('Error de conexión')); }
    finally { setBusy(false); }
  }
  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t(action.title)}</Text>
          <Text style={styles.text}>{t(action.explanation)}</Text>
          <Text style={styles.text}>{t('Motivo del cambio')}</Text>
          <TextInput autoFocus multiline maxLength={500} editable={!busy} value={reason} onChangeText={setReason}
            accessibilityLabel={t('Motivo del cambio')} style={styles.input} placeholder={t('Motivo del cambio')} placeholderTextColor={colors.muted} />
          <TouchableOpacity style={styles.button} disabled={busy} onPress={submit}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{t('Confirmar cambio')}</Text>}</TouchableOpacity>
          <TouchableOpacity style={styles.cancel} disabled={busy} onPress={onClose}><Text style={styles.text}>{t('Cancelar')}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099' }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.background, borderRadius: 20, padding: 22, gap: 16 }, title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  text: { color: colors.text, lineHeight: 21 }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, minHeight: 100, padding: 14, textAlignVertical: 'top' },
  button: { minHeight: 52, backgroundColor: colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: colors.onPrimary, fontWeight: '700' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
