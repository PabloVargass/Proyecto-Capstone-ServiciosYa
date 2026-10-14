import { PublicationDuration, durationMinutes } from '@/components/publication-duration';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import {
  useCallback,
  useState,
} from 'react';

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

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import * as SecureStore from 'expo-secure-store';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Ionicons,
} from '@expo/vector-icons';

import { API_URL } from '@/constants/api';

type JobResponse = {
  createdAt: string;
  expiresAt: string;
  serviceOriginId?: string | null;
  id: string;
  title: string;
  description: string;
  category: string;
  commune: string;
  budget: number;
  scheduledAt: string | null;
  status: string;
};

export default function EditJobScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const router = useRouter();

  const params =
    useLocalSearchParams<{
      id: string;
    }>();

  const jobId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [hours, setHours] = useState('24');
  const [initialHours, setInitialHours] = useState('24');

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    category,
    setCategory,
  ] = useState('');

  const [
    commune,
    setCommune,
  ] = useState('');

  const [
    budget,
    setBudget,
  ] = useState('');

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  // =====================================
  // CARGAR TRABAJO
  // =====================================

  const loadJob =
    useCallback(async () => {
      if (!jobId) {
        Alert.alert(
          t("Error"),
          t("No se encontró el trabajo."),
        );

        router.back();

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/jobs/${jobId}`,
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              t("No fue posible cargar el trabajo."),
          );
        }

        const job =
          result as JobResponse;

        const previousHours = (new Date(job.expiresAt).getTime() - new Date(job.createdAt).getTime()) / 3600000;
        const duration = String([3, 6, 12, 24].find(value => value >= previousHours - 0.001) ?? 24);
        setHours(duration); setInitialHours(duration);

        setTitle(
          job.title ?? '',
        );

        setDescription(
          job.description ?? '',
        );

        setCategory(
          job.category ?? '',
        );

        setCommune(
          job.commune ?? '',
        );

        setBudget(
          job.budget !==
            undefined &&
            job.budget !== null
            ? String(job.budget)
            : '',
        );

        setScheduledAt(
          job.scheduledAt
            ? job.scheduledAt
                .slice(0, 10)
            : '',
        );

        if (
          job.status !==
          'PUBLICADO' || job.serviceOriginId
        ) {
          Alert.alert(
            t("Edición no disponible"),
            t("Solo puedes editar trabajos que se encuentren publicados."),
            [
              {
                text: t("Volver"),
                onPress: () =>
                  router.back(),
              },
            ],
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("No fue posible cargar el trabajo.");

        Alert.alert(
          t("Error"),
          t(message),
          [
            {
              text: t("Volver"),
              onPress: () =>
                router.back(),
            },
          ],
        );
      } finally {
        setLoading(false);
      }
    }, [jobId, router, t, locale]);

  useFocusEffect(
    useCallback(() => {
      loadJob();

      return () => {};
    }, [loadJob, t, locale]),
  );

  // =====================================
  // VALIDAR FORMULARIO
  // =====================================

  const validateForm = () => {
    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    const cleanCategory =
      category.trim();

    const cleanCommune =
      commune.trim();

    if (!cleanTitle) {
      Alert.alert(
        t("Campo requerido"),
        t("Ingresa el título del trabajo."),
      );

      return false;
    }

    if (
      cleanTitle.length < 3
    ) {
      Alert.alert(
        t("Título inválido"),
        t("El título debe tener al menos 3 caracteres."),
      );

      return false;
    }

    if (!cleanDescription) {
      Alert.alert(
        t("Campo requerido"),
        t("Ingresa una descripción."),
      );

      return false;
    }

    if (
      cleanDescription.length <
      10
    ) {
      Alert.alert(
        t("Descripción inválida"),
        t("La descripción debe tener al menos 10 caracteres."),
      );

      return false;
    }

    if (!cleanCategory) {
      Alert.alert(
        t("Campo requerido"),
        t("Ingresa una categoría."),
      );

      return false;
    }

    if (!cleanCommune) {
      Alert.alert(
        t("Campo requerido"),
        t("Ingresa una comuna."),
      );

      return false;
    }

    const numericBudget =
      Number(budget);

    if (
      !budget.trim() ||
      Number.isNaN(
        numericBudget,
      ) ||
      numericBudget <= 0
    ) {
      Alert.alert(
        t("Presupuesto inválido"),
        t("Ingresa un presupuesto mayor a 0."),
      );

      return false;
    }

    return true;
  };

  // =====================================
  // GUARDAR CAMBIOS
  // =====================================

  const saveChanges =
    async () => {
      if (
        !jobId ||
        saving
      ) {
        return;
      }

      if (durationMinutes(hours) === null) { Alert.alert(t('Duración inválida'), t('Elige una duración entre 3 y 24 horas.')); return; }
      if (!validateForm()) {
        return;
      }

      try {
        setSaving(true);

        const token =
          await SecureStore.getItemAsync(
            'accessToken',
          );

        if (!token) {
          Alert.alert(
            t("Sesión requerida"),
            t("Debes iniciar sesión para editar un trabajo."),
          );

          router.replace(
            '/login',
          );

          return;
        }

        const body: {
          title: string;
          description: string;
          category: string;
          commune: string;
          budget: number;
          scheduledAt?: string;
          durationMinutes?: number;
        } = {
          title:
            title.trim(),

          description:
            description.trim(),

          category:
            category.trim(),

          commune:
            commune.trim(),

          budget:
            Number(budget),
        };

        if (hours !== initialHours) body.durationMinutes = durationMinutes(hours)!;

        if (
          scheduledAt.trim()
        ) {
          body.scheduledAt =
            scheduledAt.trim();
        }

        const response =
          await fetch(
            `${API_URL}/jobs/${jobId}`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,

                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  body,
                ),
            },
          );

        const result =
          await response.json();

        if (!response.ok) {
          const message =
            Array.isArray(
              result?.message,
            )
              ? result.message.join(
                  '\n',
                )
              : result?.message;

          throw new Error(
            message ||
              t("No fue posible actualizar el trabajo."),
          );
        }

        Alert.alert(
          t("Trabajo actualizado"),
          t("Los cambios fueron guardados correctamente."),
          [
            {
              text: t("Aceptar"),

              onPress: () => {
                router.back();
              },
            },
          ],
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("No fue posible actualizar el trabajo.");

        Alert.alert(
          t("Error"),
          t(message),
        );
      } finally {
        setSaving(false);
      }
    };

  // =====================================
  // PANTALLA DE CARGA
  // =====================================

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            {t("Cargando trabajo...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* ========================= */}
        {/* HEADER */}
        {/* ========================= */}

        <View
          style={styles.header}
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              {t("Editar trabajo")}</Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {t("Modifica los datos de tu publicación")}</Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* ========================= */}
          {/* INFORMACIÓN */}
          {/* ========================= */}

          <View
            style={
              styles.infoBox
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={colors.accent}
            />

            <Text
              style={
                styles.infoBoxText
              }
            >
              {t("Puedes modificar un trabajo mientras se encuentre publicado.")}</Text>
          </View>

          {/* ========================= */}
          {/* TÍTULO */}
          {/* ========================= */}

          <Text
            style={
              styles.label
            }
          >
            {t("Título")}</Text>

          <TextInput
            style={
              styles.input
            }
            value={title}
            onChangeText={
              setTitle
            }
            placeholder={t("Ej: Armado de mueble")}
            placeholderTextColor={colors.muted}
            editable={!saving}
            maxLength={100}
          />

          {/* ========================= */}
          {/* DESCRIPCIÓN */}
          {/* ========================= */}

          <Text
            style={
              styles.label
            }
          >
            {t("Descripción")}</Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            value={
              description
            }
            onChangeText={
              setDescription
            }
            placeholder={t("Describe el trabajo que necesitas realizar")}
            placeholderTextColor={colors.muted}
            editable={!saving}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          {/* ========================= */}
          {/* CATEGORÍA */}
          {/* ========================= */}

          <Text
            style={
              styles.label
            }
          >
            {t("Categoría")}</Text>

          <TextInput
            style={
              styles.input
            }
            value={category}
            onChangeText={
              setCategory
            }
            placeholder={t("Ej: Armado")}
            placeholderTextColor={colors.muted}
            editable={!saving}
          />

          {/* ========================= */}
          {/* COMUNA */}
          {/* ========================= */}

          <Text
            style={
              styles.label
            }
          >
            {t("Comuna")}</Text>

          <TextInput
            style={
              styles.input
            }
            value={commune}
            onChangeText={
              setCommune
            }
            placeholder={t("Ej: Maipú")}
            placeholderTextColor={colors.muted}
            editable={!saving}
          />

          {/* ========================= */}
          {/* PRESUPUESTO */}
          {/* ========================= */}

          <Text
            style={
              styles.label
            }
          >
            {t("Presupuesto")}</Text>

          <View
            style={
              styles.moneyContainer
            }
          >
            <Text
              style={
                styles.moneySymbol
              }
            >
              $
            </Text>

            <TextInput
              style={
                styles.moneyInput
              }
              value={budget}
              onChangeText={(
                value,
              ) => {
                const onlyNumbers =
                  value.replace(
                    /[^0-9]/g,
                    '',
                  );

                setBudget(
                  onlyNumbers,
                );
              }}
              placeholder="30000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              editable={!saving}
            />
          </View>

          {/* ========================= */}
          {/* FECHA */}
          {/* ========================= */}

          <Text
            style={
              styles.label
            }
          >
            {t("Fecha programada")}</Text>

          <TextInput
            style={
              styles.input
            }
            value={
              scheduledAt
            }
            onChangeText={
              setScheduledAt
            }
            placeholder={t('AAAA-MM-DD')}
            placeholderTextColor={colors.muted}
            editable={!saving}
            maxLength={10}
          />

          <Text
            style={
              styles.helperText
            }
          >
            {t("Ejemplo: 2026-10-10")}</Text>

          {/* ========================= */}
          {/* GUARDAR */}
          {/* ========================= */}

          <PublicationDuration value={hours} onChange={setHours} disabled={saving} />
          <Text style={styles.label}>{t("La duración se cuenta desde la publicación original.")}</Text>

          <TouchableOpacity
            style={[
              styles.saveButton,

              saving &&
                styles.saveButtonDisabled,
            ]}
            onPress={
              saveChanges
            }
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator
                color={colors.background}
              />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color={colors.background}
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {t("Guardar cambios")}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.cancelButton
            }
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              {t("Cancelar")}</Text>
          </TouchableOpacity>

          <View
            style={{
              height: 30,
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles =
  (colors: AppColors) => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 18,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTextContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '900',
    },

    headerSubtitle: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 2,
      textAlign: 'center',
    },

    headerSpacer: {
      width: 44,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 30,
    },

    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        'rgba(56, 189, 248, 0.35)',
      backgroundColor:
        'rgba(56, 189, 248, 0.08)',
      marginBottom: 24,
    },

    infoBoxText: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },

    label: {
      color: colors.secondary,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 8,
    },

    input: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
      paddingHorizontal: 15,
      color: colors.text,
      fontSize: 14,
      marginBottom: 18,
    },

    textArea: {
      minHeight: 130,
      paddingTop: 15,
      paddingBottom: 15,
    },

    moneyContainer: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
      marginBottom: 18,
      paddingHorizontal: 15,
    },

    moneySymbol: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: '900',
      marginRight: 8,
    },

    moneyInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      minHeight: 50,
    },

    helperText: {
      color: colors.muted,
      fontSize: 11,
      marginTop: -10,
      marginBottom: 24,
    },

    saveButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor:
        colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 9,
      marginTop: 4,
    },

    saveButtonDisabled: {
      opacity: 0.65,
    },

    saveButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '900',
    },

    cancelButton: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 12,
    },

    cancelButtonText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '800',
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    loadingText: {
      color: colors.muted,
      fontSize: 14,
      marginTop: 14,
    },
  });
