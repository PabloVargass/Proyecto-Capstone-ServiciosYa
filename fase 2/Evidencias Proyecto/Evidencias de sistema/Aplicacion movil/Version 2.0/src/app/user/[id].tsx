import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
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

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;

  author: {
    id: string;
    name: string;
  };

  job: {
    id: string;
    title: string;
  };
};

type PublicUserProfile = {
  id: string;
  name: string;
  memberSince: string;
  rating: number | null;
  completedJobs: number;
  reviewsCount: number;
  reviews: Review[];
};

export default function PublicUserProfileScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [
    user,
    setUser,
  ] =
    useState<PublicUserProfile | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!id) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${API_URL}/users/${id}/perfil`,
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t("No se pudo cargar el usuario."),
          );
        }

        setUser(data);
      } catch (error) {
        console.error(
          'Error cargando usuario:',
          error,
        );

        Alert.alert(
          t("Error"),
          t("No se pudo cargar el perfil del usuario."),
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
    };

    loadUser();
  }, [id]);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          {t("Cargando perfil...")}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text
          style={styles.errorText}
        >
          {t("Usuario no encontrado.")}</Text>

        <TouchableOpacity
          style={
            styles.backFallback
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backFallbackText
            }
          >
            {t("Volver")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          router.back()
        }
      >
        <Text
          style={styles.backIcon}
        >
          ←
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.avatar}>
          <Text
            style={
              styles.avatarText
            }
          >
            {user.name
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>
          {user.name}
        </Text>

        <Text
          style={
            styles.memberSince
          }
        >
          {t("Miembro desde")}{' '}
          {new Date(
            user.memberSince,
          ).toLocaleDateString(
            locale,
            {
              month: 'long',
              year: 'numeric',
            },
          )}
        </Text>

        <View
          style={
            styles.statsContainer
          }
        >
          <View style={styles.stat}>
            <Text
              style={
                styles.statValue
              }
            >
              {user.rating !== null
                ? `⭐ ${user.rating.toFixed(
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
              {user.completedJobs}
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
              {user.reviewsCount}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              {t("Reseñas")}</Text>
          </View>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t("Sobre este usuario")}</Text>

        <View style={styles.card}>
          <Text
            style={styles.cardText}
          >
            {t("Este usuario todavía no ha agregado una descripción a su perfil.")}</Text>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t("Reseñas")}</Text>

        {user.reviews.length ? (
          user.reviews.map(
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
                      {
                        review.author
                          .name
                      }
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
                      review.rating,
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.reviewJob
                  }
                >
                  {review.job.title}
                </Text>

                {review.comment ? (
                  <Text
                    style={
                      styles.reviewComment
                    }
                  >
                    “{review.comment}”
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
          <View style={styles.card}>
            <Text
              style={
                styles.emptyRating
              }
            >
              ⭐
            </Text>

            <Text
              style={
                styles.ratingTitle
              }
            >
              {t("Sin calificaciones todavía")}</Text>

            <Text
              style={styles.cardText}
            >
              {t("Las reseñas aparecerán cuando este usuario complete trabajos dentro de la plataforma.")}</Text>
          </View>
        )}

        <TouchableOpacity
          style={
            styles.requestButton
          }
          activeOpacity={0.8}
          onPress={() =>
            router.push({ pathname: '/services/[id]', params: { id: user.id } })
          }
        >
          <Text
            style={
              styles.requestButtonText
            }
          >
            {t("Ver servicios")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles =
  (colors: AppColors) => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    center: {
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
    },

    content: {
      paddingHorizontal: 24,
      paddingTop: 110,
      paddingBottom: 70,
    },

    avatar: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },

    avatarText: {
      color: colors.onPrimary,
      fontSize: 44,
      fontWeight: '800',
    },

    name: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 18,
    },

    memberSince: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 6,
    },

    statsContainer: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginTop: 30,
      paddingVertical: 20,
      flexDirection: 'row',
      justifyContent: 'space-around',
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
      fontSize: 12,
      marginTop: 4,
    },

    divider: {
      width: 1,
      backgroundColor: colors.elevated,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '700',
      marginTop: 30,
      marginBottom: 10,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },

    cardText: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },

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

    emptyRating: {
      fontSize: 35,
      textAlign: 'center',
    },

    ratingTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 8,
    },

    requestButton: {
      height: 54,
      marginTop: 30,
      backgroundColor: colors.primary,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    requestButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
