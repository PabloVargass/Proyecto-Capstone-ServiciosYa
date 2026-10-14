import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';
import { createAuthStyles } from '@/styles/auth.styles';

export default function ForgotPasswordScreen() {
  const { colors, t, locale } = useAppPreferences();
  const authStyles = useThemedStyles(createAuthStyles);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecovery = async () => {
    setError('');

    // =====================================
    // NORMALIZAR CORREO
    // =====================================

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // =====================================
    // VALIDACIONES
    // =====================================

    if (!normalizedEmail) {
      setError(
        t("Ingresa tu correo electrónico."),
      );
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError(
        t("Ingresa un correo electrónico válido."),
      );
      return;
    }

    // =====================================
    // SOLICITAR CÓDIGO AL BACKEND
    // =====================================

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
              t("No se pudo solicitar la recuperación de contraseña.");

        throw new Error(errorMessage);
      }

      // =====================================
      // IR A VERIFICAR CÓDIGO
      // =====================================

      router.push({
        pathname: '/verify-reset-code',
        params: {
          email: normalizedEmail,
        },
      });
    } catch (error) {
      console.error(
        'Error recuperando contraseña:',
        error,
      );

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          t("No se pudo conectar con el servidor. Inténtalo nuevamente."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      {/* =================================
          VOLVER
      ================================= */}

      <TouchableOpacity
        style={authStyles.backButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text
          style={authStyles.backButtonText}
        >
          ←
        </Text>
      </TouchableOpacity>

      {/* =================================
          TÍTULO
      ================================= */}

      <Text style={authStyles.title}>
        {t("Recuperar contraseña")}</Text>

      <Text style={authStyles.subtitle}>
        {t("Ingresa el correo asociado a tu cuenta y te enviaremos un código para recuperar tu contraseña.")}</Text>

      {/* =================================
          CORREO
      ================================= */}

      <TextInput
        style={authStyles.input}
        placeholder={t("Correo electrónico")}
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        value={email}
        onChangeText={(text) => {
          setEmail(text);

          if (error) {
            setError('');
          }
        }}
      />

      {/* =================================
          ERROR
      ================================= */}

      {error ? (
        <Text style={authStyles.errorText}>
          {error}
        </Text>
      ) : null}

      {/* =================================
          BOTÓN
      ================================= */}

      <TouchableOpacity
        style={[
          authStyles.primaryButton,

          loading && {
            opacity: 0.7,
          },
        ]}
        onPress={handleRecovery}
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
            {t("Enviar código")}</Text>
        )}
      </TouchableOpacity>

      {/* =================================
          LOGIN
      ================================= */}

      <Text
        style={authStyles.secondaryText}
      >
        {t("¿Recordaste tu contraseña?")}{' '}

        <Text
          style={authStyles.link}
          onPress={() =>
            router.replace('/login')
          }
        >
          {t("Iniciar sesión")}</Text>
      </Text>
    </View>
  );
}