import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import type { ProductCardData } from '../components/ProductCard';

interface PaginatedProducts {
  items: ProductCardData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Products() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedProducts | null>(null);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    api
      .get<PaginatedProducts>(`/products?${params}`)
      .then((res) => setData(res.data))
      .catch(() => setData({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [page, search, category, sort]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    return `?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {search ? `Busca: "${search}"` : 'Produtos'}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <select
          value={sort}
          onChange={(e) => navigate({ pathname: '/products', search: setParam('sort', e.target.value) })}
          className="input w-auto"
        >
          <option value="">Ordenar</option>
          <option value="newest">Mais recentes</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
          <option value="rating">Melhor avaliados</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-52 w-full bg-gray-200" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-5 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {data.items.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (p === 1) next.delete('page');
                    else next.set('page', String(p));
                    navigate({ pathname: '/products', search: `?${next.toString()}` });
                  }}
                  className={`rounded-lg px-4 py-2 ${
                    p === data.page
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-8 text-gray-500">Nenhum produto encontrado.</p>
      )}
    </div>
  );
}
