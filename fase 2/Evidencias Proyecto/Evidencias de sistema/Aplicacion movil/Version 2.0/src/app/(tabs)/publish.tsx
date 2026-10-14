import { PublicationDuration, durationMinutes } from '@/components/publication-duration';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { authenticatedApi } from '@/services/authenticated-api';
import type { IdentityStatus } from '@/app/identity';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';
import { SearchFilterSelect } from '@/components/search-filter-select';
import { chileRegions } from '@/services/publication-search';
import { serviceCategoryOptions } from '@/constants/service-categories';

export default function PublishScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [commune, setCommune] = useState('');
  const [regionId, setRegionId] = useState('');
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const selectedRegion = chileRegions.find(region => region.id === regionId);
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<'OPORTUNIDAD' | 'SERVICIO'>('OPORTUNIDAD');
  const [hours, setHours] = useState('24');
  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [checkingIdentity, setCheckingIdentity] = useState(true);
  const [identityError, setIdentityError] = useState('');
  const [identityRevision, setIdentityRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setCheckingIdentity(true); setIdentityError(''); setIdentity(null);
    fetch(`${API_URL}/jobs/categories`, { signal: controller.signal }).then(async response => { if (response.ok) { const names: string[] = await response.json(); if (!controller.signal.aborted) setCatalogCategories(names); } }).catch(() => {});
    authenticatedApi<IdentityStatus>('/identity/me', 'GET', undefined, controller.signal).then(data => { if (!controller.signal.aborted) setIdentity(data); }).catch(error => { if (!controller.signal.aborted) setIdentityError(error instanceof Error ? error.message : t('Error de conexión')); }).finally(() => { if (!controller.signal.aborted) setCheckingIdentity(false); });
    return () => controller.abort();
  }, [identityRevision, t]));

  const handlePublish = async () => {
    if (loading) return;
    if (!identity?.canPublish) { router.push('/identity'); return; }
    const duration = durationMinutes(hours);
    if (duration === null) { Alert.alert(t('Duración inválida'), t('Elige una duración entre 3 y 24 horas.')); return; }
    if (
      !title.trim() ||
      !description.trim() ||
      !category.trim() ||
      !selectedRegion ||
      !commune.trim() ||
      !budget.trim()
    ) {
      Alert.alert(
        t("Campos incompletos"),
        t("Completa todos los campos antes de publicar."),
      );
      return;
    }

    if (!selectedRegion.communes.some(item => item.name === commune)) {
      Alert.alert(t('Comuna inválida'), t('Selecciona una comuna de la región elegida.'));
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert(
        t("Título muy corto"),
        t("El título debe tener al menos 3 caracteres."),
      );
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert(
        t("Descripción muy corta"),
        t("Describe con un poco más de detalle el trabajo."),
      );
      return;
    }

    const numericBudget = Number(
      budget.replace(/\./g, '').replace(/,/g, ''),
    );

    if (!Number.isInteger(numericBudget) || numericBudget <= 0) {
      Alert.alert(
        t("Presupuesto inválido"),
        t("Ingresa un presupuesto válido."),
      );
      return;
    }

    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) {
        Alert.alert(
          t("Sesión no encontrada"),
          t("Debes iniciar sesión nuevamente."),
        );
        return;
      }

      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          commune: commune.trim(),
          budget: numericBudget,
          kind,
          durationMinutes: duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          t("No se pudo publicar"),
          t(Array.isArray(data.message)
            ? data.message.join('\n')
            : data.message || t("Ocurrió un error.")),
        );
        return;
      }

      Alert.alert(
        t("Trabajo publicado 🎉"),
        t("Tu publicación ya está disponible para otros usuarios."),
      );

      setTitle('');
      setDescription('');
      setCategory('');
      setCommune('');
      setRegionId('');
      setBudget('');
    } catch (error) {
      console.error(error);

      Alert.alert(
        t("Error de conexión"),
        t("No se pudo conectar con el servidor."),
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingIdentity || !identity?.canPublish) return <View style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>{t('Publicar')}</Text>
    {checkingIdentity ? <ActivityIndicator color={colors.accent} /> : <>
      <Text style={styles.subtitle}>{identityError || t(identity?.identity?.estado === 'PENDIENTE' ? 'Tu identidad está pendiente de revisión. Podrás publicar cuando administración la apruebe.' : 'Registra tu identidad para publicar trabajos disponibles o servicios.')}</Text>
      {identityError ? <TouchableOpacity style={styles.input} onPress={() => setIdentityRevision(value => value + 1)}><Text style={{ color: colors.text }}>{t('Reintentar')}</Text></TouchableOpacity> : <TouchableOpacity style={styles.input} onPress={() => router.push('/identity')}><Text style={{ color: colors.text }}>{t(identity?.identity?.estado === 'PENDIENTE' ? 'Ver estado de mi identidad' : 'Registra tu identidad')}</Text></TouchableOpacity>}
    </>}
  </ScrollView></View>;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("Publicar")}</Text>

        <Text style={styles.subtitle}>
          {t(kind === 'OPORTUNIDAD' ? "Cuéntanos qué necesitas y encuentra a la persona indicada." : "Describe el servicio que ofreces y tu precio.")}</Text>

        <Text style={styles.label}>{t('Tipo de publicación')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {(['OPORTUNIDAD', 'SERVICIO'] as const).map(value => <TouchableOpacity key={value}
            disabled={loading} onPress={() => setKind(value)} accessibilityRole="button"
            accessibilityState={{ selected: kind === value }}
            style={[styles.input, { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 0, borderColor: kind === value ? colors.accent : colors.border }]}>
            <Text style={{ color: colors.text }}>{t(value === 'OPORTUNIDAD' ? 'Solicitar servicio' : 'Ofrecer servicio')}</Text>
          </TouchableOpacity>)}
        </View>
        <Text style={styles.label}>{t("Título")}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("Ej: Armar un escritorio")}
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>{t("Descripción")}</Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t("Explica qué necesitas realizar...")}
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <SearchFilterSelect label="Categoría" value={category} emptyLabel="Selecciona una categoría" options={serviceCategoryOptions(catalogCategories)} allowCustom disabled={loading} onChange={setCategory} />
        <SearchFilterSelect label="Región" value={regionId} emptyLabel="Selecciona una región" options={chileRegions.map(region => ({ value: region.id, label: region.name }))} disabled={loading} onChange={value => { setRegionId(value); setCommune(''); }} />
        <SearchFilterSelect key={regionId} label="Comuna" value={commune} emptyLabel={selectedRegion ? 'Selecciona una comuna' : 'Selecciona una región primero'} options={(selectedRegion?.communes ?? []).map(item => ({ value: item.name, label: item.name }))} disabled={loading || !selectedRegion} onChange={setCommune} />

        <Text style={styles.label}>{t(kind === 'SERVICIO' ? "Precio propuesto" : "Presupuesto")}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("Ej: 25000")}
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={budget}
          onChangeText={setBudget}
        />

        <PublicationDuration value={hours} onChange={setHours} disabled={loading} />

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={handlePublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>
              {t("Publicar")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 40,
  },

  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 30,
  },

  label: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    minHeight: 54,
    marginBottom: 20,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },

  button: {
    backgroundColor: colors.primary,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
