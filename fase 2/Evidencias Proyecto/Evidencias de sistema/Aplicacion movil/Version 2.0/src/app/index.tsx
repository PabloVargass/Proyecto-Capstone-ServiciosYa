import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { createStyles } from '@/styles/home.styles';

export default function HomeScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>

      <View style={styles.content}>
        <Text style={styles.logo}>Servicios</Text>

        <Text style={styles.title}>
          {t("Encuentra ayuda o genera ingresos")}</Text>

        <Text style={styles.description}>
          {t("Conecta con personas que necesitan realizar trabajos y servicios cerca de ti.")}</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.primaryButtonText}>
            {t("Iniciar sesión")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryButtonText}>
            {t("Crear cuenta")}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        {t("Plataforma de servicios")}</Text>
    </View>
  );
}
