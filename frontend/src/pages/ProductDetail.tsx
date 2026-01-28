import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { getDefaultImageUrl } from '../constants';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import type { RootState } from '../store';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  images: string[];
  avgRating: number | null;
  reviewCount: number;
  related: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    avgRating: number | null;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    content: string | null;
    createdAt: string;
    user: { name: string | null };
  }>;
}

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),
});

type ReviewForm = z.infer<typeof reviewSchema>;

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const { user } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5 },
  });

  useEffect(() => {
    if (!slug) return;
    api
      .get<Product>(`/products/${slug}`)
      .then((res) => setProduct(res.data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    setImageIndex(0);
  }, [product?.id]);

  const add = () => {
    if (!product) return;
    dispatch(addToCart({ productId: product.id, quantity }))
      .unwrap()
      .then(() => toast.success('Adicionado ao carrinho'))
      .catch((e: Error) => toast.error(e.message));
  };

  const onSubmitReview = (data: ReviewForm) => {
    if (!product || !user) {
      toast.error('Faça login para avaliar');
      return;
    }
    api
      .post(`/products/${product.id}/reviews`, data)
      .then(() => {
        toast.success('Avaliação enviada');
        reset();
        api.get<Product>(`/products/${product.slug}`).then((res) => setProduct(res.data));
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-gray-500">Produto não encontrado.</p>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images
    : [getDefaultImageUrl()];
  const currentImage = images[imageIndex % images.length] ?? images[0];
  const hasMultiple = images.length > 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
          <img
            src={currentImage}
            alt={`${product.name} - imagem ${imageIndex + 1}`}
            className="h-full w-full object-cover"
          />
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => setImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-white"
                aria-label="Imagem anterior"
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-white"
                aria-label="Próxima imagem"
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`h-2 w-2 rounded-full transition ${
                      i === imageIndex ? 'bg-white ring-2 ring-gray-400' : 'bg-white/60 hover:bg-white/80'
                    }`}
                    aria-label={`Ir para imagem ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.avgRating != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <FiStar
                    key={i}
                    className={`h-5 w-5 ${i <= product.avgRating! ? 'fill-current' : ''}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.avgRating.toFixed(1)} ({product.reviewCount} avaliações)
              </span>
            </div>
          )}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-600">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-lg text-gray-400 line-through">
                R$ {product.compareAtPrice.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
          <p className="mt-4 text-gray-600">{product.description}</p>
          <p className="mt-2 text-sm text-gray-500">Estoque: {product.stock} unidades</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                −
              </button>
              <span className="w-12 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={product.stock < 1}
              className="btn-primary flex-1 sm:flex-none"
            >
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 border-t border-gray-200 pt-12">
        <h2 className="text-xl font-bold text-gray-900">Avaliações</h2>
        {user && (
          <form onSubmit={handleSubmit(onSubmitReview)} className="mt-4 max-w-md space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sua nota</label>
              <select {...register('rating', { valueAsNumber: true })} className="input">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} estrelas
                  </option>
                ))}
              </select>
            </div>
            <input
              {...register('title')}
              placeholder="Título (opcional)"
              className="input"
            />
            <textarea
              {...register('content')}
              placeholder="Comentário (opcional)"
              className="input min-h-[80px]"
              rows={3}
            />
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating.message}</p>
            )}
            <button type="submit" className="btn-primary">
              Enviar avaliação
            </button>
          </form>
        )}
        <ul className="mt-8 space-y-4">
          {product.reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FiStar key={i} className={`h-4 w-4 ${i <= r.rating ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <span className="font-medium">{r.user.name || 'Anônimo'}</span>
                <span className="text-sm text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {r.title && <p className="mt-1 font-medium">{r.title}</p>}
              {r.content && <p className="mt-1 text-gray-600">{r.content}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* Related */}
      {product.related.length > 0 && (
        <section className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="text-xl font-bold text-gray-900">Produtos relacionados</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.related.map((p) => (
              <a
                key={p.id}
                href={`/products/${p.slug}`}
                className="card block overflow-hidden"
              >
                <div className="h-52 w-full overflow-hidden bg-gray-100">
                  <img
                    src={p.images?.[0] || getDefaultImageUrl(p.name)}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="font-medium text-gray-900 line-clamp-2">{p.name}</p>
                  <p className="text-primary-600">
                    R$ {p.price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
