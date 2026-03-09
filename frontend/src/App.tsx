import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/authSlice';
import { setCartSession } from './api/client';
import type { RootState } from './store';

import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const AdminDashboard = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminProducts })));
const AdminProductForm = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminProductForm })));
const AdminOrders = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminOrders })));
const AdminUsers = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminUsers })));
const AdminCoupons = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminCoupons })));
const ShippingLabel = lazy(() => import('./pages/ShippingLabel'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  );
}

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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}
