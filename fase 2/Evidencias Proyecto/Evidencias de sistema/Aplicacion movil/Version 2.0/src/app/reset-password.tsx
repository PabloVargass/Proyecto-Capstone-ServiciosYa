import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import { createAuthStyles } from '@/styles/auth.styles';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ResetPasswordScreen() {
  const { colors, t, locale } = useAppPreferences();
  const authStyles = useThemedStyles(createAuthStyles);

  // =====================================
  // PARÁMETROS RECIBIDOS
  // =====================================

  const params = useLocalSearchParams<{
    email?: string;
    resetToken?: string;
  }>();

  const email =
    typeof params.email === 'string'
      ? params.email
      : '';

  const resetToken =
    typeof params.resetToken === 'string'
      ? params.resetToken
      : '';

  // =====================================
  // ESTADOS
  // =====================================

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =====================================
  // CAMBIAR CONTRASEÑA
  // =====================================

  const handleResetPassword =
    async () => {
      setError('');

      // =====================================
      // VALIDACIONES
      // =====================================

      if (!resetToken) {
        setError(
          t("La autorización para cambiar la contraseña no es válida. Solicita un nuevo código."),
        );

        return;
      }

      if (password.length < 6) {
        setError(
          t("La contraseña debe tener al menos 6 caracteres."),
        );

        return;
      }

      if (!confirmPassword) {
        setError(
          t("Debes confirmar tu nueva contraseña."),
        );

        return;
      }

      if (
        password !== confirmPassword
      ) {
        setError(
          t("Las contraseñas no coinciden."),
        );

        return;
      }

      // =====================================
      // SOLICITAR CAMBIO AL BACKEND
      // =====================================

      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_URL}/auth/reset-password`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                resetToken,
                password,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          const errorMessage =
            Array.isArray(
              data.message,
            )
              ? data.message.join(
                  ', ',
                )
              : data.message ||
                t("No se pudo cambiar la contraseña.");

          throw new Error(
            errorMessage,
          );
        }

        // =====================================
        // CONTRASEÑA CAMBIADA
        // =====================================

        Alert.alert(
          t("Contraseña actualizada"),
          t("Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña."),
          [
            {
              text: t("Iniciar sesión"),

              onPress: () =>
                router.replace(
                  '/login',
                ),
            },
          ],
        );
      } catch (error) {
        console.error(
          'Error cambiando contraseña:',
          error,
        );

        if (
          error instanceof Error
        ) {
          setError(
            error.message,
          );
        } else {
          setError(
            t("No se pudo cambiar la contraseña."),
          );
        }
      } finally {
        setLoading(false);
      }
    };

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <View
      style={authStyles.container}
    >
      {/* VOLVER */}

      <TouchableOpacity
        style={
          authStyles.backButton
        }
        onPress={() =>
          router.back()
        }
        disabled={loading}
      >
        <Text
          style={
            authStyles.backButtonText
          }
        >
          ←
        </Text>
      </TouchableOpacity>

      {/* TÍTULO */}

      <Text
        style={authStyles.title}
      >
        {t("Nueva contraseña")}</Text>

      {/* DESCRIPCIÓN */}

      <Text
        style={authStyles.subtitle}
      >
        {t("Crea una nueva contraseña para tu cuenta de ServiciosYa.")}</Text>

      {/* CORREO */}

      {email ? (
        <Text
          style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '600',
            marginBottom: 24,
          }}
        >
          {email}
        </Text>
      ) : null}

      {/* NUEVA CONTRASEÑA */}

      <TextInput
        style={authStyles.input}
        placeholder={t("Nueva contraseña")}
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        value={password}
        onChangeText={(text) => {
          setPassword(text);

          if (error) {
            setError('');
          }
        }}
      />

      {/* CONFIRMAR CONTRASEÑA */}

      <TextInput
        style={authStyles.input}
        placeholder={t("Confirmar contraseña")}
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(
            text,
          );

          if (error) {
            setError('');
          }
        }}
      />

      {/* ERROR */}

      {error ? (
        <Text
          style={
            authStyles.errorText
          }
        >
          {error}
        </Text>
      ) : null}

      {/* BOTÓN */}

      <TouchableOpacity
        style={[
          authStyles.primaryButton,

          loading && {
            opacity: 0.7,
          },
        ]}
        onPress={
          handleResetPassword
        }
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color={colors.onPrimary}
          />
        ) : (
          <Text
            style={
              authStyles.primaryButtonText
            }
          >
            {t("Cambiar contraseña")}</Text>
        )}
      </TouchableOpacity>

      {/* INFORMACIÓN */}

      <Text
        style={
          authStyles.secondaryText
        }
      >
        {t("Después de cambiar tu contraseña podrás iniciar sesión normalmente.")}</Text>
    </View>
  );
}