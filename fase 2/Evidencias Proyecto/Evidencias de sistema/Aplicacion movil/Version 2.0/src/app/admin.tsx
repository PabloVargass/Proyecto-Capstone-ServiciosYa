import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';
import { AdminActionModal, type AdminAction } from '@/components/admin-action-modal';
import { PrivateDocumentViewer } from '@/components/private-document-viewer';

type AdminUser = { id: string; nombre: string; correo: string; rol: 'ADMIN' | 'USUARIO'; activo: boolean };
type AdminJob = { id: string; titulo: string; estado: string; oculto: boolean; propietario: { nombre: string }; servicioOrigenId?: string | null };
type Audit = { id: string; accion: string; motivo: string; creadoEn: string; actor: { nombre: string } };
type AdminIdentity = { id: string; estado: string; motivoRevision: string | null; certificadoTipo: string; usuario: { nombre: string; rut: string; correo: string } };
type Tab = 'users' | 'blocked' | 'jobs' | 'identities' | 'audit';
const tabLabels: Record<Tab, string> = { users: 'Usuarios', blocked: 'Bloqueados', jobs: 'Publicaciones', identities: 'Identidades', audit: 'Actividad administrativa' };

export default function MobileAdminScreen() {
  const { t, colors, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<Tab>('users');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [identities, setIdentities] = useState<AdminIdentity[]>([]);
  const [document, setDocument] = useState<{ path: string; title: string; type?: string } | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<AdminAction | null>(null);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setMe(null);
    async function load() {
      try {
        const admin = await authenticatedApi<AdminUser>('/admin/me', 'GET', undefined, controller.signal);
        const path = `/admin/${tab === 'blocked' ? 'users' : tab}?page=${page}${tab === 'users' || tab === 'blocked' ? `&q=${encodeURIComponent(search)}` : ''}${tab === 'blocked' ? '&activo=false' : ''}`;
        if (tab === 'users' || tab === 'blocked') {
          const data = await authenticatedApi<{ items: AdminUser[]; total: number }>(path, 'GET', undefined, controller.signal);
          if (controller.signal.aborted) return;
          setUsers(data.items); setMore(page * 20 < data.total);
        } else if (tab === 'jobs') {
          const data = await authenticatedApi<AdminJob[]>(path, 'GET', undefined, controller.signal);
          if (controller.signal.aborted) return;
          setJobs(data.slice(0, 20)); setMore(data.length > 20);
        } else if (tab === 'identities') {
          const data = await authenticatedApi<AdminIdentity[]>(path, 'GET', undefined, controller.signal);
          if (controller.signal.aborted) return;
          setIdentities(data.slice(0, 20)); setMore(data.length > 20);
        } else {
          const data = await authenticatedApi<Audit[]>(path, 'GET', undefined, controller.signal);
          if (controller.signal.aborted) return;
          setAudit(data.slice(0, 20)); setMore(data.length > 20);
        }
        if (!controller.signal.aborted) setMe(admin);
      } catch (failure) {
        if (!controller.signal.aborted) { setUsers([]); setJobs([]); setAudit([]); setError(failure instanceof Error ? failure.message : t('Error de conexión')); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [tab, page, search, revision, t]));

  function button(label: string, onPress: () => void, disabled = false) {
    return <TouchableOpacity accessibilityRole="button" style={[styles.button, disabled && { opacity: 0.45 }]} disabled={disabled || loading} onPress={onPress}><Text style={styles.buttonText}>{t(label)}</Text></TouchableOpacity>;
  }
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision(value => value + 1)} tintColor={colors.accent} />}>
      <TouchableOpacity accessibilityLabel={t('Volver')} onPress={() => router.back()} style={styles.back}><Text style={styles.text}>← {t('Volver')}</Text></TouchableOpacity>
      <Text style={styles.title}>{t('Administración')}</Text>
      <Text style={styles.help}>{t('Gestiona cuentas y publicaciones. Cada cambio queda registrado con su motivo.')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['users', 'blocked', 'identities', 'jobs', 'audit'] as const).map(value => <TouchableOpacity key={value} disabled={loading} onPress={() => { setTab(value); setPage(1); setQuery(''); setSearch(''); }} style={[styles.tab, tab === value && { borderColor: colors.accent }]}><Text style={styles.text}>{t(tabLabels[value])}</Text></TouchableOpacity>)}
      </ScrollView>
      {loading ? <ActivityIndicator color={colors.accent} /> : error ? <View style={styles.card}><Text style={styles.text}>{error}</Text>{button('Reintentar', () => setRevision(value => value + 1))}</View> : me && <>
        {(tab === 'users' || tab === 'blocked') && <>
          <TextInput style={styles.input} accessibilityLabel={t('Buscar usuario')} placeholder={t('Buscar usuario')} placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} maxLength={120} />
          {button('Buscar', () => { setSearch(query.trim()); setPage(1); })}
          {users.length === 0 && <Text style={styles.help}>{t('No hay resultados.')}</Text>}
          {users.map(user => <View key={user.id} style={styles.card}>
            <Text style={styles.name}>{user.nombre}</Text><Text style={styles.text}>{user.correo}</Text>
            <Text style={styles.help}>{t(user.rol === 'ADMIN' ? 'Administrador' : 'Usuario')} · {t(user.activo ? 'Cuenta activa' : 'Cuenta bloqueada')}</Text>
            {button(user.activo ? 'Bloquear usuario' : 'Activar cuenta', () => setAction({
              title: user.activo ? 'Bloquear usuario' : 'Activar cuenta',
              explanation: user.activo ? 'Se cerrarán sus sesiones y no podrá acceder. Sus trabajos e historial se conservarán.' : 'Se permitirá que la persona vuelva a iniciar sesión.',
              path: `/admin/users/${user.id}/access`, body: { activo: !user.activo },
            }), user.id === me.id)}
          </View>)}
        </>}
        {tab === 'jobs' && <>
          {jobs.length === 0 && <Text style={styles.help}>{t('No hay resultados.')}</Text>}
          {jobs.map(job => <View key={job.id} style={styles.card}>
            <Text style={styles.name}>{job.titulo}</Text><Text style={styles.text}>{job.propietario.nombre}</Text>
            {button('Ver detalles', () => router.push({ pathname: '/admin-publication/[id]', params: { id: job.id } }))}
            <Text style={styles.help}>{t(job.estado)} · {t(job.oculto ? 'Retirada del listado' : 'Visible')}{job.servicioOrigenId ? ` · ${t('Solicitud de servicio')}` : ''}</Text>
            {!job.servicioOrigenId && button(job.oculto ? 'Restaurar publicación' : 'Retirar publicación', () => setAction({
              title: job.oculto ? 'Restaurar publicación' : 'Retirar publicación',
              explanation: job.oculto ? 'Volverá al listado si está disponible y no ha vencido.' : 'Se retirará del listado público. Se conservarán los contratos, chats e historial.',
              path: `/admin/jobs/${job.id}/moderation`, body: { oculto: !job.oculto },
            }))}
          </View>)}
        </>}
        {tab === 'identities' && <>
          {identities.length === 0 && <Text style={styles.help}>{t('No hay resultados.')}</Text>}
          {identities.map(item => <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.usuario.nombre}</Text><Text style={styles.text}>{item.usuario.correo}</Text><Text style={styles.text}>{item.usuario.rut}</Text>
            <Text style={styles.help}>{t(item.estado === 'PENDIENTE' ? 'Identidad pendiente de revisión' : item.estado === 'APROBADA' ? 'Identidad aprobada' : 'Identidad rechazada')}</Text>
            {button('Ver foto con cédula', () => setDocument({ path: `/admin/identities/${item.id}/documents/foto`, title: 'Foto con tu cédula' }))}
            {button('Ver certificado de antecedentes', () => setDocument({ path: `/admin/identities/${item.id}/documents/certificado`, title: 'Certificado de antecedentes', type: item.certificadoTipo }))}
            {item.estado === 'PENDIENTE' && <>
              {button('Aprobar identidad', () => setAction({ title: 'Aprobar identidad', explanation: 'Confirma que revisaste la foto con cédula y el certificado. La persona podrá publicar si su cuenta está activa.', path: `/admin/identities/${item.id}/review`, body: { aprobada: true } }))}
              {button('Rechazar identidad', () => setAction({ title: 'Rechazar identidad', explanation: 'La persona verá el motivo y podrá enviar documentos corregidos. No podrá publicar hasta obtener aprobación.', path: `/admin/identities/${item.id}/review`, body: { aprobada: false } }))}
            </>}
            {item.motivoRevision && <Text style={styles.help}>{item.motivoRevision}</Text>}
          </View>)}
        </>}
        {tab === 'audit' && <>
          {audit.length === 0 && <Text style={styles.help}>{t('No hay resultados.')}</Text>}
          {audit.map(item => <View key={item.id} style={styles.card}><Text style={styles.name}>{item.accion}</Text><Text style={styles.text}>{item.actor.nombre}</Text><Text style={styles.help}>{new Date(item.creadoEn).toLocaleString(locale)}</Text><Text style={styles.text}>{item.motivo}</Text></View>)}
        </>}
        <View style={styles.pagination}>{button('Anterior', () => setPage(value => value - 1), page <= 1)}<Text style={styles.text}>{page}</Text>{button('Siguiente', () => setPage(value => value + 1), !more)}</View>
      </>}
    </ScrollView>
    {action && <AdminActionModal key={action.path + JSON.stringify(action.body)} action={action} onClose={() => setAction(null)} onSuccess={() => { setAction(null); setRevision(value => value + 1); }} />}
    {document && <PrivateDocumentViewer key={document.path} {...document} onClose={() => setDocument(null)} />}
  </SafeAreaView>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingBottom: 40, gap: 16 }, back: { minHeight: 44, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' }, name: { color: colors.text, fontSize: 17, fontWeight: '700' }, text: { color: colors.text, lineHeight: 21 }, help: { color: colors.muted, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12 },
  tabs: { gap: 8 }, tab: { padding: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, minHeight: 52, padding: 14 },
  button: { minHeight: 48, borderWidth: 1, borderColor: colors.accent, borderRadius: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: colors.text, fontWeight: '600' },
  pagination: { flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'space-between' },
});
