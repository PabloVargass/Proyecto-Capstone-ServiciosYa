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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VerifyResetCodeScreen() {
  const { colors, t, locale } = useAppPreferences();
  const authStyles = useThemedStyles(createAuthStyles);

  // =====================================
  // PARÁMETROS
  // =====================================

  const params = useLocalSearchParams<{
    email?: string;
  }>();

  const email =
    typeof params.email === 'string'
      ? params.email
      : '';

  // =====================================
  // ESTADOS
  // =====================================

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] =
    useState(false);

  // =====================================
  // VERIFICAR CÓDIGO
  // =====================================

  const handleVerifyCode = async () => {
    setError('');

    const cleanCode =
      code.replace(/\D/g, '');

    // =====================================
    // VALIDACIONES
    // =====================================

    if (!email) {
      setError(
        t("No se pudo identificar el correo electrónico."),
      );
      return;
    }

    if (cleanCode.length !== 6) {
      setError(
        t("Ingresa el código de 6 dígitos."),
      );
      return;
    }

    // =====================================
    // CONSULTAR BACKEND
    // =====================================

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/verify-reset-code`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email,
            codigo: cleanCode,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
              t("El código ingresado no es válido.");

        throw new Error(errorMessage);
      }

      // =====================================
      // OBTENER RESET TOKEN
      // =====================================

      const resetToken = data.resetToken;

      if (!resetToken) {
        throw new Error(
          t("El servidor no entregó autorización para cambiar la contraseña."),
        );
      }

      // =====================================
      // IR A NUEVA CONTRASEÑA
      // =====================================

      router.replace({
        pathname: '/reset-password',
        params: {
          email,
          resetToken,
        },
      });
    } catch (error) {
      console.error(
        'Error verificando código:',
        error,
      );

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          t("No se pudo verificar el código."),
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
    <View style={authStyles.container}>
      {/* VOLVER */}

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

      {/* TÍTULO */}

      <Text style={authStyles.title}>
        {t("Verifica el código")}</Text>

      {/* DESCRIPCIÓN */}

      <Text style={authStyles.subtitle}>
        {t("Ingresa el código de 6 dígitos que enviamos a tu correo electrónico.")}</Text>

      {/* CORREO */}

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

      {/* CÓDIGO */}

      <TextInput
        style={authStyles.input}
        placeholder={t("Código de 6 dígitos")}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        maxLength={6}
        editable={!loading}
        value={code}
        onChangeText={(text) => {
          const onlyNumbers =
            text.replace(/\D/g, '');

          setCode(onlyNumbers);

          if (error) {
            setError('');
          }
        }}
      />

      {/* ERROR */}

      {error ? (
        <Text style={authStyles.errorText}>
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
        onPress={handleVerifyCode}
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
            {t("Verificar código")}</Text>
        )}
      </TouchableOpacity>

      {/* INFORMACIÓN */}

      <Text
        style={authStyles.secondaryText}
      >
        {t("El código es temporal y expirará después de unos minutos.")}</Text>
    </View>
  );
}