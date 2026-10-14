import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { API_URL } from '@/constants/api';

import * as SecureStore from 'expo-secure-store';

import { router } from 'expo-router';

import {
  useEffect,
  useState,
} from 'react';

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

// =====================================
// TIPOS
// =====================================

type UserProfile = {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UpdateProfileResponse = {
  message: string;

  user: UserProfile;
};

// =====================================
// PANTALLA EDITAR PERFIL
// =====================================

export default function EditProfileScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [name, setName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // =====================================
  // CARGAR PERFIL
  // =====================================

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // =====================================
      // OBTENER JWT
      // =====================================

      const token =
        await SecureStore.getItemAsync(
          'accessToken',
        );

      if (!token) {
        Alert.alert(
          t("Sesión expirada"),
          t("Debes iniciar sesión nuevamente."),
          [
            {
              text: t("Aceptar"),

              onPress: () => {
                router.replace('/login');
              },
            },
          ],
        );

        return;
      }

      // =====================================
      // CONSULTAR PERFIL REAL AL BACKEND
      // =====================================

      const response = await fetch(
        `${API_URL}/users/me`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              'application/json',
          },
        },
      );

      const data =
        await response.json();

      // =====================================
      // TOKEN INVÁLIDO O EXPIRADO
      // =====================================

      if (response.status === 401) {
        await SecureStore.deleteItemAsync(
          'accessToken',
        );

        await SecureStore.deleteItemAsync(
          'user',
        );

        Alert.alert(
          t("Sesión expirada"),
          t("Tu sesión ya no es válida. Inicia sesión nuevamente."),
          [
            {
              text: t("Aceptar"),

              onPress: () => {
                router.replace('/login');
              },
            },
          ],
        );

        return;
      }

      // =====================================
      // OTRO ERROR DEL BACKEND
      // =====================================

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message[0]
            : data.message ||
                t("No fue posible cargar tu perfil."),
        );
      }

      // =====================================
      // GUARDAR DATOS EN LA PANTALLA
      // =====================================

      const profile: UserProfile = data;

      setUser(profile);

      setName(
        profile.name || '',
      );

      setPhone(
        profile.phone || '',
      );
    } catch (error) {
      console.error(
        'Error cargando perfil:',
        error,
      );

      Alert.alert(
        t("Error"),
        t(error instanceof Error
          ? error.message
          : t("No fue posible cargar tu perfil.")),
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // VALIDAR FORMULARIO
  // =====================================

  const validateForm = () => {
    const cleanName =
      name.trim();

    const cleanPhone =
      phone.trim();

    if (!cleanName) {
      Alert.alert(
        t("Nombre requerido"),
        t("Debes ingresar tu nombre."),
      );

      return false;
    }

    if (cleanName.length < 2) {
      Alert.alert(
        t("Nombre inválido"),
        t("El nombre debe tener al menos 2 caracteres."),
      );

      return false;
    }

    if (
      cleanPhone.length !== 9
    ) {
      Alert.alert(
        t("Teléfono inválido"),
        t("El teléfono debe contener 9 dígitos."),
      );

      return false;
    }

    if (
      !/^[0-9]{9}$/.test(
        cleanPhone,
      )
    ) {
      Alert.alert(
        t("Teléfono inválido"),
        t("El teléfono debe contener solo números."),
      );

      return false;
    }

    return true;
  };

  // =====================================
  // GUARDAR CAMBIOS
  // =====================================

  const handleSave = async () => {
    if (saving) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // =====================================
      // OBTENER JWT
      // =====================================

      const token =
        await SecureStore.getItemAsync(
          'accessToken',
        );

      if (!token) {
        Alert.alert(
          t("Sesión expirada"),
          t("Debes iniciar sesión nuevamente."),
          [
            {
              text: t("Aceptar"),

              onPress: () => {
                router.replace('/login');
              },
            },
          ],
        );

        return;
      }

      // =====================================
      // ENVIAR ACTUALIZACIÓN
      // =====================================

      const response = await fetch(
        `${API_URL}/users/me`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            name:
              name.trim(),

            phone:
              phone.trim(),
          }),
        },
      );

      const data:
        UpdateProfileResponse & {
          message?: string | string[];
        } =
        await response.json();

      // =====================================
      // TOKEN INVÁLIDO O EXPIRADO
      // =====================================

      if (response.status === 401) {
        await SecureStore.deleteItemAsync(
          'accessToken',
        );

        await SecureStore.deleteItemAsync(
          'user',
        );

        Alert.alert(
          t("Sesión expirada"),
          t("Tu sesión ya no es válida. Inicia sesión nuevamente."),
          [
            {
              text: t("Aceptar"),

              onPress: () => {
                router.replace('/login');
              },
            },
          ],
        );

        return;
      }

      // =====================================
      // ERROR DE VALIDACIÓN / BACKEND
      // =====================================

      if (!response.ok) {
        let message =
          t("No fue posible actualizar el perfil.");

        if (
          Array.isArray(
            data.message,
          )
        ) {
          message =
            data.message[0];
        } else if (
          typeof data.message ===
          'string'
        ) {
          message =
            data.message;
        }

        throw new Error(
          message,
        );
      }

      // =====================================
      // ACTUALIZAR DATOS LOCALES
      // =====================================

      const updatedUser =
        data.user;

      setUser(updatedUser);

      setName(
        updatedUser.name,
      );

      setPhone(
        updatedUser.phone || '',
      );

      // =====================================
      // ACTUALIZAR SECURESTORE
      // =====================================

      /*
       * El ProfileScreen actual obtiene
       * los datos del usuario desde la
       * clave "user".
       *
       * Por eso actualizamos también
       * esa información local.
       */

      const storedUser =
        await SecureStore.getItemAsync(
          'user',
        );

      let localUser: Record<
        string,
        unknown
      > = {};

      if (storedUser) {
        try {
          localUser =
            JSON.parse(
              storedUser,
            );
        } catch {
          localUser = {};
        }
      }

      const newStoredUser = {
        ...localUser,

        id:
          updatedUser.id,

        name:
          updatedUser.name,

        email:
          updatedUser.email,

        phone:
          updatedUser.phone,
      };

      await SecureStore.setItemAsync(
        'user',

        JSON.stringify(
          newStoredUser,
        ),
      );

      // =====================================
      // CONFIRMACIÓN
      // =====================================

      Alert.alert(
        t("Perfil actualizado"),
        t("Tus datos fueron actualizados correctamente."),
        [
          {
            text: t("Aceptar"),

            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } catch (error) {
      console.error(
        'Error actualizando perfil:',
        error,
      );

      Alert.alert(
        t("Error"),
        t(error instanceof Error
          ? error.message
          : t("No fue posible actualizar el perfil.")),
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // CARGANDO
  // =====================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          {t("Cargando perfil...")}</Text>
      </View>
    );
  }

  // =====================================
  // INTERFAZ
  // =====================================

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================
            HEADER
        ================================= */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            activeOpacity={0.7}
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Text
              style={
                styles.backIcon
              }
            >
              ‹
            </Text>
          </TouchableOpacity>

          <Text
            style={
              styles.headerTitle
            }
          >
            {t("Editar perfil")}</Text>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* =================================
            AVATAR
        ================================= */}

        <View
          style={styles.avatar}
        >
          <Text
            style={
              styles.avatarText
            }
          >
            {name
              .trim()
              .charAt(0)
              .toUpperCase() ||
              '?'}
          </Text>
        </View>

        <Text
          style={
            styles.description
          }
        >
          {t("Actualiza la información visible en tu perfil.")}</Text>

        {/* =================================
            NOMBRE
        ================================= */}

        <Text
          style={styles.label}
        >
          {t("Nombre completo")}</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t("Nombre completo")}
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
          editable={!saving}
        />

        {/* =================================
            TELÉFONO
        ================================= */}

        <Text
          style={styles.label}
        >
          {t("Teléfono")}</Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(value) => {
            const onlyNumbers =
              value.replace(
                /[^0-9]/g,
                '',
              );

            setPhone(
              onlyNumbers.slice(
                0,
                9,
              ),
            );
          }}
          placeholder="912345678"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          maxLength={9}
          editable={!saving}
        />

        <Text
          style={
            styles.helperText
          }
        >
          {t("Ingresa 9 dígitos.")}</Text>

        {/* =================================
            INFORMACIÓN NO EDITABLE
        ================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t("Información de la cuenta")}</Text>

        {/* CORREO */}

        <View
          style={
            styles.lockedCard
          }
        >
          <View
            style={
              styles.lockedInfo
            }
          >
            <Text
              style={
                styles.lockedLabel
              }
            >
              {t("Correo electrónico")}</Text>

            <Text
              style={
                styles.lockedValue
              }
              numberOfLines={1}
            >
              {user?.email ||
                t("No disponible")}
            </Text>
          </View>

          <Text
            style={
              styles.lockIcon
            }
          >
            🔒
          </Text>
        </View>

        {/* RUT */}

        <View
          style={
            styles.lockedCard
          }
        >
          <View
            style={
              styles.lockedInfo
            }
          >
            <Text
              style={
                styles.lockedLabel
              }
            >
              {t("RUT")}</Text>

            <Text
              style={
                styles.lockedValue
              }
            >
              {user?.rut ||
                t("No disponible")}
            </Text>
          </View>

          <Text
            style={
              styles.lockIcon
            }
          >
            🔒
          </Text>
        </View>

        <Text
          style={
            styles.lockedExplanation
          }
        >
          {t("El RUT y el correo no se pueden modificar desde esta pantalla.")}</Text>

        {/* =================================
            GUARDAR
        ================================= */}

        <TouchableOpacity
          style={[
            styles.saveButton,

            saving &&
              styles.saveButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <View
              style={
                styles.savingContent
              }
            >
              <ActivityIndicator
                size="small"
              />

              <Text
                style={
                  styles.saveButtonText
                }
              >
                {t("Guardando...")}</Text>
            </View>
          ) : (
            <Text
              style={
                styles.saveButtonText
              }
            >
              {t("Guardar cambios")}</Text>
          )}
        </TouchableOpacity>

        {/* =================================
            CANCELAR
        ================================= */}

        <TouchableOpacity
          style={
            styles.cancelButton
          }
          activeOpacity={0.7}
          onPress={() =>
            router.back()
          }
          disabled={saving}
        >
          <Text
            style={
              styles.cancelText
            }
          >
            {t("Cancelar")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =====================================
// ESTILOS
// =====================================

const createStyles =
  (colors: AppColors) => StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        colors.background,
    },

    loadingContainer: {
      flex: 1,

      backgroundColor:
        colors.background,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingText: {
      color:
        colors.muted,

      marginTop: 12,
    },

    container: {
      paddingHorizontal: 24,

      paddingTop: 55,

      paddingBottom: 80,
    },

    // =================================
    // HEADER
    // =================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    backButton: {
      width: 44,

      height: 44,

      borderRadius: 14,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    backIcon: {
      color:
        colors.text,

      fontSize: 34,

      lineHeight: 36,

      marginTop: -2,
    },

    headerTitle: {
      color:
        colors.text,

      fontSize: 21,

      fontWeight:
        '800',
    },

    headerSpacer: {
      width: 44,
    },

    // =================================
    // AVATAR
    // =================================

    avatar: {
      width: 90,

      height: 90,

      borderRadius: 45,

      backgroundColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',

      alignSelf:
        'center',

      marginTop: 32,
    },

    avatarText: {
      color:
        colors.onPrimary,

      fontSize: 38,

      fontWeight:
        '800',
    },

    description: {
      color:
        colors.muted,

      fontSize: 14,

      textAlign:
        'center',

      lineHeight: 20,

      marginTop: 14,

      marginBottom: 30,
    },

    // =================================
    // CAMPOS EDITABLES
    // =================================

    label: {
      color:
        colors.secondary,

      fontSize: 14,

      fontWeight:
        '700',

      marginBottom: 8,

      marginTop: 18,
    },

    input: {
      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 15,

      color:
        colors.text,

      fontSize: 16,

      paddingHorizontal: 16,

      paddingVertical: 15,
    },

    helperText: {
      color:
        colors.muted,

      fontSize: 12,

      marginTop: 7,
    },

    // =================================
    // DATOS BLOQUEADOS
    // =================================

    sectionTitle: {
      color:
        colors.text,

      fontSize: 18,

      fontWeight:
        '800',

      marginTop: 34,

      marginBottom: 12,
    },

    lockedCard: {
      backgroundColor:
        colors.surface,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        colors.border,

      paddingHorizontal: 16,

      paddingVertical: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 10,
    },

    lockedInfo: {
      flex: 1,
    },

    lockedLabel: {
      color:
        colors.muted,

      fontSize: 12,
    },

    lockedValue: {
      color:
        colors.secondary,

      fontSize: 15,

      marginTop: 4,
    },

    lockIcon: {
      fontSize: 16,

      marginLeft: 12,
    },

    lockedExplanation: {
      color:
        colors.muted,

      fontSize: 12,

      lineHeight: 18,

      marginTop: 3,
    },

    // =================================
    // BOTONES
    // =================================

    saveButton: {
      backgroundColor:
        colors.primary,

      borderRadius: 15,

      paddingVertical: 16,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop: 34,

      minHeight: 54,
    },

    saveButtonDisabled: {
      opacity: 0.65,
    },

    savingContent: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,
    },

    saveButtonText: {
      color:
        colors.onPrimary,

      fontSize: 16,

      fontWeight:
        '800',
    },

    cancelButton: {
      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius: 15,

      paddingVertical: 15,

      alignItems:
        'center',

      marginTop: 12,
    },

    cancelText: {
      color:
        colors.muted,

      fontSize: 15,

      fontWeight:
        '700',
    },
  });