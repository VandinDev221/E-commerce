import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/authSlice';
import { fetchCart } from './store/cartSlice';
import { setCartSession } from './api/client';
import type { RootState } from './store';

import Layout from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Admin, {
  AdminDashboard,
  AdminProducts,
  AdminProductForm,
  AdminOrders,
  AdminUsers,
  AdminCoupons,
} from './pages/Admin';
import ShippingLabel from './pages/ShippingLabel';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';

function PrivateRoute({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { user, checked } = useSelector((s: RootState) => s.auth);
  if (!checked) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    let cartSession = localStorage.getItem('cartSession');
    if (!cartSession) {
      cartSession = crypto.randomUUID?.() ?? `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('cartSession', cartSession);
    }
    setCartSession(cartSession);
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="admin"
          element={
            <PrivateRoute admin>
              <Admin />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id" element={<AdminProductForm />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id/label" element={<ShippingLabel />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="coupons" element={<AdminCoupons />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
