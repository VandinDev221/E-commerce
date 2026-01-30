import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function getErrorMessage(err: any): string {
  if (!err) return 'Erro de conexão';
  const data = err.response?.data;
  if (data?.error != null) {
    if (typeof data.error === 'string') return data.error;
    if (typeof data.error === 'object') return (data.error as any).message ?? JSON.stringify(data.error);
  }
  if (data?.message != null && typeof data.message === 'string') return data.message;
  const msg = err.message;
  if (typeof msg === 'string' && msg && msg !== '[object Object]') return msg;
  return 'Erro de conexão';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 em /auth/me é esperado quando não há sessão ou token expirado; tratado no authSlice
    const isAuthMe = err.config?.url === '/auth/me' && err.response?.status === 401;
    const message = isAuthMe ? 'Não autenticado' : getErrorMessage(err);
    return Promise.reject(new Error(message));
  }
);

export function setCartSession(sessionId: string) {
  api.defaults.headers.common['x-cart-session'] = sessionId;
}

export function clearCartSession() {
  delete api.defaults.headers.common['x-cart-session'];
}

export function setAuthToken(token: string) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common['Authorization'];
}
