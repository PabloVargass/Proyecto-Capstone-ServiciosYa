import { PublicationTimestamp } from '@/components/publication-timestamp';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ExploreTab =
  | 'opportunities'
  | 'services'
  | 'people';

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

type DiscoverUser = {
  id: string;
  name: string;
  memberSince: string;
  rating: number | null;
  completedJobs: number;
  reviewsCount: number;
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
};

export default function ExploreScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ExploreTab>(
      'opportunities',
    );

  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [services, setServices] = useState<Job[]>([]);

  const [users, setUsers] =
    useState<DiscoverUser[]>([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    sendingInterest,
    setSendingInterest,
  ] = useState(false);

  const [search, setSearch] =
    useState('');

  const loadJobs = async () => {
    const response = await fetch(
      `${API_URL}/jobs`,
    );

    if (!response.ok) {
      throw new Error(
        t("No se pudieron cargar los trabajos disponibles."),
      );
    }

    const data: Job[] =
      await response.json();

    const storedUser =
      await SecureStore.getItemAsync(
        'user',
      );

    let currentUserId:
      | string
      | null = null;

    if (storedUser) {
      const user: StoredUser =
        JSON.parse(storedUser);

      currentUserId =
        user.id;
    }

    const availableJobs =
      currentUserId
        ? data.filter(
            (job) =>
              job.ownerId !==
              currentUserId,
          )
        : data;

    setJobs(availableJobs);

    setCurrentIndex(0);
  };

  const loadServices = async () => {
    const response = await fetch(`${API_URL}/jobs?kind=SERVICIO`);
    if (!response.ok) throw Error('No se pudieron cargar los servicios.');
    setServices(await response.json());
  };

  const loadUsers = async () => {
    const response =
      await fetch(
        `${API_URL}/users`,
      );

    if (!response.ok) {
      throw new Error(
        t("No se pudieron cargar los usuarios."),
      );
    }

    const data: DiscoverUser[] =
      await response.json();

    setUsers(data);
  };

  const loadData = async () => {
    try {
      await Promise.all([
        loadJobs(),
        loadUsers(),
        loadServices(),
      ]);
    } catch (error) {
      console.error(
        'Error cargando Explorar:',
        error,
      );

      Alert.alert(
        t("Error"),
        t("No se pudo cargar la información de Explorar."),
      );
    } finally {
      setLoading(false);

      setRefreshing(
        false,
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [t, locale]),
  );

  const currentJob =
    jobs[currentIndex];

  const filteredUsers =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return users;
      }

      return users.filter(
        (user) =>
          user.name
            .toLowerCase()
            .includes(text),
      );
    }, [users, search, t, locale]);

  const handleRefresh = () => {
    setRefreshing(true);

    loadData();
  };

  const handlePass = () => {
    setCurrentIndex(
      (previous) =>
        previous + 1,
    );
  };

  const handleDetails = () => {
    if (!currentJob) {
      return;
    }

    router.push({
      pathname:
        '/job/[id]',

      params: {
        id:
          currentJob.id,
      },
    });
  };

  const handleInterested =
    async () => {
      if (
        !currentJob ||
        sendingInterest
      ) {
        return;
      }

      try {
        setSendingInterest(
          true,
        );

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

        const response =
          await fetch(
            `${API_URL}/postulaciones`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify(
                  {
                    trabajoId:
                      currentJob.id,
                  },
                ),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (
            response.status ===
            409
          ) {
            Alert.alert(
              t("Ya postulaste"),
              t("Ya habías mostrado interés en este trabajo disponible."),
              [
                {
                  text:
                    'Continuar',

                  onPress:
                    () =>
                      setCurrentIndex(
                        (
                          previous,
                        ) =>
                          previous +
                          1,
                      ),
                },
              ],
            );

            return;
          }

          throw new Error(
            Array.isArray(
              data.message,
            )
              ? data.message.join(
                  ', ',
                )
              : data.message ||
                  t("No se pudo enviar la postulación."),
          );
        }

        Alert.alert(
          t("❤️ Interés enviado"),
          t(`Tu postulación a "${currentJob.title}" fue enviada correctamente.`),
          [
            {
              text:
                'Continuar',

              onPress:
                () =>
                  setCurrentIndex(
                    (
                      previous,
                    ) =>
                      previous +
                      1,
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
          t("No se pudo enviar tu postulación."),
        );
      } finally {
        setSendingInterest(
          false,
        );
      }
    };

  const openProfile = (
    id: string,
  ) => {
    router.push({
      pathname:
        '/user/[id]',

      params: {
        id,
      },
    });
  };

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          {t("Cargando Explorar...")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
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
            handleRefresh
          }
        />
      }
    >
      <Text
        style={styles.title}
      >
        {t("Explorar")}</Text>

      <Text
        style={
          styles.subtitle
        }
      >
        {t("Encuentra trabajos disponibles, servicios y personas dentro de la plataforma.")}</Text>

      <View
        style={
          styles.tabsContainer
        }
      >
        <ExploreTabButton
          title={t("Trabajos disponibles")}
          active={
            activeTab ===
            'opportunities'
          }
          onPress={() => {
            setActiveTab(
              'opportunities',
            );

            setSearch('');
          }}
        />

        <ExploreTabButton
          title={t("Servicios")}
          active={
            activeTab ===
            'services'
          }
          onPress={() => {
            setActiveTab(
              'services',
            );

            setSearch('');
          }}
        />

        <ExploreTabButton
          title={t("Personas")}
          active={
            activeTab ===
            'people'
          }
          onPress={() => {
            setActiveTab(
              'people',
            );

            setSearch('');
          }}
        />
      </View>

      {activeTab ===
        'opportunities' && (
        <>
          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {t("Trabajos disponibles")}</Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {t("Trabajos disponibles para postular ahora.")}</Text>
            </View>

            <Text
              style={
                styles.countText
              }
            >
              {jobs.length}
            </Text>
          </View>

          {currentJob ? (
            <>
              <View
                style={
                  styles.jobCard
                }
              >
                <View
                  style={
                    styles.jobTop
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
                        currentJob.category
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.availableBadge
                    }
                  >
                    <Text
                      style={
                        styles.availableText
                      }
                    >
                      {t("Disponible")}</Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.jobTitle
                  }
                >
                  {
                    currentJob.title
                  }
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  {
                    currentJob.description
                  }
                </Text>

                <View
                  style={
                    styles.infoContainer
                  }
                >
                  <Text
                    style={
                      styles.info
                    }
                  >
                    📍{' '}
                    {
                      currentJob.commune
                    }
                  </Text>

                  <Text
                    style={
                      styles.info
                    }
                  >
                    👤{' '}
                    {
                      currentJob.owner
                        .name
                    }
                  </Text>
                  <PublicationTimestamp createdAt={currentJob.createdAt} expiresAt={currentJob.expiresAt} expired={currentJob.expired} style={styles.info} />
                </View>

                <Text
                  style={
                    styles.budgetLabel
                  }
                >
                  {t("Presupuesto")}</Text>

                <Text
                  style={
                    styles.budget
                  }
                >
                  $
                  {currentJob.budget.toLocaleString(
                    locale,
                  )}
                </Text>

                <Text
                  style={
                    styles.counter
                  }
                >
                  {currentIndex +
                    1}{' '}
                  {t("de")}{' '}{jobs.length}
                </Text>
              </View>

              <View
                style={
                  styles.jobActions
                }
              >
                <TouchableOpacity
                  style={[
                    styles.roundButton,
                    styles.passButton,
                  ]}
                  onPress={
                    handlePass
                  }
                >
                  <Text
                    style={
                      styles.passIcon
                    }
                  >
                    ✕
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.detailsButton
                  }
                  onPress={
                    handleDetails
                  }
                >
                  <Text
                    style={
                      styles.detailsText
                    }
                  >
                    {t("Ver detalles")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roundButton,
                    styles.likeButton,
                  ]}
                  onPress={
                    handleInterested
                  }
                  disabled={
                    sendingInterest
                  }
                >
                  {sendingInterest ? (
                    <ActivityIndicator
                      color={colors.onPrimary}
                    />
                  ) : (
                    <Text
                      style={
                        styles.likeIcon
                      }
                    >
                      ♥
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                🎉
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {t("Estás al día")}</Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {t("Ya revisaste todos los trabajos disponibles.")}</Text>

              <TouchableOpacity
                style={
                  styles.reloadButton
                }
                onPress={
                  loadJobs
                }
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
        </>
      )}

      {activeTab === 'services' && <>
        <View style={styles.sectionHeader}><View>
          <Text style={styles.sectionTitle}>{t('Servicios')}</Text>
          <Text style={styles.sectionSubtitle}>{t('Encuentra personas que ofrecen lo que necesitas.')}</Text>
        </View></View>
        {services.length === 0 ? <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('No hay servicios disponibles')}</Text>
          <Text style={styles.emptyText}>{t('Aquí aparecerán los servicios ofrecidos por los usuarios.')}</Text>
        </View> : [...new Map(services.map(service => [service.ownerId, service.owner])).values()].map(provider =>
          <TouchableOpacity key={provider.id} style={styles.userCard} onPress={() => router.push({ pathname: '/services/[id]', params: { id: provider.id } })}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{provider.name.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{provider.name}</Text>
              <Text style={styles.sectionSubtitle}>{services.filter(service => service.ownerId === provider.id).length} {t('servicios disponibles')}</Text>
              <Text style={styles.rating}>{t('Ver servicios')} →</Text>
            </View>
          </TouchableOpacity>)}
      </>}

      {activeTab ===
        'people' && (
        <>
          <View
            style={
              styles.searchContainer
            }
          >
            <Text
              style={
                styles.searchIcon
              }
            >
              🔎
            </Text>

            <TextInput
              style={
                styles.searchInput
              }
              placeholder={t("Buscar persona...")}
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={
                setSearch
              }
            />
          </View>

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {t("Personas")}</Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {t("Revisa perfiles y reputación.")}</Text>
            </View>

            <Text
              style={
                styles.countText
              }
            >
              {
                filteredUsers.length
              }
            </Text>
          </View>

          {filteredUsers.length ? (
            filteredUsers.map(
              (user) => (
                <TouchableOpacity
                  key={user.id}
                  style={
                    styles.userCard
                  }
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    openProfile(
                      user.id,
                    )
                  }
                >
                  <View
                    style={
                      styles.avatar
                    }
                  >
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

                  <View
                    style={
                      styles.userInfo
                    }
                  >
                    <Text
                      style={
                        styles.userName
                      }
                    >
                      {user.name}
                    </Text>

                    <View
                      style={
                        styles.statsRow
                      }
                    >
                      <Text
                        style={
                          styles.rating
                        }
                      >
                        {user.rating !==
                        null
                          ? `⭐ ${user.rating.toFixed(
                              1,
                            )}`
                          : t("⭐ Sin reseñas")}
                      </Text>

                      <Text
                        style={
                          styles.dot
                        }
                      >
                        •
                      </Text>

                      <Text
                        style={
                          styles.smallStat
                        }
                      >
                        {
                          user.completedJobs
                        }{' '}
                        {t("trabajos")}</Text>
                    </View>

                    <Text
                      style={
                        styles.reviewsText
                      }
                    >
                      {
                        user.reviewsCount
                      }{' '}
                      {t("reseñas")}</Text>
                  </View>

                  <Text
                    style={
                      styles.arrow
                    }
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              ),
            )
          ) : (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                🔍
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {t("No encontramos personas")}</Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {t("Prueba con otro nombre.")}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function ExploreTabButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        active &&
          styles.tabButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.tabButtonText,
          active &&
            styles.tabButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
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
    },

    loadingText: {
      color: colors.muted,
      marginTop: 14,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 55,
      paddingBottom: 120,
    },

    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '900',
    },

    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 7,
    },

    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 4,
      marginTop: 22,
    },

    tabButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },

    tabButtonActive: {
      backgroundColor: colors.primary,
    },

    tabButtonText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
    },

    tabButtonTextActive: {
      color: colors.onPrimary,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 27,
      marginBottom: 14,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },

    sectionSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 3,
    },

    countText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '800',
    },

    jobCard: {
      backgroundColor: colors.surface,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      minHeight: 390,
    },

    jobTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
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

    availableBadge: {
      backgroundColor:
        'rgba(34, 197, 94, 0.12)',
      borderRadius: 20,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },

    availableText: {
      color: colors.successText,
      fontSize: 10,
      fontWeight: '800',
    },

    jobTitle: {
      color: colors.text,
      fontSize: 27,
      fontWeight: '800',
      marginTop: 22,
    },

    description: {
      color: colors.secondary,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 14,
    },

    infoContainer: {
      marginTop: 24,
      gap: 10,
    },

    info: {
      color: colors.muted,
      fontSize: 14,
    },

    budgetLabel: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 26,
    },

    budget: {
      color: colors.accent,
      fontSize: 30,
      fontWeight: '900',
      marginTop: 3,
    },

    counter: {
      color: colors.muted,
      fontSize: 11,
      textAlign: 'right',
      marginTop: 18,
    },

    jobActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginTop: 18,
    },

    roundButton: {
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

    likeButton: {
      backgroundColor: colors.primary,
    },

    passIcon: {
      color: colors.dangerText,
      fontSize: 28,
    },

    likeIcon: {
      color: colors.onPrimary,
      fontSize: 28,
    },

    detailsButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    detailsText: {
      color: colors.secondary,
      fontWeight: '700',
      fontSize: 13,
    },

    searchContainer: {
      height: 52,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      marginTop: 25,
    },

    searchIcon: {
      fontSize: 16,
      marginRight: 8,
    },

    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },

    userCard: {
      backgroundColor: colors.surface,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 11,
    },

    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatarText: {
      color: colors.onPrimary,
      fontSize: 22,
      fontWeight: '900',
    },

    userInfo: {
      flex: 1,
      marginLeft: 14,
    },

    userName: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },

    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },

    rating: {
      color: colors.warningText,
      fontSize: 12,
      fontWeight: '700',
    },

    dot: {
      color: colors.muted,
      marginHorizontal: 7,
    },

    smallStat: {
      color: colors.muted,
      fontSize: 12,
    },

    reviewsText: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },

    arrow: {
      color: colors.muted,
      fontSize: 29,
      marginLeft: 8,
    },

    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 30,
      alignItems: 'center',
    },

    emptyIcon: {
      fontSize: 39,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 13,
      textAlign: 'center',
    },

    emptyText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 7,
    },

    reloadButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 13,
      marginTop: 20,
    },

    reloadButtonText: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
  });
