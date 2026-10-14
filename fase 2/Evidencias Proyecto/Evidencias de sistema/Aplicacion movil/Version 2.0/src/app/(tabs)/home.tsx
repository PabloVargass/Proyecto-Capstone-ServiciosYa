import { PublicationSearchFilters } from '@/components/publication-search-filters';
import { defaultPublicationFilters, filterPublications, publicationAffinity, type PublicationFilters } from '@/services/publication-search';
import { PublicationTimestamp } from '@/components/publication-timestamp';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

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

export default function HomeScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sendingInterestId, setSendingInterestId] =
    useState<string | null>(null);

  const [descartados, setDescartados] =
    useState<string[]>([]);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [filters, setFilters] = useState<PublicationFilters>({ ...defaultPublicationFilters });
  const [draftFilters, setDraftFilters] = useState<PublicationFilters>({ ...defaultPublicationFilters });
  const [categories, setCategories] = useState<string[]>([]);

  const loadHome = async () => {
    try {
      const storedUser =
        await SecureStore.getItemAsync('user');

      let currentUser: User | null = null;

      if (storedUser) {
        currentUser = JSON.parse(storedUser);
        setUser(currentUser);
      }

      const responses = await Promise.all(['OPORTUNIDAD', 'SERVICIO'].map(kind => fetch(`${API_URL}/jobs?kind=${kind}`)));
      if (responses.some(response => !response.ok)) throw new Error(t('No se pudieron cargar los trabajos.'));
      const data: Job[] = (await Promise.all(responses.map(response => response.json()))).flat();
      let catalog: string[] = [];
      try { const response = await fetch(`${API_URL}/jobs/categories`); if (response.ok) catalog = await response.json(); } catch { /* Conserva las categorías de las publicaciones si el catálogo no responde. */ }
      setCategories([...new Set([...catalog, ...data.map(job => job.category)])].sort((a, b) => a.localeCompare(b, locale)));

      const trabajosDisponibles =
        currentUser
          ? data.filter(
              (job) =>
                job.ownerId !== currentUser?.id &&
                job.status === 'PUBLICADO',
            )
          : data.filter(
              (job) =>
                job.status === 'PUBLICADO',
            );

      setJobs(trabajosDisponibles);
    } catch (error) {
      console.error(
        'Error cargando inicio:',
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
      loadHome();
    }, [t, locale]),
  );

  const calcularAfinidad = publicationAffinity;
  const trabajosFiltrados = useMemo(() => filterPublications(jobs, filters, descartados), [jobs, filters, descartados]);

  const recomendados =
    trabajosFiltrados.slice(0, 6);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHome();
  };

  const abrirTrabajo = (
    jobId: string,
  ) => {
    router.push({
      pathname: '/job/[id]',
      params: {
        id: jobId,
      },
    });
  };

  const handlePass = (
    jobId: string,
  ) => {
    setDescartados((previous) => [
      ...previous,
      jobId,
    ]);
  };

  const handleInterested = async (
    job: Job,
  ) => {
    if (job.kind === 'SERVICIO') { abrirTrabajo(job.id); return; }
    if (sendingInterestId) {
      return;
    }

    try {
      setSendingInterestId(job.id);

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

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 409
        ) {
          Alert.alert(
            t("Ya postulaste"),
            t("Ya habías mostrado interés en este trabajo."),
            [
              {
                text: 'Continuar',
                onPress: () =>
                  handlePass(job.id),
              },
            ],
          );

          return;
        }

        throw new Error(
          Array.isArray(
            data.message,
          )
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
            onPress: () =>
              handlePass(job.id),
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
      setSendingInterestId(null);
    }
  };

  const limpiarFiltros = () => {
    setFilters({ ...defaultPublicationFilters });
    setDraftFilters({ ...defaultPublicationFilters });
  };
  const abrirBusqueda = () => router.push({ pathname: '/(tabs)/search', params: { filters: JSON.stringify(filters) } });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <Text style={styles.greeting}>
          {t("Hola")}{user?.name
            ? `, ${user.name}`
            : ''}{' '}
          👋
        </Text>

        <Text style={styles.title}>
          {t(filters.type === 'OPORTUNIDAD' ? 'Trabajos disponibles' : filters.type === 'SERVICIO' ? 'Servicios ofrecidos' : 'Servicios disponibles')}</Text>

        <Text style={styles.subtitle}>
          {t('Encuentra servicios ofrecidos y trabajos para postular.')}</Text>

        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.searchBox}
            activeOpacity={0.8}
            onPress={abrirBusqueda}
          >
            <Text
              style={styles.searchIcon}
            >
              ⌕
            </Text>

            <Text
              style={
                styles.searchPlaceholder
              }
            >
              {t(filters.type === 'OPORTUNIDAD' ? 'Buscar trabajos' : 'Buscar servicios')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => { setDraftFilters({ ...filters }); setModalVisible(true); }}
          >
            <Text
              style={styles.filterIcon}
            >
              ⚙
            </Text>
          </TouchableOpacity>
        </View>

        {filters.featured && <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              {t("Recomendados para ti")}</Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {t("Ordenados según afinidad.")}</Text>
          </View>

          <Text
            style={styles.resultCount}
          >
            {trabajosFiltrados.length}
          </Text>
        </View>}

        {loading ? (
          <View
            style={styles.loadingCard}
          >
            <ActivityIndicator
              size="large"
            />

            <Text
              style={styles.loadingText}
            >
              {t('Buscando publicaciones...')}</Text>
          </View>
        ) : recomendados.length === 0 ? (
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
              {t('No hay publicaciones para estos filtros')}</Text>

            <Text
              style={styles.emptyText}
            >
              {t("Cambia los filtros o vuelve más tarde.")}</Text>

            <TouchableOpacity
              style={
                styles.resetButton
              }
              onPress={() => {
                limpiarFiltros();
                setDescartados([]);
              }}
            >
              <Text
                style={
                  styles.resetButtonText
                }
              >
                {t("Mostrar nuevamente")}</Text>
            </TouchableOpacity>
          </View>
        ) : filters.featured ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.cardsContainer
            }
          >
            {recomendados.map(
              (job) => {
                const afinidad =
                  calcularAfinidad(job);

                return (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobCard}
                    activeOpacity={0.9}
                    onPress={() =>
                      abrirTrabajo(
                        job.id,
                      )
                    }
                  >
                    <View
                      style={
                        styles.cardTop
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
                          numberOfLines={
                            1
                          }
                        >
                          {
                            job.category
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.affinityContainer
                        }
                      >
                        <Text
                          style={
                            styles.affinityNumber
                          }
                        >
                          {afinidad}%
                        </Text>

                        <Text
                          style={
                            styles.affinityText
                          }
                        >
                          {t("AFINIDAD")}</Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.jobTitle
                      }
                      numberOfLines={2}
                    >
                      {job.title}
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                      numberOfLines={2}
                    >
                      {job.description}
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
                        {job.commune} · {t(job.kind === 'SERVICIO' ? 'Ofrece servicio' : 'Solicita servicio')}
                      </Text>

                      <Text
                        style={
                          styles.info
                        }
                      >
                        👤{' '}
                        {job.owner.name}
                      </Text>
                      <PublicationTimestamp createdAt={job.createdAt} expiresAt={job.expiresAt} expired={job.expired} style={styles.info} />
                    </View>

                    <View
                      style={
                        styles.budgetContainer
                      }
                    >
                      <Text
                        style={
                          styles.budgetLabel
                        }
                      >
                        {t(job.kind === 'SERVICIO' ? 'Precio propuesto' : 'Presupuesto')}</Text>

                      <Text
                        style={
                          styles.budget
                        }
                      >
                        $
                        {job.budget.toLocaleString(
                          locale,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.actions
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.passButton,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();

                          handlePass(
                            job.id,
                          );
                        }}
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
                        style={[
                          styles.actionButton,
                          styles.likeButton,
                        ]}
                        disabled={
                          sendingInterestId ===
                          job.id
                        }
                        onPress={(event) => {
                          event.stopPropagation();

                          handleInterested(
                            job,
                          );
                        }}
                      >
                        {sendingInterestId ===
                        job.id ? (
                          <ActivityIndicator
                            color={colors.onPrimary}
                          />
                        ) : (
                          <Text
                            style={
                              styles.likeIcon
                            }
                          >
                            {job.kind === 'SERVICIO' ? '→' : '♥'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
        ) : null}

        <View
          style={styles.nearbyHeader}
        >
          <Text
            style={styles.sectionTitle}
          >
            {t('Resultados de búsqueda')}</Text>

          <TouchableOpacity
            onPress={abrirBusqueda}
          >
            <Text
              style={styles.seeAll}
            >
              {t("Ver todos")}</Text>
          </TouchableOpacity>
        </View>

        {trabajosFiltrados
          .slice(0, filters.featured ? 4 : 20)
          .map((job) => (
            <TouchableOpacity
              key={`near-${job.id}`}
              style={styles.nearbyCard}
              onPress={() =>
                abrirTrabajo(job.id)
              }
            >
              <View
                style={
                  styles.nearbyIcon
                }
              >
                <Text
                  style={
                    styles.nearbyIconText
                  }
                >
                  {job.category
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View
                style={
                  styles.nearbyContent
                }
              >
                <Text
                  style={
                    styles.nearbyTitle
                  }
                  numberOfLines={1}
                >
                  {job.title}
                </Text>

                <Text
                  style={
                    styles.nearbyLocation
                  }
                >
                  📍 {job.commune}
                </Text>
                <PublicationTimestamp createdAt={job.createdAt} expiresAt={job.expiresAt} expired={job.expired} style={styles.nearbyLocation} />
              </View>

              <View
                style={
                  styles.nearbyRight
                }
              >
                <Text
                  style={
                    styles.nearbyBudget
                  }
                >
                  $
                  {job.budget.toLocaleString(
                    locale,
                  )}
                </Text>

                <Text
                  style={
                    styles.nearbyArrow
                  }
                >
                  ›
                </Text>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {t('Filtrar servicios')}</Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {t('Encuentra ofertas y solicitudes relevantes para ti.')}</Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={
                false
              }
            >
              <PublicationSearchFilters key={modalVisible ? 'visible' : 'hidden'} value={draftFilters} onChange={setDraftFilters} categories={categories} />
            </ScrollView>

            <View
              style={styles.modalActions}
            >
              <TouchableOpacity
                style={
                  styles.clearButton
                }
                onPress={() => setDraftFilters({ ...defaultPublicationFilters })}
              >
                <Text
                  style={
                    styles.clearButtonText
                  }
                >
                  {t("Limpiar")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.applyButton
                }
                onPress={() => { setFilters({ ...draftFilters }); setModalVisible(false); }}
              >
                <Text
                  style={
                    styles.applyButtonText
                  }
                >
                  {t("Aplicar filtros")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    paddingTop: 64,
    paddingBottom: 120,
  },

  greeting: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 22,
  },

  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    paddingHorizontal: 22,
    marginTop: 8,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 22,
    marginTop: 9,
  },

  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    marginTop: 23,
    gap: 10,
  },

  searchBox: {
    flex: 1,
    height: 53,
    backgroundColor: colors.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  searchIcon: {
    color: colors.accent,
    fontSize: 24,
  },

  searchPlaceholder: {
    color: colors.muted,
    fontSize: 14,
    marginLeft: 10,
  },

  filterButton: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterIcon: {
    color: colors.text,
    fontSize: 21,
  },

  sectionHeader: {
    paddingHorizontal: 22,
    marginTop: 29,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  resultCount: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },

  loadingCard: {
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },

  loadingText: {
    color: colors.muted,
    marginTop: 12,
  },

  emptyCard: {
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
  },

  resetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 13,
    marginTop: 17,
  },

  resetButtonText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },

  cardsContainer: {
    paddingHorizontal: 22,
    gap: 13,
    paddingBottom: 4,
  },

  jobCard: {
    width: 235,
    minHeight: 342,
    backgroundColor: colors.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  categoryBadge: {
    maxWidth: 125,
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  categoryText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },

  affinityContainer: {
    alignItems: 'flex-end',
  },

  affinityNumber: {
    color: colors.successText,
    fontSize: 18,
    fontWeight: '900',
  },

  affinityText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  jobTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    marginTop: 18,
  },

  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  infoContainer: {
    marginTop: 14,
    gap: 5,
  },

  info: {
    color: colors.muted,
    fontSize: 12,
  },

  budgetContainer: {
    marginTop: 16,
  },

  budgetLabel: {
    color: colors.muted,
    fontSize: 10,
  },

  budget: {
    color: colors.accent,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 'auto',
    paddingTop: 15,
  },

  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  likeButton: {
    backgroundColor: colors.primary,
  },

  passIcon: {
    color: colors.dangerText,
    fontSize: 24,
  },

  likeIcon: {
    color: colors.onPrimary,
    fontSize: 24,
  },

  nearbyHeader: {
    marginTop: 31,
    marginBottom: 13,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  seeAll: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  nearbyCard: {
    marginHorizontal: 22,
    marginBottom: 10,
    minHeight: 78,
    backgroundColor: colors.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  nearbyIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nearbyIconText: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: '900',
  },

  nearbyContent: {
    flex: 1,
    marginLeft: 11,
  },

  nearbyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  nearbyLocation: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },

  nearbyRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  nearbyBudget: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '900',
  },

  nearbyArrow: {
    color: colors.muted,
    fontSize: 24,
    marginTop: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    maxHeight: '84%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 19,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: colors.secondary,
    fontSize: 17,
  },

  filterLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 9,
  },

  filterInput: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
  },

  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },

  priceInput: {
    flex: 1,
  },

  orderOptions: {
    gap: 8,
  },

  orderButton: {
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  orderButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  orderText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  orderTextActive: {
    color: colors.accent,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  clearButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearButtonText: {
    color: colors.secondary,
    fontWeight: '700',
  },

  applyButton: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  applyButtonText: {
    color: colors.onPrimary,
    fontWeight: '800',
  },
});
