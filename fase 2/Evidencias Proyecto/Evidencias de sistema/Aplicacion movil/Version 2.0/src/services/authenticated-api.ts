import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/constants/api';

export async function authenticatedApi<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const response = await fetch(`${API_URL}${path}`, {
    method, signal,
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('\n') : data.message || 'Ocurrió un error.');
  return data as T;
}
