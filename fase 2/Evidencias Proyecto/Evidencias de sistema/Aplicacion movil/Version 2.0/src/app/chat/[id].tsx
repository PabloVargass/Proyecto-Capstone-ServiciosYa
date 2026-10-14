import { ServiceOfferPanel, type ServiceOffer } from '@/components/service-offer-panel';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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

type Mensaje = {
  id: string;
  contenido: string;
  leido: boolean;
  createdAt: string;

  remitente: {
    id: string;
    name: string;
  };
};

type Conversacion = {
  serviceOffer?: ServiceOffer | null;
  id: string;

  trabajo: {
    id: string;
    title: string;
  };

  propietario: {
    id: string;
    name: string;
  };

  trabajador: {
    id: string;
    name: string;
  };

  mensajes: Mensaje[];
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
};

export default function ChatScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{ id: string }>();

  const [conversacion, setConversacion] =
    useState<Conversacion | null>(null);

  const [currentUser, setCurrentUser] =
    useState<StoredUser | null>(null);

  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    let disposed = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let initialized = false;
    let initialErrorShown = false;

    setLoading(true);
    setConversacion(null);
    const refresh = async () => {
      if (disposed || busy || (AppState.currentState !== null && AppState.currentState !== 'active')) return;
      busy = true;
      controller = new AbortController();
      try {
        if (!id) return;
        const token = await SecureStore.getItemAsync('accessToken');
        const storedUser = await SecureStore.getItemAsync('user');
        if (disposed) return;
        if (!token || !storedUser) {
          router.replace('/login');
          return;
        }
        const response = await fetch(`${API_URL}/conversaciones/${id}/mensajes`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (disposed) return;
        if (!response.ok) {
          if (response.status === 401) router.replace('/login');
          throw new Error('No se pudo cargar la conversación.');
        }
        setCurrentUser(JSON.parse(storedUser));
        setConversacion(previous => {
          // Un GET iniciado antes de enviar no debe borrar la respuesta del POST.
          const messages = new Map<string, Mensaje>();
          for (const message of previous?.mensajes ?? []) messages.set(message.id, message);
          for (const message of data.mensajes) messages.set(message.id, message);
          return { ...data, mensajes: [...messages.values()].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) };
        });
        initialized = true;
      } catch (error) {
        if (!disposed && !controller.signal.aborted && !initialized && !initialErrorShown) {
          initialErrorShown = true;
          Alert.alert(t('Error'), t('No se pudo cargar la conversación.'), [
            { text: t('Volver'), onPress: () => router.back() },
          ]);
        }
      } finally {
        busy = false;
        if (!disposed) {
          setLoading(false);
          timer = setTimeout(refresh, 3000);
        }
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', status => {
      if (timer) clearTimeout(timer);
      if (status === 'active') void refresh();
    });
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      subscription.remove();
    };
  }, [id, t]));

  useEffect(() => {
    if (conversacion?.mensajes.length) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    }
  }, [conversacion?.mensajes.length]);

  const handleSend = async () => {
    const contenido = mensaje.trim();

    if (!contenido || !id || sending) {
      return;
    }

    try {
      setSending(true);

      const token =
        await SecureStore.getItemAsync('accessToken');

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/conversaciones/${id}/mensajes`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            contenido,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t("No se pudo enviar el mensaje."),
        );
      }

      setMensaje('');

      setConversacion((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          mensajes: [
            ...previous.mensajes.filter(message => message.id !== data.id),
            data,
          ],
        };
      });
    } catch (error) {
      console.error(
        'Error enviando mensaje:',
        error,
      );

      Alert.alert(
        t("Error"),
        t("No se pudo enviar el mensaje."),
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          {t("Cargando conversación...")}</Text>
      </View>
    );
  }

  if (!conversacion || !currentUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {t("No se pudo abrir la conversación.")}</Text>
      </View>
    );
  }

  const otroUsuario =
    conversacion.propietario.id === currentUser.id
      ? conversacion.trabajador
      : conversacion.propietario;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Text style={styles.avatarText}>
            {otroUsuario.name
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {otroUsuario.name}
          </Text>

          <Text
            style={styles.headerJob}
            numberOfLines={1}
          >
            {conversacion.trabajo.title}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={
          styles.messagesContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {conversacion.serviceOffer ? <ServiceOfferPanel offer={conversacion.serviceOffer} userId={currentUser.id}
          onRespond={status => setConversacion(previous => previous && previous.serviceOffer ? { ...previous, serviceOffer: { ...previous.serviceOffer, status } } : previous)} /> : <View style={styles.matchCard}>
          <Text style={styles.matchEmoji}>
            🎉
          </Text>

          <Text style={styles.matchTitle}>
            {t("¡Hicieron match!")}</Text>

          <Text style={styles.matchText}>
            {t("Ya pueden coordinar los detalles de este trabajo.")}</Text>
        </View>}

        {conversacion.mensajes.map(
          (item) => {
            const isMine =
              item.remitente.id ===
              currentUser.id;

            return (
              <View
                key={item.id}
                style={[
                  styles.messageRow,
                  isMine
                    ? styles.mineRow
                    : styles.otherRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMine
                      ? styles.mineBubble
                      : styles.otherBubble,
                  ]}
                >
                  <Text
                    style={[styles.messageText, isMine && styles.mineMessageText]}
                  >
                    {item.contenido}
                  </Text>

                  <Text
                    style={[styles.messageTime, isMine && styles.mineMessageText]}
                  >
                    {new Date(
                      item.createdAt,
                    ).toLocaleTimeString(
                      locale,
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </Text>
                </View>
              </View>
            );
          },
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t("Escribe un mensaje...")}
          placeholderTextColor={colors.muted}
          value={mensaje}
          onChangeText={setMensaje}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!mensaje.trim() || sending) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!mensaje.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator
              color={colors.onPrimary}
              size="small"
            />
          ) : (
            <Text style={styles.sendIcon}>
              ➤
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginTop: 12,
  },

  errorText: {
    color: colors.text,
    fontSize: 17,
  },

  header: {
    minHeight: 95,
    paddingTop: 42,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    color: colors.text,
    fontSize: 30,
  },

  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  avatarText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '800',
  },

  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },

  headerName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  headerJob: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },

  matchCard: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    maxWidth: '85%',
  },

  matchEmoji: {
    fontSize: 28,
  },

  matchTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },

  matchText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 4,
  },

  messageRow: {
    width: '100%',
    marginBottom: 10,
  },

  mineRow: {
    alignItems: 'flex-end',
  },

  otherRow: {
    alignItems: 'flex-start',
  },

  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
  },

  mineBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },

  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
  },

  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },

  mineMessageText: { color: colors.onPrimary },

  messageTime: {
    color: colors.secondary,
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 23,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 9,
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendIcon: {
    color: colors.onPrimary,
    fontSize: 20,
    marginLeft: 2,
  },
});
