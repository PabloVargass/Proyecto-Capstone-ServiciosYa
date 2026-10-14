import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL } from '@/constants/api';

type Conversacion = {
  id: string;
  mensajesNoLeidos: number;
};

export default function TabsLayout() {
  const { colors, t, locale } = useAppPreferences();

  const insets = useSafeAreaInsets();

  const [
    mensajesNoLeidos,
    setMensajesNoLeidos,
  ] = useState(0);

  const cargarMensajesNoLeidos =
    async () => {
      try {
        const token =
          await SecureStore.getItemAsync(
            'accessToken',
          );

        if (!token) {
          setMensajesNoLeidos(0);
          return;
        }

        const response = await fetch(
          `${API_URL}/conversaciones`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          return;
        }

        const conversaciones: Conversacion[] =
          await response.json();

        const totalNoLeidos =
          conversaciones.reduce(
            (
              total,
              conversacion,
            ) =>
              total +
              conversacion.mensajesNoLeidos,
            0,
          );

        setMensajesNoLeidos(
          totalNoLeidos,
        );
      } catch (error) {
        console.error(
          'Error cargando mensajes no leídos:',
          error,
        );
      }
    };

  useEffect(() => {
    cargarMensajesNoLeidos();

    const interval =
      setInterval(() => {
        cargarMensajesNoLeidos();
      }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor:
            colors.background,

          borderTopColor:
            colors.border,

          borderTopWidth: 1,

          height:
            62 +
            insets.bottom,

          paddingTop: 7,

          paddingBottom:
            insets.bottom + 6,
        },

        tabBarActiveTintColor:
          colors.accent,

        tabBarInactiveTintColor:
          colors.muted,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* =========================
          INICIO
      ========================== */}

      <Tabs.Screen
        name="home"
        options={{
          title: t("Inicio"),

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =========================
          EXPLORAR
      ========================== */}

      <Tabs.Screen
        name="discover"
        options={{
          title: t("Explorar"),

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'compass'
                  : 'compass-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =========================
          PUBLICAR
      ========================== */}

      <Tabs.Screen
        name="publish"
        options={{
          title: t("Publicar"),

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'add-circle'
                  : 'add-circle-outline'
              }
              size={30}
              color={color}
            />
          ),
        }}
      />

      {/* =========================
          MENSAJES
      ========================== */}

      <Tabs.Screen
        name="messages"
        options={{
          title: t("Mensajes"),

          tabBarBadge:
            mensajesNoLeidos > 0
              ? mensajesNoLeidos >
                99
                ? '99+'
                : mensajesNoLeidos
              : undefined,

          tabBarBadgeStyle: {
            backgroundColor:
              colors.danger,

            color:
              colors.onColor,

            fontSize: 10,

            fontWeight:
              '800',
          },

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'chatbubble'
                  : 'chatbubble-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =========================
          PERFIL
      ========================== */}

      <Tabs.Screen
        name="profile"
        options={{
          title: t("Perfil"),

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =========================
          RUTA ANTIGUA DE BUSCAR
          OCULTA DE LA BARRA
      ========================== */}

      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}