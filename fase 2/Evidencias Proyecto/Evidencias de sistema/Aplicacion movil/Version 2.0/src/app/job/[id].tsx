import { ServiceActions } from '@/components/service-actions';
import { PublicationTimestamp } from '@/components/publication-timestamp';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  commune: string;
  budget: number;
  scheduledAt?: string | null;
  status: string;
  createdAt: string;
  kind?: 'OPORTUNIDAD' | 'SERVICIO';
  expiresAt?: string;
  expired?: boolean;
  serviceOriginId?: string | null;
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

export default function JobDetailsScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingInterest, setSendingInterest] =
    useState(false);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      try {
        if (!id) {
          setLoading(false);
          return;
        }

        const storedUser =
          await SecureStore.getItemAsync('user');

        if (storedUser) {
          const user: StoredUser =
            JSON.parse(storedUser);

          setCurrentUserId(user.id);
        }

        const token = await SecureStore.getItemAsync('accessToken');
        const response = await fetch(
          `${API_URL}/jobs/${id}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t("No se pudo cargar el trabajo."),
          );
        }

        setJob(data);
      } catch (error) {
        console.error(
          'Error cargando trabajo:',
          error,
        );

        Alert.alert(
          t("Error"),
          t("No se pudieron cargar los detalles del trabajo."),
          [
            {
              text: t("Volver"),
              onPress: () => router.back(),
            },
          ],
        );
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handlePass = () => {
    Alert.alert(
      t("No me interesa"),
      t("Este trabajo no se marcará como postulación."),
      [
        {
          text: t("Cancelar"),
          style: 'cancel',
        },
        {
          text: 'Continuar',
          onPress: () => router.back(),
        },
      ],
    );
  };

  const handleInterested = async () => {
    if (!job || sendingInterest) {
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
            trabajoId: job.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          Alert.alert(
            t("Ya postulaste"),
            t("Ya habías mostrado interés en este trabajo."),
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
        t(`Tu postulación a "${job.title}" fue enviada correctamente.\n\nEl dueño podrá revisar tu perfil antes de decidir.`),
        [
          {
            text: 'Continuar',
            onPress: () => router.back(),
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          {t("Cargando trabajo...")}</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {t("No se encontró el trabajo.")}</Text>

        <TouchableOpacity
          style={styles.backFallback}
          onPress={() => router.back()}
        >
          <Text style={styles.backFallbackText}>
            {t("Volver")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const esPropio =
    currentUserId === job.ownerId;
  const available = job.status === 'PUBLICADO' && !job.expired && !job.serviceOriginId && (!job.expiresAt || new Date(job.expiresAt) > new Date());

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backIcon}>
          ←
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          !esPropio && {
            paddingBottom: 135,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {job.category} · {t(job.kind === 'SERVICIO' ? 'Servicio ofrecido' : 'Trabajo disponible')}
          </Text>
        </View>

        <Text style={styles.title}>
          {job.title}
        </Text>

        <PublicationTimestamp createdAt={job.createdAt} expiresAt={job.serviceOriginId ? undefined : job.expiresAt} expired={job.expired} style={styles.description} />

        <View style={styles.mainInfo}>
          <Text style={styles.location}>
            📍 {job.commune}
          </Text>

          <Text style={styles.status}>
            {t(job.expired ? 'VENCIDA' : job.status)}
          </Text>
        </View>

        <View style={styles.budgetCard}>
          <Text style={styles.budgetLabel}>
            {t(job.kind === 'SERVICIO' ? 'Precio propuesto' : 'Presupuesto')}</Text>

          <Text style={styles.budget}>
            $
            {job.budget.toLocaleString(
              locale,
            )}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          {t("Descripción")}</Text>

        <Text style={styles.description}>
          {job.description}
        </Text>

        {job.scheduledAt ? (
          <>
            <Text style={styles.sectionTitle}>
              {t("Fecha del trabajo")}</Text>

            <Text style={styles.description}>
              {new Date(
                job.scheduledAt,
              ).toLocaleDateString(
                locale,
              )}
            </Text>
          </>
        ) : null}

        {!esPropio && available && job.kind === 'SERVICIO' && <ServiceActions serviceId={job.id} price={job.budget} />}

        <Text style={styles.sectionTitle}>
          {t("Publicado por")}</Text>

        <TouchableOpacity
          style={styles.ownerCard}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/user/[id]',
              params: {
                id: job.owner.id,
              },
            })
          }
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {job.owner.name
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>
              {job.owner.name}
            </Text>

            <Text style={styles.ownerSubtext}>
              {t("Ver perfil y reputación")}</Text>
          </View>

          <Text style={styles.ownerArrow}>
            ›
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {!esPropio && available && job.kind !== 'SERVICIO' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.passButton,
            ]}
            onPress={handlePass}
            disabled={sendingInterest}
          >
            <Text style={styles.passIcon}>
              ✕
            </Text>
          </TouchableOpacity>

          <View style={styles.actionCenter}>
            <Text style={styles.actionHint}>
              {t("¿Te interesa este trabajo?")}</Text>

            <Text
              style={styles.actionSubtext}
            >
              {t("Revisa los detalles y decide")}</Text>
          </View>

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
              <Text style={styles.likeIcon}>
                ♥
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

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    color: colors.muted,
    marginTop: 14,
  },

  errorText: {
    color: colors.text,
    fontSize: 18,
    textAlign: 'center',
  },

  backFallback: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 20,
  },

  backFallbackText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },

  backButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '300',
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 110,
    paddingBottom: 50,
  },

  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  categoryText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  title: {
    color: colors.text,
    fontSize: 33,
    lineHeight: 40,
    fontWeight: '800',
    marginTop: 20,
  },

  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  location: {
    color: colors.muted,
    fontSize: 15,
  },

  status: {
    color: colors.successText,
    fontSize: 12,
    fontWeight: '700',
  },

  budgetCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 28,
  },

  budgetLabel: {
    color: colors.muted,
    fontSize: 13,
  },

  budget: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 30,
    marginBottom: 10,
  },

  description: {
    color: colors.secondary,
    fontSize: 16,
    lineHeight: 25,
  },

  ownerCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.onPrimary,
    fontSize: 21,
    fontWeight: '800',
  },

  ownerInfo: {
    flex: 1,
    marginLeft: 14,
  },

  ownerName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  ownerSubtext: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },

  ownerArrow: {
    color: colors.muted,
    fontSize: 30,
    marginLeft: 10,
  },

  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 92,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 22,
    paddingTop: 11,
    paddingBottom: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  actionButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  passIcon: {
    color: colors.dangerText,
    fontSize: 29,
  },

  likeButton: {
    backgroundColor: colors.primary,
  },

  likeIcon: {
    color: colors.onPrimary,
    fontSize: 29,
  },

  actionCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  actionHint: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  actionSubtext: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
