import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import { authenticatedApi } from '@/services/authenticated-api';

import * as SecureStore from 'expo-secure-store';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// =====================================
// TIPOS
// =====================================

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type Review = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  createdAt: string;

  autor: {
    id: string;
    name: string;
  };

  trabajo: {
    id: string;
    title: string;
  };
};

type ReputationData = {
  usuario: {
    id: string;
    name: string;
  };

  promedio: number | null;
  totalTrabajos: number;
  totalResenas: number;
  resenas: Review[];
};

// =====================================
// PANTALLA PERFIL
// =====================================

export default function ProfileScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const [user, setUser] =
    useState<User | null>(null);

  const [
    reputation,
    setReputation,
  ] =
    useState<ReputationData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // =====================================
  // CARGAR PERFIL
  // =====================================

  const loadProfile = async () => {
    try {
      setLoading(true);
      setIsAdmin(false);

      const storedUser =
        await SecureStore.getItemAsync(
          'user',
        );

      if (!storedUser) {
        router.replace('/login');
        return;
      }

      const parsedUser: User =
        JSON.parse(storedUser);

      setUser(parsedUser);
      const current = await authenticatedApi<User & { role: string }>('/users/me');
      setUser(current);
      setIsAdmin(current.role === 'ADMIN');

      // =================================
      // CARGAR REPUTACIÓN
      // =================================

      const response = await fetch(
        `${API_URL}/resenas/usuario/${parsedUser.id}`,
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t("No se pudo cargar la reputación."),
        );
      }

      setReputation(data);
    } catch (error) {
      console.error(
        'Error cargando perfil:',
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // ACTUALIZAR AL VOLVER A PERFIL
  // =====================================

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [t, locale]),
  );

  // =====================================
  // CIERRE DE SESIÓN
  // =====================================

  const handleLogout = () => {
    Alert.alert(
      t("Cerrar sesión"),
      t("¿Estás seguro de que quieres cerrar sesión?"),
      [
        {
          text: t("Cancelar"),
          style: 'cancel',
        },

        {
          text: t("Cerrar sesión"),
          style: 'destructive',

          onPress: async () => {
            try {
              /*
               * T-06
               * Elimina el token de autenticación
               * almacenado en el dispositivo.
               */

              await SecureStore.deleteItemAsync(
                'accessToken',
              );

              /*
               * Elimina los datos persistentes
               * del usuario.
               */

              await SecureStore.deleteItemAsync(
                'user',
              );

              /*
               * T-03
               * Limpia el estado interno de
               * autenticación de la aplicación.
               */

              setUser(null);
              setReputation(null);

              /*
               * Solo redirige después de que
               * el cierre de sesión se complete.
               */

              router.replace('/');
            } catch (error) {
              /*
               * T-06
               * El error técnico se registra
               * solamente en consola.
               */

              console.error(
                'Error cerrando sesión:',
                error,
              );

              /*
               * Se muestra un mensaje claro
               * sin exponer información interna.
               */

              Alert.alert(
                t("Error al cerrar sesión"),
                t("No fue posible cerrar la sesión correctamente. Inténtalo nuevamente."),
              );
            }
          },
        },
      ],
    );
  };

  // =====================================
  // ESTRELLAS
  // =====================================

  const renderStars = (
    rating: number,
  ) => {
    return Array.from(
      { length: 5 },
      (_, index) =>
        index < rating
          ? '★'
          : '☆',
    ).join('');
  };

  // =====================================
  // FORMATEAR FECHA
  // =====================================

  const formatDate = (
    date: string,
  ) => {
    return new Date(
      date,
    ).toLocaleDateString(
      locale,
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );
  };

  // =====================================
  // CARGANDO
  // =====================================

  if (
    loading &&
    !user
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          {t("Cargando perfil...")}</Text>
      </View>
    );
  }

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      {/* =================================
          PERFIL
      ================================= */}

      <Text style={styles.title}>
        {t("Perfil")}</Text>

      <View style={styles.avatar}>
        <Text
          style={styles.avatarText}
        >
          {user?.name
            ?.charAt(0)
            .toUpperCase() || '?'}
        </Text>
      </View>

      <Text style={styles.name}>
        {user?.name || 'Usuario'}
      </Text>

      <Text style={styles.email}>
        {user?.email || ''}
      </Text>

      {/* =================================
          ESTADÍSTICAS
      ================================= */}

      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text
            style={
              styles.statValue
            }
          >
            {reputation?.promedio !==
              null &&
            reputation?.promedio !==
              undefined
              ? `⭐ ${reputation.promedio.toFixed(
                  1,
                )}`
              : '—'}
          </Text>

          <Text
            style={
              styles.statLabel
            }
          >
            {t("Calificación")}</Text>
        </View>

        <View
          style={styles.divider}
        />

        <View style={styles.stat}>
          <Text
            style={
              styles.statValue
            }
          >
            {reputation?.totalTrabajos ??
              0}
          </Text>

          <Text
            style={
              styles.statLabel
            }
          >
            {t("Trabajos")}</Text>
        </View>

        <View
          style={styles.divider}
        />

        <View style={styles.stat}>
          <Text
            style={
              styles.statValue
            }
          >
            {reputation?.totalResenas ??
              0}
          </Text>

          <Text
            style={
              styles.statLabel
            }
          >
            {t("Reseñas")}</Text>
        </View>
      </View>

      {/* =================================
          MI ACTIVIDAD
      ================================= */}

      <Text
        style={styles.sectionTitle}
      >
        {t("Mi actividad")}</Text>

      {/* MIS TRABAJOS */}

      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push('/my-jobs')
        }
      >
        <View
          style={
            styles.optionIconContainer
          }
        >
          <Text
            style={
              styles.optionIcon
            }
          >
            💼
          </Text>
        </View>

        <View
          style={styles.optionInfo}
        >
          <Text
            style={
              styles.optionTitle
            }
          >
            {t("Mis trabajos")}</Text>

          <Text
            style={
              styles.optionSubtitle
            }
          >
            {t("Revisa tus publicaciones, postulaciones y trabajos.")}</Text>
        </View>

        <Text
          style={
            styles.optionArrow
          }
        >
          ›
        </Text>
      </TouchableOpacity>

      {/* CONVERSACIONES */}

      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push(
            '/(tabs)/messages',
          )
        }
      >
        <View
          style={
            styles.optionIconContainer
          }
        >
          <Text
            style={
              styles.optionIcon
            }
          >
            💬
          </Text>
        </View>

        <View
          style={styles.optionInfo}
        >
          <Text
            style={
              styles.optionTitle
            }
          >
            {t("Conversaciones")}</Text>

          <Text
            style={
              styles.optionSubtitle
            }
          >
            {t("Revisa tus chats y trabajos coordinados.")}</Text>
        </View>

        <Text
          style={
            styles.optionArrow
          }
        >
          ›
        </Text>
      </TouchableOpacity>

      {/* =================================
          RESEÑAS
      ================================= */}

      <Text
        style={styles.sectionTitle}
      >
        {t("Reseñas recibidas")}</Text>

      {reputation?.resenas.length ? (
        reputation.resenas.map(
          (review) => (
            <View
              key={review.id}
              style={
                styles.reviewCard
              }
            >
              <View
                style={
                  styles.reviewHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.reviewAuthor
                    }
                  >
                    {review.autor.name}
                  </Text>

                  <Text
                    style={
                      styles.reviewDate
                    }
                  >
                    {formatDate(
                      review.createdAt,
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.reviewStars
                  }
                >
                  {renderStars(
                    review.puntuacion,
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.reviewJob
                }
              >
                {review.trabajo.title}
              </Text>

              {review.comentario ? (
                <Text
                  style={
                    styles.reviewComment
                  }
                >
                  “{review.comentario}”
                </Text>
              ) : (
                <Text
                  style={
                    styles.noComment
                  }
                >
                  {t("Sin comentario.")}</Text>
              )}
            </View>
          ),
        )
      ) : (
        <View
          style={
            styles.emptyReviews
          }
        >
          <Text
            style={
              styles.emptyReviewsIcon
            }
          >
            ⭐
          </Text>

          <Text
            style={
              styles.emptyReviewsTitle
            }
          >
            {t("Todavía no tienes reseñas")}</Text>

          <Text
            style={
              styles.emptyReviewsText
            }
          >
            {t("Cuando completes trabajos y otros usuarios te califiquen, aparecerán aquí.")}</Text>
        </View>
      )}

      {/* =================================
          INFORMACIÓN
      ================================= */}

      <Text
        style={styles.sectionTitle}
      >
        {t("Información")}</Text>

      {/* TELÉFONO */}

      <View style={styles.card}>
        <Text style={styles.label}>
          {t("Teléfono")}</Text>

        <Text style={styles.value}>
          {user?.phone ||
            t("No registrado")}
        </Text>
      </View>

      {/* =================================
          EDITAR PERFIL
      ================================= */}

      <TouchableOpacity
        style={styles.editProfileCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push(
            '/edit-profile',
          )
        }
      >
        <View
          style={
            styles.editProfileIconContainer
          }
        >
          <Text
            style={
              styles.editProfileIcon
            }
          >
            ✎
          </Text>
        </View>

        <View
          style={
            styles.editProfileInfo
          }
        >
          <Text
            style={
              styles.editProfileTitle
            }
          >
            {t("Editar perfil")}</Text>

          <Text
            style={
              styles.editProfileSubtitle
            }
          >
            {t("Modifica tu nombre y teléfono")}</Text>
        </View>

        <Text
          style={
            styles.editProfileArrow
          }
        >
          ›
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionCard} activeOpacity={0.7} accessibilityRole="button" onPress={() => router.push('/identity')}>
        <View style={styles.optionIconContainer}><Text style={[styles.optionIcon, { color: colors.accent }]}>✓</Text></View>
        <View style={styles.optionInfo}><Text style={styles.optionTitle}>{t('Registra tu identidad')}</Text><Text style={styles.optionSubtitle}>{t('Documentos y estado de aprobación')}</Text></View>
        <Text style={styles.optionArrow}>›</Text>
      </TouchableOpacity>
      {isAdmin && <TouchableOpacity style={styles.optionCard} activeOpacity={0.7} accessibilityRole="button" onPress={() => router.push('/admin')}>
        <View style={styles.optionIconContainer}><Text style={[styles.optionIcon, { color: colors.accent }]}>⚙</Text></View>
        <View style={styles.optionInfo}><Text style={styles.optionTitle}>{t('Administración')}</Text><Text style={styles.optionSubtitle}>{t('Usuarios, publicaciones y actividad')}</Text></View>
        <Text style={styles.optionArrow}>›</Text>
      </TouchableOpacity>}

      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('Ajustes')}
        onPress={() => router.push('/settings')}
      >
        <View style={styles.optionIconContainer}>
          <Text style={[styles.optionIcon, { color: colors.accent }]}>⚙</Text>
        </View>
        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>{t('Ajustes')}</Text>
          <Text style={styles.optionSubtitle}>{t('Idioma y apariencia')}</Text>
        </View>
        <Text style={styles.optionArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.logoutButton
        }
        onPress={handleLogout}
      >
        <Text
          style={
            styles.logoutText
          }
        >
          {t("Cerrar sesión")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// =====================================
// ESTILOS
// =====================================

const createStyles =
  (colors: AppColors) => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: colors.muted,
      marginTop: 12,
    },

    container: {
      paddingHorizontal: 24,
      paddingTop: 65,
      paddingBottom: 120,
    },

    // =================================
    // CABECERA
    // =================================

    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '800',
    },

    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: 32,
    },

    avatarText: {
      color: colors.onPrimary,
      fontSize: 38,
      fontWeight: '800',
    },

    name: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 18,
    },

    email: {
      color: colors.muted,
      fontSize: 15,
      textAlign: 'center',
      marginTop: 6,
    },

    // =================================
    // ESTADÍSTICAS
    // =================================

    statsCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginTop: 28,
      paddingVertical: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },

    stat: {
      flex: 1,
      alignItems: 'center',
    },

    statValue: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
    },

    statLabel: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },

    divider: {
      height: 34,
      width: 1,
      backgroundColor: colors.elevated,
    },

    // =================================
    // SECCIONES
    // =================================

    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 30,
      marginBottom: 12,
    },

    // =================================
    // OPCIONES DE ACTIVIDAD
    // =================================

    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },

    optionIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    optionIcon: {
      fontSize: 22,
    },

    optionInfo: {
      flex: 1,
      marginLeft: 13,
    },

    optionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },

    optionSubtitle: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },

    optionArrow: {
      color: colors.muted,
      fontSize: 28,
      marginLeft: 7,
    },

    // =================================
    // RESEÑAS
    // =================================

    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 17,
      marginBottom: 12,
    },

    reviewHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
    },

    reviewAuthor: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },

    reviewDate: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 3,
    },

    reviewStars: {
      color: colors.warningText,
      fontSize: 17,
      letterSpacing: 1,
    },

    reviewJob: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 13,
    },

    reviewComment: {
      color: colors.secondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 10,
    },

    noComment: {
      color: colors.muted,
      fontSize: 13,
      fontStyle: 'italic',
      marginTop: 10,
    },

    emptyReviews: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
    },

    emptyReviewsIcon: {
      fontSize: 30,
    },

    emptyReviewsTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 10,
    },

    emptyReviewsText: {
      color: colors.muted,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 6,
    },

    // =================================
    // INFORMACIÓN
    // =================================

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
    },

    label: {
      color: colors.muted,
      fontSize: 13,
    },

    value: {
      color: colors.text,
      fontSize: 16,
      marginTop: 5,
    },

    // =================================
    // EDITAR PERFIL
    // =================================

    editProfileCard: {
      backgroundColor: colors.surface,

      borderRadius: 18,

      borderWidth: 1,
      borderColor: colors.border,

      padding: 15,

      flexDirection: 'row',
      alignItems: 'center',

      marginTop: 12,
    },

    editProfileIconContainer: {
      width: 48,
      height: 48,

      borderRadius: 15,

      backgroundColor: colors.primary,

      alignItems: 'center',
      justifyContent: 'center',
    },

    editProfileIcon: {
      color: colors.onPrimary,

      fontSize: 24,
      fontWeight: '800',
    },

    editProfileInfo: {
      flex: 1,

      marginLeft: 13,
    },

    editProfileTitle: {
      color: colors.text,

      fontSize: 16,
      fontWeight: '700',
    },

    editProfileSubtitle: {
      color: colors.muted,

      fontSize: 12,
      lineHeight: 17,

      marginTop: 3,
    },

    editProfileArrow: {
      color: colors.muted,

      fontSize: 28,

      marginLeft: 7,
    },

    // =================================
    // CERRAR SESIÓN
    // =================================

    logoutButton: {
      marginTop: 35,

      borderWidth: 1,
      borderColor: colors.dangerText,

      borderRadius: 14,

      paddingVertical: 15,

      alignItems: 'center',
    },

    logoutText: {
      color: colors.dangerText,

      fontSize: 16,
      fontWeight: '700',
    },
  });
