import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useState } from 'react';

import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createAuthStyles } from '@/styles/auth.styles';

export default function VerifyEmailScreen() {
  const { colors, t, locale } = useAppPreferences();
  const authStyles = useThemedStyles(createAuthStyles);

  const params = useLocalSearchParams<{
    email?: string;
  }>();

  const email =
    typeof params.email === 'string'
      ? params.email
      : '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  // =====================================
  // VERIFICAR CÓDIGO
  // =====================================

  const handleVerify = async () => {
    setError('');
    setMessage('');

    const cleanCode =
      code.replace(/\D/g, '');

    if (cleanCode.length !== 6) {
      setError(
        t("Ingresa el código de 6 dígitos."),
      );
      return;
    }

    if (!email) {
      setError(
        t("No se pudo identificar el correo electrónico."),
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_URL}/auth/verify-email`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email:
              email
                .trim()
                .toLowerCase(),

            codigo:
              cleanCode,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
                t("No se pudo verificar el correo."),
        );
      }

      Alert.alert(
        t("Correo verificado"),
        t("Tu correo fue verificado correctamente. Ya puedes iniciar sesión."),
        [
          {
            text: 'Continuar',

            onPress: () =>
              router.replace('/login'),
          },
        ],
      );
    } catch (error) {
      console.error(
        'Error verificando correo:',
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : t("No se pudo verificar el correo."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // REENVIAR CÓDIGO
  // =====================================

  const handleResend = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError(
        t("No se pudo identificar el correo electrónico."),
      );
      return;
    }

    try {
      setIsResending(true);

      const response = await fetch(
        `${API_URL}/auth/resend-verification`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email:
              email
                .trim()
                .toLowerCase(),
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
                t("No se pudo reenviar el código."),
        );
      }

      /*
       * Limpiamos el código anterior
       * porque deja de ser válido.
       */
      setCode('');

      setMessage(
        t("Te enviamos un nuevo código de verificación. Revisa tu correo."),
      );
    } catch (error) {
      console.error(
        'Error reenviando código:',
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : t("No se pudo reenviar el código."),
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={authStyles.container}>
      {/* FLECHA VOLVER */}

      <TouchableOpacity
        style={authStyles.backButton}
        onPress={() => router.back()}
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

      <Text style={authStyles.title}>
        {t("Verifica tu correo")}</Text>

      <Text style={authStyles.subtitle}>
        {t("Enviamos un código de 6 dígitos al correo:")}</Text>

      {/* CORREO */}

      <Text
        style={{
          color: colors.text,
          fontSize: 16,
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
        value={code}
        maxLength={6}
        onChangeText={(text) => {
          const onlyNumbers =
            text.replace(/\D/g, '');

          setCode(onlyNumbers);

          if (error) {
            setError('');
          }

          if (message) {
            setMessage('');
          }
        }}
      />

      {/* ERROR */}

      {error ? (
        <Text
          style={authStyles.errorText}
        >
          {error}
        </Text>
      ) : null}

      {/* MENSAJE DE ÉXITO */}

      {message ? (
        <Text
          style={
            authStyles.successText
          }
        >
          {message}
        </Text>
      ) : null}

      {/* BOTÓN VERIFICAR */}

      <TouchableOpacity
        style={
          authStyles.primaryButton
        }
        onPress={handleVerify}
        disabled={
          isLoading ||
          isResending
        }
      >
        <Text
          style={
            authStyles.primaryButtonText
          }
        >
          {isLoading
            ? t("Verificando...")
            : t("Verificar correo")}
        </Text>
      </TouchableOpacity>

      {/* REENVIAR CÓDIGO */}

      <Text
        style={{
          color: colors.muted,
          textAlign: 'center',
          marginTop: 22,
        }}
      >
        {t("¿No recibiste el código?")}</Text>

      <TouchableOpacity
        onPress={handleResend}
        disabled={
          isResending ||
          isLoading
        }
      >
        <Text
          style={{
            color: colors.accent,
            textAlign: 'center',
            fontWeight: '600',
            marginTop: 8,
          }}
        >
          {isResending
            ? t("Enviando código...")
            : t("Reenviar código")}
        </Text>
      </TouchableOpacity>

      {/* INFORMACIÓN */}

      <Text
        style={{
          color: colors.muted,
          textAlign: 'center',
          marginTop: 24,
        }}
      >
        {t("El código es temporal y expirará después de unos minutos.")}</Text>
    </View>
  );
}