import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';

type Postulacion = {
  id: string;
  estado: string;
  createdAt: string;

  usuario: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };

  trabajo: {
    id: string;
    title: string;
    description: string;
    category: string;
    commune: string;
    budget: number;
    status: string;
  };
};

type Conversacion = {
  id: string;

  trabajo: {
    id: string;
    title: string;
    commune: string;
    budget: number;
    status: string;
  };

  usuario: {
    id: string;
    name: string;
  };

  ultimoMensaje: {
    id: string;
    contenido: string;
    createdAt: string;
    remitenteId: string;
  } | null;

  updatedAt: string;
};

export default function MessagesScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const [activeTab, setActiveTab] =
    useState<'solicitudes' | 'chats'>('solicitudes');

  const [postulaciones, setPostulaciones] =
    useState<Postulacion[]>([]);

  const [conversaciones, setConversaciones] =
    useState<Conversacion[]>([]);

  const [loadingSolicitudes, setLoadingSolicitudes] =
    useState(true);

  const [loadingChats, setLoadingChats] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const loadPostulaciones = async () => {
    try {
      setLoadingSolicitudes(true);

      const token =
        await SecureStore.getItemAsync('accessToken');

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/postulaciones/recibidas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t("No se pudieron cargar las solicitudes."),
        );
      }

      const pendientes = data.filter(
        (postulacion: Postulacion) =>
          postulacion.estado === 'PENDIENTE',
      );

      setPostulaciones(pendientes);
    } catch (error) {
      console.error(
        'Error cargando solicitudes:',
        error,
      );
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  const loadConversaciones = async () => {
    try {
      setLoadingChats(true);

      const token =
        await SecureStore.getItemAsync('accessToken');

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/conversaciones`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t("No se pudieron cargar las conversaciones."),
        );
      }

      setConversaciones(data);
    } catch (error) {
      console.error(
        'Error cargando conversaciones:',
        error,
      );
    } finally {
      setLoadingChats(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPostulaciones();
      loadConversaciones();
    }, [t, locale]),
  );

  const handleAceptar = async (
    postulacion: Postulacion,
  ) => {
    try {
      setProcessingId(postulacion.id);

      const token =
        await SecureStore.getItemAsync('accessToken');

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/postulaciones/${postulacion.id}/aceptar`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t("No se pudo seleccionar la solicitud."),
        );
      }

      Alert.alert(
        t("🎉 ¡Match!"),
        t('Seleccionaste a {name} para "{job}".\n\nAhora podrán conversar.', { name: postulacion.usuario.name, job: postulacion.trabajo.title }),
      );

      await loadPostulaciones();
      await loadConversaciones();

      setActiveTab('chats');
    } catch (error) {
      console.error(
        'Error seleccionando solicitud:',
        error,
      );

      Alert.alert(
        t("Error"),
        t("No se pudo seleccionar la solicitud."),
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRechazar = (
    postulacion: Postulacion,
  ) => {
    Alert.alert(
      t("Rechazar solicitud"),
      t('¿Quieres rechazar la solicitud de {name}?', { name: postulacion.usuario.name }),
      [
        {
          text: t("Cancelar"),
          style: 'cancel',
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(postulacion.id);

              const token =
                await SecureStore.getItemAsync(
                  'accessToken',
                );

              if (!token) {
                return;
              }

              const response = await fetch(
                `${API_URL}/postulaciones/${postulacion.id}/rechazar`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              const data =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message ||
                    t("No se pudo rechazar la solicitud."),
                );
              }

              await loadPostulaciones();
            } catch (error) {
              console.error(
                'Error rechazando solicitud:',
                error,
              );

              Alert.alert(
                t("Error"),
                t("No se pudo rechazar la solicitud."),
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("Mensajes")}</Text>

        <Text style={styles.subtitle}>
          {t("Gestiona solicitudes y conversaciones.")}</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'solicitudes' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setActiveTab('solicitudes')
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'solicitudes' &&
                styles.activeTabText,
            ]}
          >
            {t("Solicitudes")}{postulaciones.length > 0
              ? ` (${postulaciones.length})`
              : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'chats' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setActiveTab('chats')
          }
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'chats' &&
                styles.activeTabText,
            ]}
          >
            {t("Chats")}{conversaciones.length > 0
              ? ` (${conversaciones.length})`
              : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'solicitudes' ? (
        loadingSolicitudes ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>
              {t("Cargando solicitudes...")}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {postulaciones.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>
                  💌
                </Text>

                <Text style={styles.emptyTitle}>
                  {t("Sin solicitudes pendientes")}</Text>

                <Text style={styles.emptyText}>
                  {t("Cuando alguien muestre interés en uno de tus trabajos, aparecerá aquí.")}</Text>
              </View>
            ) : (
              postulaciones.map(
                (postulacion) => (
                  <View
                    key={postulacion.id}
                    style={styles.card}
                  >
                    <View
                      style={
                        styles.cardHeader
                      }
                    >
                      <View
                        style={styles.avatar}
                      >
                        <Text
                          style={
                            styles.avatarText
                          }
                        >
                          {postulacion.usuario.name
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={styles.userInfo}
                      >
                        <Text
                          style={styles.userName}
                        >
                          {postulacion.usuario.name}
                        </Text>

                        <Text
                          style={
                            styles.interestText
                          }
                        >
                          {t("Está interesado en tu trabajo")}</Text>
                      </View>
                    </View>

                    <View
                      style={styles.jobBox}
                    >
                      <Text
                        style={
                          styles.jobTitle
                        }
                      >
                        {
                          postulacion.trabajo
                            .title
                        }
                      </Text>

                      <Text
                        style={
                          styles.jobInfo
                        }
                      >
                        📍{' '}
                        {
                          postulacion.trabajo
                            .commune
                        }
                      </Text>

                      <Text
                        style={
                          styles.jobBudget
                        }
                      >
                        $
                        {postulacion.trabajo.budget.toLocaleString(
                          locale,
                        )}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.profileButton
                      }
                      onPress={() =>
                        router.push({
                          pathname:
                            '/user/[id]',
                          params: {
                            id: postulacion
                              .usuario.id,
                          },
                        })
                      }
                    >
                      <Text
                        style={
                          styles.profileButtonText
                        }
                      >
                        {t("Ver perfil y reputación")}</Text>
                    </TouchableOpacity>

                    <View
                      style={styles.actions}
                    >
                      <TouchableOpacity
                        style={
                          styles.rejectButton
                        }
                        onPress={() =>
                          handleRechazar(
                            postulacion,
                          )
                        }
                        disabled={
                          processingId ===
                          postulacion.id
                        }
                      >
                        <Text
                          style={
                            styles.rejectText
                          }
                        >
                          {t("✕ Rechazar")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.acceptButton
                        }
                        onPress={() =>
                          handleAceptar(
                            postulacion,
                          )
                        }
                        disabled={
                          processingId ===
                          postulacion.id
                        }
                      >
                        {processingId ===
                        postulacion.id ? (
                          <ActivityIndicator
                            color={colors.onPrimary}
                          />
                        ) : (
                          <Text
                            style={
                              styles.acceptText
                            }
                          >
                            {t("♥ Seleccionar")}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ),
              )
            )}
          </ScrollView>
        )
      ) : loadingChats ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            {t("Cargando chats...")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {conversaciones.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                💬
              </Text>

              <Text style={styles.emptyTitle}>
                {t("Sin conversaciones")}</Text>

              <Text style={styles.emptyText}>
                {t("Cuando hagas match con otra persona, aparecerá aquí.")}</Text>
            </View>
          ) : (
            conversaciones.map(
              (conversacion) => (
                <TouchableOpacity
                  key={conversacion.id}
                  style={styles.chatCard}
                  onPress={() =>
                    router.push({
                      pathname:
                        '/chat/[id]',
                      params: {
                        id: conversacion.id,
                      },
                    })
                  }
                >
                  <View
                    style={styles.chatAvatar}
                  >
                    <Text
                      style={
                        styles.avatarText
                      }
                    >
                      {conversacion.usuario.name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.chatContent
                    }
                  >
                    <View
                      style={styles.chatTop}
                    >
                      <Text
                        style={
                          styles.chatName
                        }
                      >
                        {
                          conversacion.usuario
                            .name
                        }
                      </Text>

                      <Text
                        style={
                          styles.matchLabel
                        }
                      >
                        {t("MATCH")}</Text>
                    </View>

                    <Text
                      style={
                        styles.chatJob
                      }
                    >
                      {
                        conversacion.trabajo
                          .title
                      }
                    </Text>

                    <Text
                      style={
                        styles.lastMessage
                      }
                      numberOfLines={1}
                    >
                      {conversacion.ultimoMensaje
                        ? conversacion
                            .ultimoMensaje
                            .contenido
                        : t("Match realizado. ¡Inicia la conversación!")}
                    </Text>
                  </View>

                  <Text
                    style={styles.arrow}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              ),
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 55,
  },

  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6,
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 25,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 11,
  },

  activeTab: {
    backgroundColor: colors.primary,
  },

  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },

  activeTabText: {
    color: colors.onPrimary,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 120,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },

  loadingText: {
    color: colors.muted,
    marginTop: 12,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
  },

  cardHeader: {
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

  userInfo: {
    marginLeft: 13,
    flex: 1,
  },

  userName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  interestText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },

  jobBox: {
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 15,
    marginTop: 17,
  },

  jobTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  jobInfo: {
    color: colors.muted,
    marginTop: 7,
  },

  jobBudget: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },

  profileButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 11,
  },

  profileButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  rejectButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dangerText,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rejectText: {
    color: colors.dangerText,
    fontWeight: '700',
  },

  acceptButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  acceptText: {
    color: colors.onPrimary,
    fontWeight: '800',
  },

  chatCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chatAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatContent: {
    flex: 1,
    marginLeft: 14,
  },

  chatTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  chatName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  matchLabel: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 9,
    letterSpacing: 1,
  },

  chatJob: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },

  lastMessage: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
  },

  arrow: {
    color: colors.muted,
    fontSize: 30,
    marginLeft: 8,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});
