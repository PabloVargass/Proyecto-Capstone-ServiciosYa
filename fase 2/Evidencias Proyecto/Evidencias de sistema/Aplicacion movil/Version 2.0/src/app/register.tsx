import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createAuthStyles } from '@/styles/auth.styles';

// =====================================
// FUNCIONES PARA RUT
// =====================================

const cleanRut = (rut: string) => {
  return rut
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s/g, '')
    .toUpperCase();
};

const formatRut = (rut: string) => {
  const cleaned = cleanRut(rut);

  if (!cleaned) {
    return '';
  }

  if (cleaned.length === 1) {
    return cleaned;
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  return `${body}-${dv}`;
};

const isValidRut = (rut: string) => {
  const cleaned = cleanRut(rut);

  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) {
    return false;
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (
    let i = body.length - 1;
    i >= 0;
    i--
  ) {
    sum +=
      Number(body[i]) * multiplier;

    multiplier =
      multiplier === 7
        ? 2
        : multiplier + 1;
  }

  const result = 11 - (sum % 11);

  let expectedDv: string;

  if (result === 11) {
    expectedDv = '0';
  } else if (result === 10) {
    expectedDv = 'K';
  } else {
    expectedDv = String(result);
  }

  return dv === expectedDv;
};

export default function RegisterScreen() {
  const { colors, t, locale } = useAppPreferences();
  const authStyles = useThemedStyles(createAuthStyles);

  // =====================================
  // ESTADOS
  // =====================================

  const [name, setName] =
    useState('');

  const [rut, setRut] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const [errors, setErrors] =
    useState({
      name: '',
      rut: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });

  // =====================================
  // REGISTRAR
  // =====================================

  const handleRegister = async () => {
    const newErrors = {
      name: '',
      rut: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    };

    let isValid = true;

    // =====================================
    // VALIDAR NOMBRE
    // =====================================

    if (name.trim().length < 3) {
      newErrors.name =
        t("Ingresa tu nombre completo.");

      isValid = false;
    }

    // =====================================
    // VALIDAR RUT
    // =====================================

    const normalizedRut =
      cleanRut(rut);

    if (!normalizedRut) {
      newErrors.rut =
        t("El RUT es obligatorio.");

      isValid = false;
    } else if (
      !isValidRut(normalizedRut)
    ) {
      newErrors.rut =
        t("Ingresa un RUT chileno válido.");

      isValid = false;
    }

    // =====================================
    // VALIDAR CORREO
    // =====================================

    const normalizedEmail =
      email.trim().toLowerCase();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      newErrors.email =
        t("El correo electrónico es obligatorio.");

      isValid = false;
    } else if (
      !emailRegex.test(normalizedEmail)
    ) {
      newErrors.email =
        t("Ingresa un correo electrónico válido.");

      isValid = false;
    }

    // =====================================
    // VALIDAR TELÉFONO
    // =====================================

    const cleanPhone =
      phone.replace(/\D/g, '');

    if (!cleanPhone) {
      newErrors.phone =
        t("El teléfono es obligatorio.");

      isValid = false;
    } else if (
      cleanPhone.length !== 9
    ) {
      newErrors.phone =
        t("Ingresa un número chileno de 9 dígitos.");

      isValid = false;
    }

    // =====================================
    // VALIDAR CONTRASEÑA
    // =====================================

    if (password.length < 6) {
      newErrors.password =
        t("La contraseña debe tener al menos 6 caracteres.");

      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        t("Confirma tu contraseña.");

      isValid = false;
    } else if (
      password !== confirmPassword
    ) {
      newErrors.confirmPassword =
        t("Las contraseñas no coinciden.");

      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      return;
    }

    // =====================================
    // REGISTRO EN EL BACKEND
    // =====================================

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: name.trim(),

            rut: normalizedRut,

            email:
              normalizedEmail,

            phone:
              cleanPhone,

            password,
          }),
        },
      );

      const data =
        await response.json();

      // =====================================
      // ERRORES DEL BACKEND
      // =====================================

      if (!response.ok) {
        const backendMessage =
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ||
              t("No se pudo crear la cuenta.");

        /*
         * RUT duplicado.
         */
        if (
          response.status === 409 &&
          backendMessage
            .toLowerCase()
            .includes('rut')
        ) {
          setErrors((prev) => ({
            ...prev,

            rut:
              t("Ya existe una cuenta asociada a este RUT."),
          }));

          return;
        }

        /*
         * Correo duplicado.
         */
        if (
          response.status === 409 &&
          backendMessage
            .toLowerCase()
            .includes('correo')
        ) {
          setErrors((prev) => ({
            ...prev,

            email:
              t("Ya existe una cuenta asociada a este correo."),
          }));

          return;
        }

        throw new Error(
          backendMessage,
        );
      }

      // =====================================
      // IR A VERIFICAR CORREO
      // =====================================

      router.push({
        pathname:
          '/verify-email',

        params: {
          email:
            normalizedEmail,
        },
      });
    } catch (error) {
      console.error(
        'Error al registrar usuario:',
        error,
      );

      Alert.alert(
        t("No se pudo crear la cuenta"),

        t(error instanceof Error
          ? error.message
          : t("Ocurrió un error al intentar crear la cuenta.")),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <View style={authStyles.screen}>
      {/* VOLVER */}

      <TouchableOpacity
        style={authStyles.backButton}
        onPress={() =>
          router.back()
        }
        disabled={isLoading}
      >
        <Text
          style={
            authStyles.backButtonText
          }
        >
          ←
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={
          authStyles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* TÍTULO */}

        <Text
          style={authStyles.title}
        >
          {t("Crear cuenta")}</Text>

        <Text
          style={authStyles.subtitle}
        >
          {t("Regístrate para publicar servicios o encontrar trabajos.")}</Text>

        {/* NOMBRE */}

        <TextInput
          style={authStyles.input}
          placeholder={t("Nombre completo")}
          placeholderTextColor={colors.muted}
          value={name}
          editable={!isLoading}
          onChangeText={(text) => {
            setName(text);

            if (errors.name) {
              setErrors((prev) => ({
                ...prev,
                name: '',
              }));
            }
          }}
        />

        {errors.name ? (
          <Text
            style={
              authStyles.errorText
            }
          >
            {errors.name}
          </Text>
        ) : null}

        {/* RUT */}

        <TextInput
          style={authStyles.input}
          placeholder={t("RUT (ej: 12345678-5)")}
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isLoading}
          value={rut}
          maxLength={10}
          onChangeText={(text) => {
            const allowed =
              text
                .replace(
                  /[^0-9kK.-]/g,
                  '',
                )
                .toUpperCase();

            setRut(allowed);

            if (errors.rut) {
              setErrors((prev) => ({
                ...prev,
                rut: '',
              }));
            }
          }}
          onBlur={() => {
            if (rut) {
              setRut(
                formatRut(rut),
              );
            }
          }}
        />

        {errors.rut ? (
          <Text
            style={
              authStyles.errorText
            }
          >
            {errors.rut}
          </Text>
        ) : null}

        {/* CORREO */}

        <TextInput
          style={authStyles.input}
          placeholder={t("Correo electrónico")}
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          value={email}
          onChangeText={(text) => {
            setEmail(text);

            if (errors.email) {
              setErrors((prev) => ({
                ...prev,
                email: '',
              }));
            }
          }}
        />

        {errors.email ? (
          <Text
            style={
              authStyles.errorText
            }
          >
            {errors.email}
          </Text>
        ) : null}

        {/* TELÉFONO */}

        <TextInput
          style={authStyles.input}
          placeholder={t("Teléfono")}
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          editable={!isLoading}
          value={phone}
          onChangeText={(text) => {
            const onlyNumbers =
              text.replace(
                /\D/g,
                '',
              );

            setPhone(
              onlyNumbers,
            );

            if (errors.phone) {
              setErrors((prev) => ({
                ...prev,
                phone: '',
              }));
            }
          }}
          maxLength={9}
        />

        {errors.phone ? (
          <Text
            style={
              authStyles.errorText
            }
          >
            {errors.phone}
          </Text>
        ) : null}

        {/* CONTRASEÑA */}

        <TextInput
          style={authStyles.input}
          placeholder={t("Contraseña")}
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          value={password}
          onChangeText={(text) => {
            setPassword(text);

            if (errors.password) {
              setErrors((prev) => ({
                ...prev,
                password: '',
              }));
            }
          }}
        />

        {errors.password ? (
          <Text
            style={
              authStyles.errorText
            }
          >
            {errors.password}
          </Text>
        ) : null}

        {/* CONFIRMAR CONTRASEÑA */}

        <TextInput
          style={authStyles.input}
          placeholder={t("Confirmar contraseña")}
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(
              text,
            );

            if (
              errors.confirmPassword
            ) {
              setErrors((prev) => ({
                ...prev,

                confirmPassword:
                  '',
              }));
            }
          }}
        />

        {errors.confirmPassword ? (
          <Text
            style={
              authStyles.errorText
            }
          >
            {
              errors.confirmPassword
            }
          </Text>
        ) : null}

        {/* CREAR CUENTA */}

        <TouchableOpacity
          style={[
            authStyles.primaryButton,

            isLoading && {
              opacity: 0.7,
            },
          ]}
          onPress={
            handleRegister
          }
          disabled={isLoading}
        >
          <Text
            style={
              authStyles.primaryButtonText
            }
          >
            {isLoading
              ? t("Creando cuenta...")
              : t("Crear cuenta")}
          </Text>
        </TouchableOpacity>

        {/* LOGIN */}

        <Text
          style={
            authStyles.secondaryText
          }
        >
          {t("¿Ya tienes una cuenta?")}{' '}

          <Text
            style={authStyles.link}
            onPress={() =>
              router.replace(
                '/login',
              )
            }
          >
            {t("Inicia sesión")}</Text>
        </Text>
      </ScrollView>
    </View>
  );
}