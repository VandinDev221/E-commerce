import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';
import { getDefaultImageUrl } from '../constants';
import type { CartItem } from '../store/cartSlice';

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  avgRating?: number | null;
  featured?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const image = product.images?.[0] || getDefaultImageUrl(product.name);
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/products/${product.slug}`}
        className="card block overflow-hidden transition hover:shadow-md"
      >
        <div className="relative h-52 w-full overflow-hidden bg-gray-100">
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 hover:scale-105"
          />
          {hasDiscount && (
            <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              -{discountPercent}%
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
          {product.avgRating != null && (
            <div className="mt-1 flex items-center gap-1 text-amber-500">
              <FiStar className="h-4 w-4 fill-current" />
              <span className="text-sm text-gray-600">
                {product.avgRating.toFixed(1)}
              </span>
            </div>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary-600">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                R$ {product.compareAtPrice!.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
