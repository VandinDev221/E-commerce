import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiUser, FiMenu, FiX, FiSearch, FiHeart } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useSelector((s: RootState) => s.auth);
  const cartItems = useSelector((s: RootState) => s.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="text-xl font-bold text-primary-600">
          E-commerce
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/products" className="text-gray-600 hover:text-primary-600">
            Produtos
          </Link>
          <Link to="/blog" className="text-gray-600 hover:text-primary-600">
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Buscar"
          >
            <FiSearch className="h-5 w-5" />
          </button>
          {user && (
            <Link
              to="/profile"
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Lista de desejos"
            >
              <FiHeart className="h-5 w-5" />
            </Link>
          )}
          <Link
            to="/cart"
            className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Carrinho"
          >
            <FiShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-medium text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full p-2 text-gray-600 hover:bg-gray-100"
              >
                <FiUser className="h-5 w-5" />
                <span className="max-w-[100px] truncate text-sm">{user.name || user.email}</span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Meu perfil
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Meus pedidos
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Painel admin
                      </Link>
                    )}
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false);
                        dispatch(logout());
                      }}
                    >
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 md:inline-block"
            >
              Entrar
            </Link>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-white md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              <Link to="/products" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
                Produtos
              </Link>
              <Link to="/blog" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
                Blog
              </Link>
              {user ? (
                <>
                  <Link to="/profile" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
                    Meu perfil
                  </Link>
                  <Link to="/orders" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
                    Meus pedidos
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link to="/admin" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-left text-red-600 hover:bg-gray-50"
                    onClick={() => dispatch(logout())}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link to="/login" className="rounded-lg px-3 py-2 text-primary-600 hover:bg-gray-50">
                  Entrar
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-16 border-b border-gray-200 bg-white p-4 shadow-lg"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate({
                    pathname: '/products',
                    search: `?search=${encodeURIComponent(searchQuery.trim())}`,
                  });
                }
                setSearchOpen(false);
              }}
              className="mx-auto flex max-w-xl gap-2"
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produtos..."
                className="input flex-1"
                autoFocus
              />
              <button type="submit" className="btn-primary">
                Buscar
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
