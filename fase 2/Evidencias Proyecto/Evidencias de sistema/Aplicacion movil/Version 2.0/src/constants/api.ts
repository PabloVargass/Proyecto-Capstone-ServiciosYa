const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!apiUrl || !/^https?:\/\//.test(apiUrl)) {
  throw new Error('Configura EXPO_PUBLIC_API_URL en el entorno del móvil.');
}

export const API_URL = apiUrl.replace(/\/+$/, '');
