import type { AppColors } from '@/constants/app-theme';
import { StyleSheet } from 'react-native';

export const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingVertical: 50,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  logo: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },

  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
    marginBottom: 18,
  },

  description: {
    color: colors.secondary,
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 40,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },

  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },

  footer: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
  },
});