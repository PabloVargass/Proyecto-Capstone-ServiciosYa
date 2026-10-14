import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '@/constants/api';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';
import { IdentityPhotoExample } from '@/components/identity-photo-example';

export type IdentityStatus = { rut: string; role: string; canPublish: boolean; identity: null | { id: string; estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'; motivoRevision: string | null } };
type Photo = { uri: string; type: string; name: string; file?: File };
export default function IdentityScreen() {
  const { t, colors } = useAppPreferences(); const styles = useThemedStyles(createStyles);
  const [status, setStatus] = useState<IdentityStatus | null>(null); const [rut, setRut] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null); const [certificate, setCertificate] = useState<Photo | null>(null);
  const [consent, setConsent] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const privateCopies = useRef(new Set<string>());
  useEffect(() => { const copies = privateCopies.current; return () => { for (const uri of copies) void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); }; }, []);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    authenticatedApi<IdentityStatus>('/identity/me', 'GET', undefined, controller.signal).then(data => { if (!controller.signal.aborted) { setStatus(data); setRut(data.rut); } }).catch(failure => { if (!controller.signal.aborted) { setStatus(null); setError(failure instanceof Error ? failure.message : t('Error de conexión')); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, t]));
  async function choose(target: 'foto' | 'certificado', camera: boolean) {
    if (busy) return;
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { Alert.alert(t('Permiso requerido'), t('Permite el acceso a la cámara o selecciona una foto desde tu galería.')); return; }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false, exif: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0]; const type = asset.mimeType || (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      if (!['image/jpeg', 'image/png'].includes(type) || (asset.fileSize ?? 0) > 2097152) { Alert.alert(t('Foto inválida'), t('Selecciona una foto JPG o PNG de hasta 2 MB.')); return; }
      const selected = { uri: asset.uri, type, name: `${target}.${type === 'image/png' ? 'png' : 'jpg'}`, file: asset.file };
      if (target === 'foto') setPhoto(selected); else setCertificate(selected);
    } catch (failure) { Alert.alert(t('No se pudo abrir la cámara o galería'), failure instanceof Error ? failure.message : t('Ocurrió un error.')); }
  }
  async function submit() {
    if (busy || !photo || !certificate || !consent) return;
    setBusy(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken'); if (!token) throw new Error(t('Debes iniciar sesión nuevamente.'));
      const body = new FormData(); body.append('rut', rut.trim()); body.append('consentimiento', 'true');
      for (const [name, file] of [['foto', photo], ['certificado', certificate]] as const) body.append(name, Platform.OS === 'web' && file.file ? file.file : { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
      const response = await fetch(`${API_URL}/identity/me`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const result = await response.json(); if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join('\n') : result.message || t('Ocurrió un error.'));
      setPhoto(null); setCertificate(null); setConsent(false); setRevision(value => value + 1);
      for (const uri of privateCopies.current) void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      privateCopies.current.clear();
      Alert.alert(t('Solicitud enviada'), t('Administración revisará tus documentos. Podrás publicar cuando tu identidad esté aprobada.'));
    } catch (failure) { Alert.alert(t('No se pudo enviar'), failure instanceof Error ? failure.message : t('Error de conexión')); }
    finally { setBusy(false); }
  }
  async function choosePdf() {
    if (busy) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: false, copyToCacheDirectory: true, base64: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (Platform.OS !== 'web' && asset.uri.startsWith(FileSystem.cacheDirectory ?? '\0')) privateCopies.current.add(asset.uri);
      let size = asset.size ?? asset.file?.size;
      if (size === undefined && Platform.OS !== 'web') { const info = await FileSystem.getInfoAsync(asset.uri); if (info.exists) size = info.size; }
      if ((asset.mimeType && asset.mimeType !== 'application/pdf') || !size || size > 2097152) { Alert.alert(t('PDF inválido'), t('Selecciona un certificado PDF de hasta 2 MB, sin contraseña.')); return; }
      setCertificate({ uri: asset.uri, type: 'application/pdf', name: asset.name, file: asset.file });
    } catch { Alert.alert(t('No se pudo abrir el documento'), t('Ocurrió un error.')); }
  }
  const editable = status && (!status.identity || status.identity.estado === 'RECHAZADA');
  function option(label: string, onPress: () => void) { return <TouchableOpacity disabled={busy} style={styles.outline} onPress={onPress}><Text style={styles.text}>{t(label)}</Text></TouchableOpacity>; }
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.text}>← {t('Volver')}</Text></TouchableOpacity>
    <Text style={styles.title}>{t('Registra tu identidad')}</Text>
    {loading ? <ActivityIndicator color={colors.accent} /> : error ? <View style={styles.card}><Text style={styles.text}>{error}</Text>{option('Reintentar', () => setRevision(value => value + 1))}</View> : <>
      {status?.role === 'ADMIN' && <Text style={styles.help}>{t('Tu cuenta administradora puede publicar sin esta verificación.')}</Text>}
      {status?.identity && <View style={styles.card}><Text style={styles.name}>{t(status.identity.estado === 'APROBADA' ? 'Identidad aprobada' : status.identity.estado === 'PENDIENTE' ? 'Identidad pendiente de revisión' : 'Identidad rechazada')}</Text>{status.identity.motivoRevision && <Text style={styles.text}>{status.identity.motivoRevision}</Text>}{option('Actualizar estado', () => setRevision(value => value + 1))}</View>}
      {editable && <>
        <Text style={styles.help}>{t('Necesitamos una foto de tu rostro junto con la cédula legible y tu certificado de antecedentes en foto o PDF. Administración los revisará antes de permitirte publicar.')}</Text>
        <Text style={styles.name}>{t('RUT de tu cuenta')}</Text><TextInput style={styles.input} value={rut} onChangeText={setRut} maxLength={15} editable={!busy} accessibilityLabel="RUT" autoCapitalize="characters" />
        <Text style={styles.name}>{t('Foto con tu cédula')}</Text><IdentityPhotoExample />
        {photo && <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel={t('Foto con tu cédula')} />}
        {option('Tomar foto con cédula', () => choose('foto', true))}{option('Elegir foto con cédula', () => choose('foto', false))}
        <Text style={styles.name}>{t('Certificado de antecedentes')}</Text><Text style={styles.help}>{t('Adjunta el certificado completo y legible en JPG, PNG o PDF, de hasta 2 MB. El PDF debe estar sin contraseña.')}</Text>
        {certificate && (certificate.type === 'application/pdf' ? <View style={styles.card}><Text style={styles.name}>PDF</Text><Text style={styles.text}>{certificate.name}</Text></View> : <Image source={{ uri: certificate.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel={t('Certificado de antecedentes')} />)}
        {option('Fotografiar certificado', () => choose('certificado', true))}{option('Elegir foto del certificado', () => choose('certificado', false))}
        {option('Elegir certificado PDF', choosePdf)}
        <Text style={styles.help}>{t('Tus documentos son privados: solo tú y administración podrán acceder a ellos para revisar tu identidad. No se mostrarán en tu perfil público.')}</Text>
        <TouchableOpacity disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={styles.consent} onPress={() => setConsent(value => !value)}><Text style={styles.text}>{consent ? '☑' : '☐'} {t('Autorizo la revisión privada de estos documentos y confirmo que me pertenecen.')}</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy || !photo || !certificate || !consent} style={[styles.button, (!photo || !certificate || !consent) && { opacity: 0.45 }]} onPress={submit}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{t('Enviar a revisión')}</Text>}</TouchableOpacity>
      </>}
    </>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 16, paddingBottom: 40 }, back: { minHeight: 44, justifyContent: 'center' }, title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' }, text: { color: colors.text, lineHeight: 21 }, help: { color: colors.muted, lineHeight: 21 }, card: { backgroundColor: colors.surface, padding: 18, borderRadius: 18, gap: 12 },
  input: { minHeight: 52, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }, preview: { height: 230, width: '100%', borderRadius: 14, backgroundColor: colors.surface },
  outline: { minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, consent: { paddingVertical: 12 },
  button: { minHeight: 54, padding: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: colors.onPrimary, fontWeight: '700' },
});
