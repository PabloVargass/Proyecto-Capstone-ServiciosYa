import { PublicationTimestamp } from '@/components/publication-timestamp';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import {
  useCallback,
  useState,
} from 'react';

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

import {
  useFocusEffect,
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

type PublishedJob = {
  expiresAt?: string;
  expired?: boolean;
  kind?: 'OPORTUNIDAD' | 'SERVICIO';
  serviceOriginId?: string | null;
  id: string;
  title: string;
  description: string;
  category: string;
  commune: string;
  budget: number;
  scheduledAt: string | null;
  status: string;
  createdAt: string;
  applicantsCount: number;
  conversationId: string | null;
};

type AppliedJob = {
  applicationId: string;
  applicationStatus: string;
  appliedAt: string;

  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    commune: string;
    budget: number;
    scheduledAt: string | null;
    status: string;

    owner: {
      id: string;
      name: string;
    };
  };

  conversationId: string | null;
};

type AssignedJob = {
  applicationId: string | null;
  id: string;
  title: string;
  description: string;
  category: string;
  commune: string;
  budget: number;
  scheduledAt: string | null;
  status: string;

  owner: {
    id: string;
    name: string;
  };

  participant?: { id: string; name: string } | null;
  conversationId: string | null;
};

type CompletedJob = {
  applicationId: string | null;
  id: string;
  title: string;
  description: string;
  category: string;
  commune: string;
  budget: number;
  scheduledAt: string | null;
  status: string;

  owner: {
    id: string;
    name: string;
  };

  participant?: { id: string; name: string } | null;
  conversationId: string | null;
};

type JobsResponse = {
  publicados: PublishedJob[];
  postulados: AppliedJob[];
  asignados: AssignedJob[];
  completados: CompletedJob[];

  resumen: {
    publicados: number;
    postulados: number;
    asignados: number;
    completados: number;
  };
};

type TabType =
  | 'publicados'
  | 'postulados'
  | 'asignados'
  | 'completados';

