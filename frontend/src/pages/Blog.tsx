import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { getDefaultImageUrl } from '../constants';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  createdAt: string;
}

interface Paginated {
  items: Post[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [data, setData] = useState<Paginated | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated>('/blog', { params: { page, limit: 9 } })
      .then((res) => setData(res.data))
      .catch(() => setData({ items: [], total: 0, page: 1, totalPages: 0 }))
      .finally(() => setLoading(false));
  }, [page]);

  const goToPage = (p: number) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="mt-2 text-gray-600">
          Dicas, novidades e tendências para você aproveitar melhor suas compras.
        </p>
      </header>

      {data && data.items.length > 0 ? (
        <>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <li key={post.id} className="card overflow-hidden">
                <Link to={`/blog/${post.slug}`} className="block hover:opacity-95">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-gray-100">
                    <img
                      src={post.coverImage || getDefaultImageUrl(post.title)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <time className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </time>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900 line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {post.excerpt || 'Leia mais.'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2" aria-label="Paginação">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="flex items-center px-3 text-sm text-gray-600">
                Página {page} de {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= data.totalPages}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      ) : (
        <p className="mt-8 text-gray-500">Nenhum post ainda.</p>
      )}
    </div>
  );
}
