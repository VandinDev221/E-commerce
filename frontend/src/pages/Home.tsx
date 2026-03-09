import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiCreditCard, FiHeadphones, FiTruck } from 'react-icons/fi';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import type { ProductCardData } from '../components/ProductCard';

export default function Home() {
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ProductCardData[]>('/products/featured')
      .then((res) => setFeatured(res.data))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-primary-500/20 bg-gradient-to-br from-primary-700 via-primary-700 to-primary-900 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-primary-300/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-100">
              Loja oficial
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Compre com segurança e entrega rápida
            </h1>
            <p className="mt-4 max-w-2xl text-base text-primary-100 sm:text-lg">
              Catálogo atualizado, pagamento protegido e suporte dedicado para você comprar com confiança.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 font-semibold text-primary-700 shadow-lg shadow-primary-900/30 hover:bg-primary-50"
              >
                Ver produtos
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center rounded-lg border border-white/40 px-6 py-3 font-medium hover:bg-white/10"
              >
                Dicas no blog
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-primary-100">
              <span className="inline-flex items-center gap-2"><FiCheckCircle /> Loja verificada</span>
              <span className="inline-flex items-center gap-2"><FiTruck /> Envio para todo Brasil</span>
              <span className="inline-flex items-center gap-2"><FiCreditCard /> Checkout seguro</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative z-10"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-primary-200">Produtos</p>
                <p className="mt-1 text-2xl font-bold">+1000</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-primary-200">Clientes</p>
                <p className="mt-1 text-2xl font-bold">+12 mil</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-primary-200">Entregas no prazo</p>
                <p className="mt-1 text-2xl font-bold">98%</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-primary-200">Suporte</p>
                <p className="mt-1 text-2xl font-bold">7 dias</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-4 px-4 sm:grid-cols-3 sm:px-6">
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900">Frete competitivo</p>
          <p className="mt-1 text-sm text-gray-600">Cálculo transparente e opções de envio por região.</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900">Pagamento confiável</p>
          <p className="mt-1 text-sm text-gray-600">Fluxo protegido com confirmação de transação.</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900">Atendimento humano</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600">
            <FiHeadphones className="text-primary-600" />
            Suporte rápido antes e depois da compra.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Produtos em destaque</h2>
          <Link to="/products" className="text-sm font-medium text-primary-600 hover:underline">
            Ver todos
          </Link>
        </div>
        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-52 w-full bg-gray-200" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-5 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
              hidden: {},
            }}
            className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
          >
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </motion.div>
        ) : (
          <div className="card mt-8 p-6 text-center text-sm text-gray-600">
            Nenhum produto em destaque no momento.
          </div>
        )}
      </section>
    </div>
  );
}
