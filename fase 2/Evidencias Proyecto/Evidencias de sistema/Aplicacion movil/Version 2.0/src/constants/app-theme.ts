export type ThemeMode = 'light' | 'dark';

const shared = {
  primary: '#2563EB',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
  onColor: '#FFFFFF',
  googleSurface: '#FFFFFF',
  googleText: '#0F172A',
};

export const appThemes = {
  dark: {
    ...shared,
    primary: '#38BDF8',
    onPrimary: '#020617',
    background: '#020617',
    surface: '#0F172A',
    elevated: '#1E293B',
    border: '#334155',
    text: '#F8FAFC',
    secondary: '#CBD5E1',
    muted: '#94A3B8',
    accent: '#38BDF8',
    accentSoft: 'rgba(56, 189, 248, 0.10)',
    successText: '#4ADE80',
    dangerText: '#F87171',
    warningText: '#FBBF24',
    purple: '#A78BFA',
  },
  light: {
    ...shared,
    background: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#F0F0F3',
    border: '#CBD5E1',
    text: '#0F172A',
    secondary: '#334155',
    muted: '#475569',
    accent: '#2563EB',
    accentSoft: 'rgba(56, 189, 248, 0.10)',
    successText: '#16A34A',
    dangerText: '#DC2626',
    warningText: '#92400E',
    purple: '#7C3AED',
  },
} satisfies Record<ThemeMode, Record<string, string>>;

export type AppColors = typeof appThemes.dark;
