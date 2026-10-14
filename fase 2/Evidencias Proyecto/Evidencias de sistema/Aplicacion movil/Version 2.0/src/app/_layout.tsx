import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { AppPreferencesProvider, useAppPreferences } from '@/context/app-preferences';

export default function RootLayout() {
  return <AppPreferencesProvider><AppNavigation /></AppPreferencesProvider>;
}

function AppNavigation() {
  const { colors, theme, ready } = useAppPreferences();

  useEffect(() => {
    Appearance.setColorScheme(theme);
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [theme, colors]);

  useEffect(() => {
    if (!ready) return;
    const ocultarSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.log(
          'No se pudo ocultar el splash:',
          error,
        );
      }
    };

    ocultarSplash();
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>;
  }

  const navigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary, background: colors.background,
      card: colors.surface, text: colors.text, border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
    <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />

      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
    </ThemeProvider>
  );
}
