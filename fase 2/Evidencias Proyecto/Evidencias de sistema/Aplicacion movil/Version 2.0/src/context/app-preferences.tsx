import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { appThemes, type AppColors, type ThemeMode } from '@/constants/app-theme';
import { translate, type Language } from '@/constants/translations';

const STORAGE_KEY = 'serviciosya.preferences';
type Preferences = { language: Language; theme: ThemeMode };
const defaults: Preferences = { language: 'es', theme: 'dark' };

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return defaults;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return defaults;
    const saved = value as Record<string, unknown>;
    return {
      language: saved.language === 'en' ? 'en' : 'es',
      theme: saved.theme === 'light' ? 'light' : 'dark',
    };
  } catch {
    return defaults;
  }
}

type PreferencesContext = Preferences & {
  colors: AppColors;
  locale: string;
  ready: boolean;
  t: (text: string, values?: Record<string, string>) => string;
  setLanguage: (language: Language) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
};
const Context = createContext<PreferencesContext | null>(null);

async function readPreferences() {
  return Platform.OS === 'web'
    ? globalThis.localStorage.getItem(STORAGE_KEY)
    : SecureStore.getItemAsync(STORAGE_KEY);
}

async function writePreferences(value: Preferences) {
  const json = JSON.stringify(value);
  if (Platform.OS === 'web') globalThis.localStorage.setItem(STORAGE_KEY, json);
  else await SecureStore.setItemAsync(STORAGE_KEY, json);
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  const current = useRef(preferences);
  const committed = useRef(preferences);
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    readPreferences().then(raw => {
      if (!active) return;
      const saved = parsePreferences(raw);
      current.current = saved;
      committed.current = saved;
      setPreferences(saved);
    }).catch(() => {
      // Mantener valores válidos si el almacenamiento no está disponible.
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...current.current, ...patch };
    // Serializar escrituras para conservar el orden al cambiar ambas opciones.
    const task = pendingWrite.current.catch(() => {}).then(async () => {
      await writePreferences(next);
      committed.current = next;
      setPreferences(next);
    });
    current.current = next;
    pendingWrite.current = task;
    return task.catch(error => {
      if (current.current === next) current.current = committed.current;
      throw error;
    });
  }, []);

  const setLanguage = useCallback((language: Language) => update({ language }), [update]);
  const setTheme = useCallback((theme: ThemeMode) => update({ theme }), [update]);
  const t = useCallback((text: string, values?: Record<string, string>) => translate(text, preferences.language, values), [preferences.language]);
  const value = useMemo(() => ({
    ...preferences,
    colors: appThemes[preferences.theme],
    locale: preferences.language === 'en' ? 'en-CL' : 'es-CL',
    ready, t, setLanguage, setTheme,
  }), [preferences, ready, t, setLanguage, setTheme]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('AppPreferencesProvider is required');
  return value;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
export function useThemedStyles<T extends NamedStyles<T>>(factory: (colors: AppColors) => T): T {
  const { colors } = useAppPreferences();
  return useMemo(() => StyleSheet.create(factory(colors)), [factory, colors]);
}
