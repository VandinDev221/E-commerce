import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../api/client';
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
  const [showFullDescription, setShowFullDescription] = useState(false);
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
    setShowFullDescription(false);
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

  const images = product.images?.length ? product.images : [];
  const currentImage = images.length ? images[imageIndex % images.length] ?? images[0] : '';
  const hasMultiple = images.length > 1;
  const productDescription = product.description?.trim() || 'Descrição indisponível para este produto.';
  const hasLongDescription = productDescription.length > 180;
  const installmentPrice = product.price / 10;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-3 text-xs text-gray-500">
        página inicial &gt; produtos &gt; {product.name.toLowerCase()}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr_340px]">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={`${product.name} - imagem ${imageIndex + 1}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                  Sem imagem real deste produto
                </div>
              )}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={() => setImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow transition hover:bg-gray-100"
                    aria-label="Imagem anterior"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow transition hover:bg-gray-100"
                    aria-label="Próxima imagem"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {images.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                      i === imageIndex ? 'border-red-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900">{product.name}</h1>
            {product.avgRating != null && (
              <div className="mt-3 flex items-center gap-2">
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
            <div className="mt-5 space-y-2 text-sm text-gray-700">
              <p
                className={`whitespace-pre-line leading-6 ${
                  showFullDescription ? '' : 'line-clamp-2'
                }`}
              >
                {productDescription}
              </p>
              {hasLongDescription && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((v) => !v)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver mais'}
                </button>
              )}
            </div>
            <p className="mt-4 text-sm text-gray-500">Estoque: {product.stock} unidades</p>
          </div>

          <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-4xl font-bold text-red-600">R$ {product.price.toFixed(2).replace('.', ',')}</p>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <p className="mt-1 text-sm text-gray-400 line-through">
                R$ {product.compareAtPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              em até 10x de R$ {installmentPrice.toFixed(2).replace('.', ',')} sem juros
            </p>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-gray-700">quantidade:</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-gray-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-10 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={product.stock < 1}
              className="mt-5 w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              comprar
            </button>
          </aside>
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
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                      Sem imagem real
                    </div>
                  )}
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
