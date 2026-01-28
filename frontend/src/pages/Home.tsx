import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Bem-vindo à nossa loja
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-primary-100">
              Encontre os melhores produtos com preços especiais e entrega rápida.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 font-medium text-primary-700 hover:bg-primary-50"
              >
                Ver produtos
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center rounded-lg border-2 border-white/50 px-6 py-3 font-medium hover:bg-white/10"
              >
                Blog
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Produtos em destaque</h2>
          <Link to="/products" className="text-primary-600 hover:underline">
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
        ) : (
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
        )}
      </section>
    </div>
  );
}
