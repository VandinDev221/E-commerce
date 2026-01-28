import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, setAuthToken, clearAuthToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar?: string | null;
  emailVerified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  checked: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('accessToken'),
  loading: false,
  checked: false,
};

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    setAuthToken(token);
    const { data } = await api.get<User>('/auth/me');
    return data;
  } catch (e) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearAuthToken();
    return rejectWithValue(null);
  }
});

export const login = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    const { data } = await api.post<{ user: User; accessToken: string }>('/auth/login', {
      email,
      password,
    });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      setAuthToken(data.accessToken);
    }
    return data.user;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { email, password, name }: { email: string; password: string; name?: string },
    { rejectWithValue }
  ) => {
    const { data } = await api.post<{ user: User; accessToken: string }>('/auth/register', {
      email,
      password,
      name,
    });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      setAuthToken(data.accessToken);
    }
    return data.user;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  clearAuthToken();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload ?? null;
        state.loading = false;
        state.checked = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.loading = false;
        state.checked = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      });
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
