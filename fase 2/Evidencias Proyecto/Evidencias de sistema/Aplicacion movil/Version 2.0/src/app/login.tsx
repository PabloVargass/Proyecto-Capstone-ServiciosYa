import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import { createAuthStyles } from '@/styles/auth.styles';

import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const GOOGLE_WEB_CLIENT_ID =
  '647997960274-89p031mma1vspj4sojcmhhfa5d1tli95.apps.googleusercontent.com';

export default function LoginScreen() {
  const { colors, t, locale } = useAppPreferences();
  const authStyles = useThemedStyles(createAuthStyles);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    isGoogleLoading,
    setIsGoogleLoading,
  ] = useState(false);

  const [
    welcomeVisible,
    setWelcomeVisible,
  ] = useState(false);

  const [
    welcomeName,
    setWelcomeName,
  ] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  const guardarSesion = async (
    accessToken: string,
    user: any,
  ) => {
    await SecureStore.setItemAsync(
      'accessToken',
      accessToken,
    );

    await SecureStore.setItemAsync(
      'user',
      JSON.stringify(user),
    );

    setWelcomeName(user.name);
    setWelcomeVisible(true);
  };

  const handleLogin = async () => {
    if (
      !email.trim() ||
      !password.trim()
    ) {
      Alert.alert(
        t("Campos incompletos"),
        t("Debes completar todos los campos."),
      );

      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        email.trim(),
      )
    ) {
      Alert.alert(
        t("Correo inválido"),
        t("Ingresa un correo electrónico válido."),
      );

      return;
    }

    if (password.length < 6) {
      Alert.alert(
        t("Contraseña inválida"),
        t("La contraseña debe tener al menos 6 caracteres."),
      );

      return;
    }

    try {
      setIsLoading(true);

      const response =
        await fetch(
          `${API_URL}/auth/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              email: email
                .trim()
                .toLowerCase(),

              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status ===
          401
        ) {
          Alert.alert(
            t("No se pudo iniciar sesión"),

            t(data.message ||
              t("El correo o la contraseña son incorrectos.")),
          );

          return;
        }

        throw new Error(
          data.message ||
            t("No se pudo iniciar sesión."),
        );
      }

      await guardarSesion(
        data.accessToken,
        data.user,
      );
    } catch (error) {
      console.error(
        'Error al iniciar sesión:',
        error,
      );

      Alert.alert(
        t("Error de conexión"),
        t("No se pudo conectar con el servidor."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin =
    async () => {
      try {
        setIsGoogleLoading(true);

        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog:
            true,
        });

        /*
         * Cerramos la sesión previa de
         * Google Sign-In para que Google
         * vuelva a mostrar el selector de
         * cuentas.
         *
         * Así en la presentación podrás
         * elegir una cuenta existente o
         * usar "Usar otra cuenta".
         */
        try {
          await GoogleSignin.signOut();
        } catch {
          // Si no había una sesión previa,
          // seguimos normalmente.
        }

        const result =
          await GoogleSignin.signIn();

        const tokens =
          await GoogleSignin.getTokens();

        const idToken =
          tokens.idToken ||
          result.data?.idToken;

        if (!idToken) {
          throw new Error(
            t("Google no entregó un ID token."),
          );
        }

        const response =
          await fetch(
            `${API_URL}/auth/google`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  idToken,
                }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t("No se pudo iniciar sesión con Google."),
          );
        }

        await guardarSesion(
          data.accessToken,
          data.user,
        );
      } catch (error: any) {
        console.error(
          'Error Google Sign-In:',
          error,
        );

        if (
          error?.code ===
          statusCodes.SIGN_IN_CANCELLED
        ) {
          return;
        }

        if (
          error?.code ===
          statusCodes.IN_PROGRESS
        ) {
          return;
        }

        if (
          error?.code ===
          statusCodes.PLAY_SERVICES_NOT_AVAILABLE
        ) {
          Alert.alert(
            t("Google Play Services"),
            t("Google Play Services no está disponible o necesita actualizarse."),
          );

          return;
        }

        Alert.alert(
          t('Google'),

          t(error?.message ||
            t("No se pudo iniciar sesión con Google.")),
        );
      } finally {
        setIsGoogleLoading(
          false,
        );
      }
    };

  const continuar = () => {
    setWelcomeVisible(false);

    router.replace(
      '/(tabs)/home',
    );
  };

  return (
    <View
      style={
        authStyles.container
      }
    >
      <TouchableOpacity
        style={
          authStyles.backButton
        }
        onPress={() =>
          router.back()
        }
      >
        <Text
          style={
            authStyles.backButtonText
          }
        >
          ←
        </Text>
      </TouchableOpacity>

      <Text
        style={authStyles.title}
      >
        {t("Iniciar sesión")}</Text>

      <Text
        style={
          authStyles.subtitle
        }
      >
        {t("Ingresa a tu cuenta para continuar.")}</Text>

      <TextInput
        style={authStyles.input}
        placeholder={t("Correo electrónico")}
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="username"
        importantForAutofill="yes"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={authStyles.input}
        placeholder={t("Contraseña")}
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoComplete="current-password"
        importantForAutofill="yes"
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        onPress={() =>
          router.push(
            '/forgot-password',
          )
        }
      >
        <Text
          style={[
            authStyles.link,
            {
              textAlign: 'right',
              marginBottom: 18,
            },
          ]}
        >
          {t("¿Olvidaste tu contraseña?")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          authStyles.primaryButton
        }
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            color={colors.onPrimary}
          />
        ) : (
          <Text
            style={
              authStyles.primaryButtonText
            }
          >
            {t("Ingresar")}</Text>
        )}
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 22,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor:
              colors.elevated,
          }}
        />

        <Text
          style={{
            color: colors.muted,
            marginHorizontal: 12,
            fontSize: 12,
          }}
        >
          {t("o continúa con")}</Text>

        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor:
              colors.elevated,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={
          handleGoogleLogin
        }
        disabled={
          isGoogleLoading
        }
        style={{
          height: 54,
          borderRadius: 16,
          backgroundColor:
            colors.googleSurface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent:
            'center',
        }}
      >
        {isGoogleLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '900',
                marginRight: 10,
                color: '#4285F4',
              }}
            >
              G
            </Text>

            <Text
              style={{
                color: colors.googleText,
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {t("Continuar con Google")}</Text>
          </>
        )}
      </TouchableOpacity>

      <Text
        style={
          authStyles.secondaryText
        }
      >
        {t("¿No tienes cuenta?")}{' '}

        <Text
          style={
            authStyles.link
          }
          onPress={() =>
            router.push(
              '/register',
            )
          }
        >
          {t("Regístrate")}</Text>
      </Text>

      <Modal
        visible={
          welcomeVisible
        }
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              'rgba(0,0,0,0.68)',

            alignItems: 'center',
            justifyContent:
              'center',

            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 360,

              backgroundColor:
                colors.background,

              borderRadius: 28,

              borderWidth: 1,
              borderColor:
                colors.border,

              padding: 28,

              alignItems:
                'center',
            }}
          >
            <Text
              style={{
                fontSize: 58,
              }}
            >
              👋
            </Text>

            <Text
              style={{
                color: colors.text,
                fontSize: 27,
                fontWeight: '900',
                marginTop: 10,
              }}
            >
              {t("¡Bienvenido!")}</Text>

            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '700',
                marginTop: 15,
              }}
            >
              {t("Hola")}{' '}{welcomeName}
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                marginTop: 7,
                textAlign: 'center',
              }}
            >
              {t("Nos alegra verte de nuevo.")}</Text>

            <TouchableOpacity
              onPress={continuar}
              style={{
                marginTop: 25,

                width: '100%',
                height: 52,

                borderRadius: 16,

                backgroundColor:
                  colors.primary,

                alignItems:
                  'center',

                justifyContent:
                  'center',
              }}
            >
              <Text
                style={{
                  color: colors.onPrimary,
                  fontWeight: '800',
                  fontSize: 15,
                }}
              >
                {t("Continuar →")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
