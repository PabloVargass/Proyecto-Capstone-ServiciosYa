/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppPreferences } from '@/context/app-preferences';

export function useTheme() {
  const { theme } = useAppPreferences();
  return Colors[theme];
}
