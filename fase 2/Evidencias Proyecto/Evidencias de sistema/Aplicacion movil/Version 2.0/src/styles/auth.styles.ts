import type { AppColors } from '@/constants/app-theme';
import { StyleSheet } from 'react-native';

export const createAuthStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },

  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 16,
    marginBottom: 32,
  },

  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 24,
  },

  link: {
    color: colors.accent,
    fontWeight: '700',
  },
  backButton: {
  position: 'absolute',
  top: 55,
  left: 24,
  zIndex: 10,
  padding: 8,
},

backButtonText: {
  color: colors.text,
  fontSize: 34,
  fontWeight: '300',
  lineHeight: 36,
},

screen: {
  flex: 1,
  backgroundColor: colors.background,
},

scrollContent: {
  flexGrow: 1,
  justifyContent: 'center',
  paddingHorizontal: 28,
  paddingTop: 90,
  paddingBottom: 40,
},

errorText: {
  color: colors.dangerText,
  fontSize: 13,
  marginTop: -8,
  marginBottom: 12,
  marginLeft: 4,
},

successText: {
  color: colors.successText,
  fontSize: 14,
  lineHeight: 20,
  marginBottom: 14,
  marginLeft: 4,
},
});