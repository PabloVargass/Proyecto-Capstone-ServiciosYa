import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useState } from 'react';

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

export default function ReviewScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const {
    id,
    title,
    userName,
  } = useLocalSearchParams<{
    id: string;
    title?: string;
    userName?: string;
  }>();

  const [
    puntuacion,
    setPuntuacion,
  ] = useState(0);

  const [
    comentario,
    setComentario,
  ] = useState('');

  const [sending, setSending] =
    useState(false);

  const enviarResena = async () => {
    if (puntuacion < 1) {
      Alert.alert(
        t("Selecciona una calificación"),
        t("Debes seleccionar entre 1 y 5 estrellas."),
      );

      return;
    }

    try {
      setSending(true);

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
        `${API_URL}/resenas`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            trabajoId: id,
            puntuacion,
            comentario:
              comentario.trim() ||
              undefined,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          Alert.alert(
            t("Ya calificaste"),
            t(data.message ||
              t("Ya calificaste a este usuario por este trabajo.")),
          );

          return;
        }

        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
                t("No se pudo guardar la reseña."),
        );
      }

      Alert.alert(
        t("⭐ Reseña enviada"),
        t("Tu calificación fue registrada correctamente."),
        [
          {
            text: t("Aceptar"),
            onPress: () =>
              router.back(),
          },
        ],
      );
    } catch (error: any) {
      console.error(
        'Error enviando reseña:',
        error,
      );

      Alert.alert(
        t("Error"),
        t(error?.message ||
          t("No se pudo enviar la reseña.")),
      );
    } finally {
      setSending(false);
    }
  };

  const textoCalificacion = () => {
    switch (puntuacion) {
      case 1:
        return t("Muy mala");
      case 2:
        return t("Mala");
      case 3:
        return t("Regular");
      case 4:
        return t("Muy buena");
      case 5:
        return 'Excelente';
      default:
        return t("Selecciona una puntuación");
    }
  };

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
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backIcon}>
            ←
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {t("Calificar")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>
            ⭐
          </Text>
        </View>

        <Text style={styles.title}>
          {t("¿Cómo fue tu experiencia?")}</Text>

        <Text style={styles.subtitle}>
          {t("Califica a")}{' '}
          <Text
            style={styles.highlight}
          >
            {userName || t("el usuario")}
          </Text>{' '}
          {t("por el trabajo")}</Text>

        <Text style={styles.jobName}>
          “{title || 'Trabajo'}”
        </Text>

        <View
          style={styles.starsContainer}
        >
          {[1, 2, 3, 4, 5].map(
            (star) => (
              <TouchableOpacity
                key={star}
                style={
                  styles.starButton
                }
                activeOpacity={0.7}
                onPress={() =>
                  setPuntuacion(star)
                }
              >
                <Text
                  style={[
                    styles.star,
                    star <= puntuacion
                      ? styles.starSelected
                      : styles.starEmpty,
                  ]}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        <Text
          style={
            styles.ratingDescription
          }
        >
          {textoCalificacion()}
        </Text>

        <View style={styles.divider} />

        <Text
          style={styles.sectionTitle}
        >
          {t("Cuéntanos más")}</Text>

        <Text
          style={styles.optionalText}
        >
          {t("El comentario es opcional.")}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("Ej: Excelente experiencia, muy responsable y puntual...")}
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          maxLength={1000}
          value={comentario}
          onChangeText={setComentario}
        />

        <Text
          style={styles.counter}
        >
          {comentario.length}/1000
        </Text>

        <TouchableOpacity
          style={[
            styles.sendButton,
            puntuacion === 0 &&
              styles.sendButtonDisabled,
          ]}
          disabled={
            puntuacion === 0 ||
            sending
          }
          onPress={enviarResena}
        >
          {sending ? (
            <ActivityIndicator
              color={colors.onPrimary}
            />
          ) : (
            <Text
              style={
                styles.sendButtonText
              }
            >
              {t("Enviar calificación")}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.infoText}>
          {t("Tu reseña ayudará a otros usuarios a tomar mejores decisiones.")}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    height: 105,
    paddingTop: 45,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  backIcon: {
    color: colors.text,
    fontSize: 32,
  },

  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 60,
    alignItems: 'center',
  },

  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor:
      'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor:
      'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 38,
  },

  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 20,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },

  highlight: {
    color: colors.accent,
    fontWeight: '800',
  },

  jobName: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 7,
  },

  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },

  starButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  star: {
    fontSize: 43,
  },

  starSelected: {
    color: colors.warningText,
  },

  starEmpty: {
    color: colors.muted,
  },

  ratingDescription: {
    color: colors.warningText,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.surface,
    marginVertical: 30,
  },

  sectionTitle: {
    width: '100%',
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  optionalText: {
    width: '100%',
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  input: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 15,
  },

  counter: {
    width: '100%',
    color: colors.muted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },

  sendButton: {
    width: '100%',
    height: 54,
    backgroundColor: colors.warning,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  infoText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
  },
});