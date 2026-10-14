import { PublicationTimestamp } from '@/components/publication-timestamp';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { filterPublications, readPublicationFilters } from '@/services/publication-search';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';

type Job = {
  id: string;
  createdAt: string;
  kind?: 'OPORTUNIDAD' | 'SERVICIO';
  expiresAt?: string;
  expired?: boolean;
  serviceOriginId?: string | null;
  title: string;
  description: string;
  category: string;
  commune: string;
  budget: number;
  status: string;
  ownerId: string;

  owner: {
    id: string;
    name: string;
  };
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
};

export default function SearchScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ filters?: string }>();
  const filters = useMemo(() => readPublicationFilters(params.filters), [params.filters]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [sendingInterest, setSendingInterest] =
    useState(false);

  const loadJobs = async () => {
    try {
      const responses = await Promise.all(['OPORTUNIDAD', 'SERVICIO'].map(kind => fetch(`${API_URL}/jobs?kind=${kind}`)));

      if (responses.some(response => !response.ok)) {
        throw new Error(
          t("No se pudieron cargar los trabajos."),
        );
      }

      const data: Job[] = (await Promise.all(responses.map(response => response.json()))).flat();

      const storedUser =
        await SecureStore.getItemAsync('user');

      let currentUserId: string | null = null;

      if (storedUser) {
        const user: StoredUser =
          JSON.parse(storedUser);

        currentUserId = user.id;
      }

      // Evita mostrar trabajos publicados
      // por el propio usuario.
      const availableJobs = currentUserId
        ? data.filter(
            (job) => job.ownerId !== currentUserId,
          )
        : data;

      setJobs(filterPublications(availableJobs, filters));
      setCurrentIndex(0);
    } catch (error) {
      console.error(
        'Error cargando trabajos:',
        error,
      );

      Alert.alert(
        t("Error"),
        t("No se pudieron cargar los trabajos disponibles."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [t, locale, filters]),
  );

  const currentJob = jobs[currentIndex];

  const handlePass = () => {
    setCurrentIndex(
      (previous) => previous + 1,
    );
  };

  const handleInterested = async () => {
    if (currentJob?.kind === 'SERVICIO') { router.push({ pathname: '/job/[id]', params: { id: currentJob.id } }); return; }
    if (!currentJob || sendingInterest) {
      return;
    }

    try {
      setSendingInterest(true);

      const token =
        await SecureStore.getItemAsync(
          'accessToken',
        );

      if (!token) {
        Alert.alert(
          t("Sesión no encontrada"),
          t("Debes iniciar sesión nuevamente."),
        );

        return;
      }

      const response = await fetch(
        `${API_URL}/postulaciones`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            trabajoId: currentJob.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // Ya existe una postulación
        if (response.status === 409) {
          Alert.alert(
            t("Ya postulaste"),
            t("Ya habías mostrado interés en este trabajo."),
            [
              {
                text: 'Continuar',
                onPress: () =>
                  setCurrentIndex(
                    (previous) =>
                      previous + 1,
                  ),
              },
            ],
          );

          return;
        }

        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
                t("No se pudo enviar la postulación."),
        );
      }

      Alert.alert(
        t("❤️ Interés enviado"),
        t(`Tu postulación a "${currentJob.title}" fue enviada correctamente.\n\nEl dueño del trabajo podrá revisar tu perfil antes de decidir.`),
        [
          {
            text: 'Continuar',
            onPress: () =>
              setCurrentIndex(
                (previous) =>
                  previous + 1,
              ),
          },
        ],
      );
    } catch (error) {
      console.error(
        'Error enviando postulación:',
        error,
      );

      Alert.alert(
        t("Error"),
        t("No se pudo enviar tu postulación. Inténtalo nuevamente."),
      );
    } finally {
      setSendingInterest(false);
    }
  };

  const handleDetails = () => {
    if (!currentJob) {
      return;
    }

    router.push({
      pathname: '/job/[id]',
      params: {
        id: currentJob.id,
      },
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          {t("Buscando trabajos...")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <Text style={styles.smallTitle}>
          {t("DESCUBRIR")}</Text>

        <Text style={styles.title}>
          {t("Encuentra tu próximo trabajo")}</Text>

        <Text style={styles.subtitle}>
          {t('Encuentra servicios ofrecidos y trabajos para postular.')}</Text>

        {currentJob ? (
          <View style={styles.card}>
            <View
              style={
                styles.categoryBadge
              }
            >
              <Text
                style={
                  styles.categoryText
                }
              >
                {currentJob.category}
              </Text>
            </View>

            <Text style={styles.jobTitle}>
              {currentJob.title}
            </Text>

            <Text
              style={styles.description}
            >
              {currentJob.description}
            </Text>

            <View
              style={
                styles.infoContainer
              }
            >
              <Text style={styles.info}>
                📍 {currentJob.commune}
              </Text>

              <Text style={styles.info}>
                👤 {currentJob.owner.name}
              </Text>
              <PublicationTimestamp createdAt={currentJob.createdAt} expiresAt={currentJob.expiresAt} expired={currentJob.expired} style={styles.info} />
            </View>

            <Text
              style={styles.budgetLabel}
            >
              {t(currentJob.kind === 'SERVICIO' ? 'Precio propuesto' : 'Presupuesto')}</Text>

            <Text style={styles.budget}>
              $
              {currentJob.budget.toLocaleString(
                locale,
              )}
            </Text>

            <Text style={styles.counter}>
              {currentIndex + 1}{' '}{t("de")}{' '}
              {jobs.length}
            </Text>
          </View>
        ) : (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyIcon}
            >
              🎉
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              {t("Estás al día")}</Text>

            <Text
              style={styles.emptyText}
            >
              {t("Ya revisaste todos los trabajos disponibles.")}</Text>

            <TouchableOpacity
              style={
                styles.reloadButton
              }
              onPress={loadJobs}
            >
              <Text
                style={
                  styles.reloadButtonText
                }
              >
                {t("Buscar nuevamente")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {currentJob && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.passButton,
            ]}
            onPress={handlePass}
          >
            <Text
              style={styles.passIcon}
            >
              ✕
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.detailsButton
            }
            onPress={handleDetails}
          >
            <Text
              style={styles.detailsText}
            >
              {t("Ver detalles")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.likeButton,
            ]}
            onPress={handleInterested}
            disabled={sendingInterest}
          >
            {sendingInterest ? (
              <ActivityIndicator
                color={colors.onPrimary}
              />
            ) : (
              <Text
                style={styles.likeIcon}
              >
                {currentJob.kind === 'SERVICIO' ? '→' : '♥'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.muted,
    marginTop: 14,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 150,
  },

  smallTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },

  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '800',
    marginTop: 8,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 28,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    minHeight: 420,
  },

  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },

  categoryText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  jobTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 22,
  },

  description: {
    color: colors.secondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 15,
  },

  infoContainer: {
    marginTop: 25,
    gap: 10,
  },

  info: {
    color: colors.muted,
    fontSize: 15,
  },

  budgetLabel: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 28,
  },

  budget: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 3,
  },

  counter: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 20,
  },

  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },

  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  likeButton: {
    backgroundColor: colors.primary,
  },

  passIcon: {
    color: colors.dangerText,
    fontSize: 31,
  },

  likeIcon: {
    color: colors.onPrimary,
    fontSize: 31,
  },

  detailsButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
  },

  detailsText: {
    color: colors.secondary,
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 15,
  },

  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },

  reloadButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 22,
  },

  reloadButtonText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
