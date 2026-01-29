import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 em /auth/me é esperado quando não há sessão ou token expirado; tratado no authSlice
    const isAuthMe = err.config?.url === '/auth/me' && err.response?.status === 401;
    const message = isAuthMe ? 'Não autenticado' : (err.response?.data?.error || err.message || 'Erro de conexão');
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
