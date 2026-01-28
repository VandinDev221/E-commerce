import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  stock: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  loading: boolean;
  isUser: boolean;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  loading: false,
  isUser: false,
};

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await api.get<{ items: CartItem[]; subtotal: number; isUser: boolean }>('/cart');
    return data;
  } catch (e) {
    return rejectWithValue(e);
  }
});

export const addToCart = createAsyncThunk(
  'cart/add',
  async (
    { productId, quantity }: { productId: string; quantity: number },
    { rejectWithValue }
  ) => {
    const { data } = await api.post<{ items: CartItem[]; subtotal: number; isUser: boolean }>(
      '/cart/add',
      { productId, quantity }
    );
    return data;
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/update',
  async (
    { itemId, quantity }: { itemId: string; quantity: number },
    { rejectWithValue }
  ) => {
    const { data } = await api.patch<{ items: CartItem[]; subtotal: number }>(
      `/cart/${itemId}`,
      { quantity }
    );
    return data;
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/remove',
  async (itemId: string, { rejectWithValue }) => {
    const { data } = await api.delete<{ items: CartItem[]; subtotal: number }>(`/cart/${itemId}`);
    return data;
  }
);

export const syncCart = createAsyncThunk('cart/sync', async (_, { rejectWithValue }) => {
  const { data } = await api.post<{ items: CartItem[]; subtotal: number; isUser: boolean }>(
    '/cart/sync'
  );
  return data;
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart(state, action) {
      state.items = action.payload.items ?? [];
      state.subtotal = action.payload.subtotal ?? 0;
      state.isUser = action.payload.isUser ?? false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
        state.isUser = action.payload.isUser;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
        state.isUser = action.payload.isUser;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
      })
      .addCase(syncCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.subtotal = action.payload.subtotal;
        state.isUser = action.payload.isUser;
      });
  },
});

export const { setCart } = cartSlice.actions;
export default cartSlice.reducer;