export default function MyJobsScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const router = useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabType>(
      'publicados',
    );

  const [
    data,
    setData,
  ] =
    useState<JobsResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<string | null>(
      null,
    );

  // =====================================
  // CARGAR MIS TRABAJOS
  // =====================================

  const loadJobs =
    useCallback(
      async (
        showLoader = true,
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          const token =
            await SecureStore.getItemAsync(
              'accessToken',
            );

          if (!token) {
            Alert.alert(
              t("Sesión requerida"),
              t("Debes iniciar sesión para ver tus trabajos."),
            );

            router.replace(
              '/login',
            );

            return;
          }

          const response =
            await fetch(
              `${API_URL}/jobs/mis-trabajos`,
              {
                method: 'GET',

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result?.message ||
                t("No fue posible cargar tus trabajos."),
            );
          }

          setData(result);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("Ocurrió un error al cargar tus trabajos.");

          Alert.alert(
            t("Error"),
            t(message),
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router, t, locale],
    );

  useFocusEffect(
    useCallback(() => {
      loadJobs();

      return () => {};
    }, [loadJobs, t, locale]),
  );

  // =====================================
  // ACTUALIZAR
  // =====================================

  const onRefresh =
    useCallback(() => {
      setRefreshing(true);

      loadJobs(false);
    }, [loadJobs, t, locale]);

  // =====================================
  // ABRIR DETALLE
  // =====================================

  const abrirTrabajo = (
    id: string,
  ) => {
    router.push({
      pathname: '/job/[id]',
      params: {
        id,
      },
    });
  };

  // =====================================
  // EDITAR TRABAJO
  // =====================================

  const editarTrabajo = (
    id: string,
  ) => {
    router.push({
      pathname: '/edit-job/[id]',
      params: {
        id,
      },
    });
  };

  // =====================================
  // ABRIR CHAT
  // =====================================

  const abrirChat = (
  conversationId: string,
) => {
  router.push({
    pathname: '/chat/[id]',
    params: {
      id: conversationId,
    },
  });
};

  // =====================================
  // CALIFICAR
  // =====================================

  const calificarTrabajo = (
    jobId: string,
  ) => {
    router.push({
      pathname: '/review/[id]',
      params: {
        id: jobId,
      },
    });
  };

  // =====================================
  // INICIAR TRABAJO
  // =====================================

  const iniciarTrabajo =
    async (
      jobId: string,
    ) => {
      try {
        setActionLoading(
          jobId,
        );

        const token =
          await SecureStore.getItemAsync(
            'accessToken',
          );

        if (!token) {
          Alert.alert(
            t("Sesión requerida"),
            t("Debes iniciar sesión."),
          );

          return;
        }

        const response =
          await fetch(
            `${API_URL}/jobs/${jobId}/iniciar`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,

                'Content-Type':
                  'application/json',
              },
            },
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              t("No fue posible iniciar el trabajo."),
          );
        }

        Alert.alert(
          t("Trabajo iniciado"),
          t(result?.message ||
            t("El trabajo fue iniciado correctamente.")),
        );

        await loadJobs(
          false,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("No fue posible iniciar el trabajo.");

        Alert.alert(
          t("Error"),
          t(message),
        );
      } finally {
        setActionLoading(
          null,
        );
      }
    };

  // =====================================
  // COMPLETAR TRABAJO
  // =====================================

  const completarTrabajo =
    async (
      jobId: string,
    ) => {
      try {
        setActionLoading(
          jobId,
        );

        const token =
          await SecureStore.getItemAsync(
            'accessToken',
          );

        if (!token) {
          Alert.alert(
            t("Sesión requerida"),
            t("Debes iniciar sesión."),
          );

          return;
        }

        const response =
          await fetch(
            `${API_URL}/jobs/${jobId}/completar`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,

                'Content-Type':
                  'application/json',
              },
            },
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              t("No fue posible completar el trabajo."),
          );
        }

        Alert.alert(
          t("Trabajo completado"),
          t(result?.message ||
            t("El trabajo fue completado correctamente.")),
        );

        await loadJobs(
          false,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("No fue posible completar el trabajo.");

        Alert.alert(
          t("Error"),
          t(message),
        );
      } finally {
        setActionLoading(
          null,
        );
      }
    };

  // =====================================
  // FORMATO MONEDA
  // =====================================

  const formatCurrency = (
    value: number,
  ) => {
    return new Intl.NumberFormat(
      locale,
      {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
      },
    ).format(value);
  };

  // =====================================
  // FORMATO FECHA
  // =====================================

  const formatDate = (
    value: string | null,
  ) => {
    if (!value) {
      return t("Sin fecha definida");
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return t("Sin fecha definida");
    }

    return date.toLocaleDateString(
      locale,
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );
  };

  // =====================================
  // COLOR ESTADO
  // =====================================

  const getStatusColor = (
    status: string,
  ) => {
    switch (status) {
      case 'PUBLICADO':
        return colors.accent;

      case 'ASIGNADO':
        return colors.warningText;

      case 'EN_PROCESO':
        return colors.purple;

      case 'COMPLETADO':
        return colors.successText;

      case 'CANCELADO':
        return colors.dangerText;

      default:
        return colors.muted;
    }
  };

  // =====================================
  // TEXTO ESTADO
  // =====================================

  const getStatusText = (
    status: string,
  ) => {
    switch (status) {
      case 'VENCIDA':
        return t('Vencida');
      case 'PUBLICADO':
        return t("Publicado");

      case 'ASIGNADO':
        return t("Asignado");

      case 'EN_PROCESO':
        return t("En proceso");

      case 'COMPLETADO':
        return t("Completado");

      case 'CANCELADO':
        return t("Cancelado");

      default:
        return status;
    }
  };

  // =====================================
  // ESTADO POSTULACIÓN
  // =====================================

  const getApplicationText = (
    status: string,
  ) => {
    switch (status) {
      case 'PENDIENTE':
        return t("Pendiente");

      case 'ACEPTADA':
        return t("Aceptada");

      case 'RECHAZADA':
        return t("Rechazada");

      default:
        return status;
    }
  };

  // =====================================
  // CARGANDO
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
            {t("Cargando tus trabajos...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const publicados =
    data?.publicados ?? [];

  const postulados =
    data?.postulados ?? [];

  const asignados =
    data?.asignados ?? [];

  const completados =
    data?.completados ?? [];

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View
        style={styles.container}
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
              {t("Mis trabajos")}</Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {t("Administra tu actividad")}</Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* ========================= */}
        {/* RESUMEN */}
        {/* ========================= */}

        <View
          style={
            styles.summaryContainer
          }
        >
          <View
            style={
              styles.summaryItem
            }
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {data?.resumen
                .publicados ?? 0}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              {t("Publicados")}</Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.summaryItem
            }
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {data?.resumen
                .postulados ?? 0}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              {t("Postulados")}</Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.summaryItem
            }
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {data?.resumen
                .asignados ?? 0}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              {t("En curso")}</Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.summaryItem
            }
          >
            <Text
              style={
                styles.summaryNumber
              }
            >
              {data?.resumen
                .completados ?? 0}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              {t("Finalizados")}</Text>
          </View>
        </View>

        {/* ========================= */}
        {/* TABS */}
        {/* ========================= */}

        <View
          style={
            styles.tabsContainer
          }
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab ===
                'publicados' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                'publicados',
              )
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab ===
                  'publicados' &&
                  styles.activeTabText,
              ]}
            >
              {t("Publicados")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab ===
                'postulados' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                'postulados',
              )
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab ===
                  'postulados' &&
                  styles.activeTabText,
              ]}
            >
              {t("Postulados")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab ===
                'asignados' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                'asignados',
              )
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab ===
                  'asignados' &&
                  styles.activeTabText,
              ]}
            >
              {t("En curso")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab ===
                'completados' &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                'completados',
              )
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab ===
                  'completados' &&
                  styles.activeTabText,
              ]}
            >
              {t("Finalizados")}</Text>
          </TouchableOpacity>
        </View>

        {/* ========================= */}
        {/* CONTENIDO */}
        {/* ========================= */}

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
              tintColor={colors.accent}
            />
          }
        >
          {/* ===================== */}
          {/* PUBLICADOS */}
          {/* ===================== */}

          {activeTab ===
            'publicados' && (
            <>
              {publicados.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={54}
                    color={colors.muted}
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    {t("No tienes trabajos publicados")}</Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    {t("Cuando publiques un trabajo, aparecerá aquí.")}</Text>
                </View>
              ) : (
                publicados.map(
                  (job) => (
                    <TouchableOpacity
                      key={job.id}
                      style={
                        styles.card
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        abrirTrabajo(
                          job.id,
                        )
                      }
                    >
                      <View
                        style={
                          styles.cardHeader
                        }
                      >
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
                            {
                              job.category
                            }
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor:
                                getStatusColor(
                                  job.status,
                                ),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  getStatusColor(
                                    job.status,
                                  ),
                              },
                            ]}
                          >
                            {getStatusText(
                              job.expired ? 'VENCIDA' : job.status,
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.cardTitle
                        }
                      >
                        {job.title}
                      </Text>

                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.description
                        }
                      >
                        {
                          job.description
                        }
                      </Text>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="location-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            job.commune
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {formatDate(
                            job.scheduledAt,
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.cardBottom
                        }
                      >
                        <Text
                          style={
                            styles.price
                          }
                        >
                          {formatCurrency(
                            job.budget,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.applicants
                          }
                        >
                          {
                            job.applicantsCount
                          }{' '}
                          {t("postulaciones")}</Text>
                      </View>

                      {/* ================= */}
                      {/* EDITAR TRABAJO */}
                      {/* ================= */}

                      <PublicationTimestamp createdAt={job.createdAt} expiresAt={job.serviceOriginId ? undefined : job.expiresAt} expired={job.expired} style={styles.infoText} />
                      <Text style={styles.infoText}>{t(job.serviceOriginId ? 'Solicitud de servicio' : job.kind === 'SERVICIO' ? 'Servicio ofrecido' : 'Trabajo disponible')}</Text>

                      {job.status ===
                        'PUBLICADO' && !job.serviceOriginId && !job.expired && (
                        <TouchableOpacity
                          style={
                            styles.editButton
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            editarTrabajo(
                              job.id,
                            );
                          }}
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color={colors.accent}
                          />

                          <Text
                            style={
                              styles.editButtonText
                            }
                          >
                            {t("Editar trabajo")}</Text>
                        </TouchableOpacity>
                      )}

                      {job.conversationId ? (
                        <TouchableOpacity
                          style={
                            styles.chatButton
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            abrirChat(
                              job.conversationId!,
                            );
                          }}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color={colors.text}
                          />

                          <Text
                            style={
                              styles.chatButtonText
                            }
                          >
                            {t("Abrir chat")}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  ),
                )
              )}
            </>
          )}

          {/* ===================== */}
          {/* POSTULADOS */}
          {/* ===================== */}

          {activeTab ===
            'postulados' && (
            <>
              {postulados.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={54}
                    color={colors.muted}
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    {t("No tienes postulaciones")}</Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    {t("Los trabajos a los que postules aparecerán aquí.")}</Text>
                </View>
              ) : (
                postulados.map(
                  (
                    application,
                  ) => (
                    <TouchableOpacity
                      key={
                        application.applicationId
                      }
                      style={
                        styles.card
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        abrirTrabajo(
                          application
                            .job.id,
                        )
                      }
                    >
                      <View
                        style={
                          styles.cardHeader
                        }
                      >
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
                            {
                              application
                                .job
                                .category
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.applicationBadge
                          }
                        >
                          <Text
                            style={
                              styles.applicationBadgeText
                            }
                          >
                            {getApplicationText(
                              application.applicationStatus,
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.cardTitle
                        }
                      >
                        {
                          application
                            .job.title
                        }
                      </Text>

                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.description
                        }
                      >
                        {
                          application
                            .job
                            .description
                        }
                      </Text>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="person-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            application
                              .job
                              .owner
                              .name
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="location-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            application
                              .job
                              .commune
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.cardBottom
                        }
                      >
                        <Text
                          style={
                            styles.price
                          }
                        >
                          {formatCurrency(
                            application
                              .job
                              .budget,
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.jobStatus,
                            {
                              color:
                                getStatusColor(
                                  application
                                    .job
                                    .status,
                                ),
                            },
                          ]}
                        >
                          {getStatusText(
                            application
                              .job
                              .status,
                          )}
                        </Text>
                      </View>

                      {application.conversationId ? (
                        <TouchableOpacity
                          style={
                            styles.chatButton
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            abrirChat(
                              application.conversationId!,
                            );
                          }}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color={colors.text}
                          />

                          <Text
                            style={
                              styles.chatButtonText
                            }
                          >
                            {t("Abrir chat")}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  ),
                )
              )}
            </>
          )}

          {/* ===================== */}
          {/* ASIGNADOS */}
          {/* ===================== */}

          {activeTab ===
            'asignados' && (
            <>
              {asignados.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <Ionicons
                    name="hammer-outline"
                    size={54}
                    color={colors.muted}
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    {t("No tienes trabajos en curso")}</Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    {t("Los trabajos asignados o en proceso aparecerán aquí.")}</Text>
                </View>
              ) : (
                asignados.map(
                  (job) => (
                    <TouchableOpacity
                      key={
                        job.id
                      }
                      style={
                        styles.card
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        abrirTrabajo(
                          job.id,
                        )
                      }
                    >
                      <View
                        style={
                          styles.cardHeader
                        }
                      >
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
                            {
                              job.category
                            }
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor:
                                getStatusColor(
                                  job.status,
                                ),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  getStatusColor(
                                    job.status,
                                  ),
                              },
                            ]}
                          >
                            {getStatusText(
                              job.status,
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.cardTitle
                        }
                      >
                        {job.title}
                      </Text>

                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.description
                        }
                      >
                        {
                          job.description
                        }
                      </Text>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="person-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            job.participant?.name ?? job.owner.name
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="location-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            job.commune
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.cardBottom
                        }
                      >
                        <Text
                          style={
                            styles.price
                          }
                        >
                          {formatCurrency(
                            job.budget,
                          )}
                        </Text>

                        <Text
                          style={[
                            styles.jobStatus,
                            {
                              color:
                                getStatusColor(
                                  job.status,
                                ),
                            },
                          ]}
                        >
                          {getStatusText(
                            job.status,
                          )}
                        </Text>
                      </View>

                      {job.conversationId ? (
                        <TouchableOpacity
                          style={
                            styles.chatButton
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            abrirChat(
                              job.conversationId!,
                            );
                          }}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color={colors.text}
                          />

                          <Text
                            style={
                              styles.chatButtonText
                            }
                          >
                            {t("Abrir chat")}</Text>
                        </TouchableOpacity>
                      ) : null}

                      {job.status ===
                        'ASIGNADO' && (
                        <TouchableOpacity
                          style={
                            styles.startButton
                          }
                          disabled={
                            actionLoading ===
                            job.id
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            iniciarTrabajo(
                              job.id,
                            );
                          }}
                        >
                          {actionLoading ===
                          job.id ? (
                            <ActivityIndicator
                              color={colors.onPrimary}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="play-outline"
                                size={
                                  19
                                }
                                color={colors.text}
                              />

                              <Text
                                style={
                                  styles.startButtonText
                                }
                              >
                                {t("Iniciar trabajo")}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {job.status ===
                        'EN_PROCESO' && (
                        <TouchableOpacity
                          style={
                            styles.completeButton
                          }
                          disabled={
                            actionLoading ===
                            job.id
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            completarTrabajo(
                              job.id,
                            );
                          }}
                        >
                          {actionLoading ===
                          job.id ? (
                            <ActivityIndicator
                              color={colors.onPrimary}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={
                                  19
                                }
                                color={colors.text}
                              />

                              <Text
                                style={
                                  styles.completeButtonText
                                }
                              >
                                {t("Completar trabajo")}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ),
                )
              )}
            </>
          )}

          {/* ===================== */}
          {/* COMPLETADOS */}
          {/* ===================== */}

          {activeTab ===
            'completados' && (
            <>
              {completados.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={54}
                    color={colors.muted}
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    {t("No tienes trabajos finalizados")}</Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    {t("Los trabajos completados aparecerán aquí.")}</Text>
                </View>
              ) : (
                completados.map(
                  (job) => (
                    <TouchableOpacity
                      key={
                        job.id
                      }
                      style={
                        styles.card
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        abrirTrabajo(
                          job.id,
                        )
                      }
                    >
                      <View
                        style={
                          styles.cardHeader
                        }
                      >
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
                            {
                              job.category
                            }
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderColor:
                                colors.successText,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  colors.successText,
                              },
                            ]}
                          >
                            {t("Completado")}</Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.cardTitle
                        }
                      >
                        {job.title}
                      </Text>

                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.description
                        }
                      >
                        {
                          job.description
                        }
                      </Text>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="person-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            job.participant?.name ?? job.owner.name
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Ionicons
                          name="location-outline"
                          size={17}
                          color={colors.muted}
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                        >
                          {
                            job.commune
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.cardBottom
                        }
                      >
                        <Text
                          style={
                            styles.price
                          }
                        >
                          {formatCurrency(
                            job.budget,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.completedText
                          }
                        >
                          {t("Finalizado")}</Text>
                      </View>

                      {job.conversationId ? (
                        <TouchableOpacity
                          style={
                            styles.chatButton
                          }
                          onPress={(
                            event,
                          ) => {
                            event.stopPropagation();

                            abrirChat(
                              job.conversationId!,
                            );
                          }}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color={colors.text}
                          />

                          <Text
                            style={
                              styles.chatButtonText
                            }
                          >
                            {t("Abrir chat")}</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={
                          styles.reviewButton
                        }
                        onPress={(
                          event,
                        ) => {
                          event.stopPropagation();

                          calificarTrabajo(
                            job.id,
                          );
                        }}
                      >
                        <Ionicons
                          name="star-outline"
                          size={18}
                          color={colors.warningText}
                        />

                        <Text
                          style={
                            styles.reviewButtonText
                          }
                        >
                          {t("Calificar servicio")}</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ),
                )
              )}
            </>
          )}

          <View
            style={{
              height: 30,
            }}
          />
        </ScrollView>
      </View>
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
    },

    headerTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '900',
    },

    headerSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },

    headerSpacer: {
      width: 44,
    },

    summaryContainer: {
      marginHorizontal: 18,
      marginBottom: 18,
      paddingVertical: 18,
      paddingHorizontal: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },

    summaryNumber: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },

    summaryLabel: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
      textAlign: 'center',
    },

    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        colors.surface,
    },

    tabsContainer: {
      marginHorizontal: 18,
      padding: 4,
      borderRadius: 14,
      backgroundColor:
        colors.background,
      borderWidth: 1,
      borderColor:
        colors.border,
      flexDirection: 'row',
      marginBottom: 12,
    },

    tab: {
      flex: 1,
      minHeight: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 3,
    },

    activeTab: {
      backgroundColor:
        colors.surface,
    },

    tabText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
    },

    activeTabText: {
      color: colors.text,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 8,
    },

    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      padding: 17,
      marginBottom: 14,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 13,
    },

    categoryBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor:
        colors.accentSoft,
    },

    categoryText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
    },

    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },

    statusText: {
      fontSize: 10,
      fontWeight: '800',
    },

    applicationBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor:
        'rgba(245, 158, 11, 0.10)',
      borderWidth: 1,
      borderColor:
        colors.warningText,
    },

    applicationBadgeText: {
      color: colors.warningText,
      fontSize: 10,
      fontWeight: '800',
    },

    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 8,
    },

    description: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 8,
    },

    infoText: {
      color: colors.muted,
      fontSize: 12,
      flex: 1,
    },

    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginTop: 8,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    price: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },

    applicants: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },

    jobStatus: {
      fontSize: 12,
      fontWeight: '800',
    },

    completedText: {
      color: colors.successText,
      fontSize: 12,
      fontWeight: '800',
    },

    // =====================================
    // NUEVO: EDITAR TRABAJO
    // =====================================

    editButton: {
      height: 44,
      marginTop: 16,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        colors.accent,
      backgroundColor:
        colors.accentSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },

    editButtonText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
    },

    chatButton: {
      height: 44,
      marginTop: 12,
      borderRadius: 13,
      backgroundColor:
        colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },

    chatButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },

    startButton: {
      height: 46,
      marginTop: 12,
      borderRadius: 13,
      backgroundColor:
        colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },

    startButtonText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '900',
    },

    completeButton: {
      height: 46,
      marginTop: 12,
      borderRadius: 13,
      backgroundColor:
        colors.success,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },

    completeButtonText: {
      color: colors.onColor,
      fontSize: 13,
      fontWeight: '900',
    },

    reviewButton: {
      height: 44,
      marginTop: 12,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        colors.warningText,
      backgroundColor:
        'rgba(251, 191, 36, 0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },

    reviewButtonText: {
      color: colors.warningText,
      fontSize: 13,
      fontWeight: '800',
    },

    emptyContainer: {
      alignItems: 'center',
      justifyContent:
        'center',
      paddingVertical: 70,
      paddingHorizontal: 30,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
      marginTop: 18,
    },

    emptyText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 30,
    },

    loadingText: {
      color: colors.muted,
      fontSize: 14,
      marginTop: 14,
    },
  });
