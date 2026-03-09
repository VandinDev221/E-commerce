import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis.js';
import { getDefaultImageUrl, normalizeProductImages } from '../lib/images.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'rating']).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

type ReviewStats = { avgRating: number | null; reviewCount: number };

async function getReviewStatsByProductIds(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, ReviewStats>();
  const grouped = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map<string, ReviewStats>(
    grouped.map((g) => [
      g.productId,
      { avgRating: g._avg.rating != null ? Number(g._avg.rating) : null, reviewCount: g._count.rating },
    ])
  );
}

router.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    const q = querySchema.parse(req.query);
    const cacheKey = `products:${JSON.stringify(q)}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return res.json(cached);

    const skip = (q.page - 1) * q.limit;
    const where: Record<string, unknown> = { published: true };

    if (q.category) {
      const cat = await prisma.category.findFirst({
        where: { OR: [{ slug: q.category }, { id: q.category }] },
      });
      if (cat) where.categoryId = cat.id;
    }
    if (q.minPrice != null || q.maxPrice != null) {
      where.price = {};
      if (q.minPrice != null) (where.price as Record<string, number>).gte = q.minPrice;
      if (q.maxPrice != null) (where.price as Record<string, number>).lte = q.maxPrice;
    }
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.featured === 'true') where.featured = true;

    const orderBy: Record<string, string> =
      q.sort === 'price_asc'
        ? { price: 'asc' }
        : q.sort === 'price_desc'
          ? { price: 'desc' }
          : q.sort === 'newest'
            ? { createdAt: 'desc' }
            : { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: q.limit,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          images: true,
          createdAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);
    const reviewStats = await getReviewStatsByProductIds(products.map((p) => p.id));

    const items = products.map((p) => ({
      ...p,
      images: normalizeProductImages(p.images, p.name),
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      avgRating: reviewStats.get(p.id)?.avgRating ?? null,
      reviewCount: reviewStats.get(p.id)?.reviewCount ?? 0,
    }));

    const response = {
      items,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.ceil(total / q.limit),
    };
    await cacheSet(cacheKey, response, 300);
    res.json(response);
  } catch (e) {
    next(e);
  }
});

router.get('/featured', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    const cached = await cacheGet<unknown>('products:featured');
    if (cached) return res.json(cached);
    const products = await prisma.product.findMany({
      where: { featured: true, published: true },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        images: true,
        createdAt: true,
      },
    });
    const reviewStats = await getReviewStatsByProductIds(products.map((p) => p.id));
    const items = products.map((p) => ({
      ...p,
      images: normalizeProductImages(p.images, p.name),
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      avgRating: reviewStats.get(p.id)?.avgRating ?? null,
      reviewCount: reviewStats.get(p.id)?.reviewCount ?? 0,
    }));
    await cacheSet('products:featured', items, 600);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get('/search/suggestions', async (req, res, next) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.json([]);
    const products = await prisma.product.findMany({
      where: {
        published: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 8,
      select: { id: true, name: true, slug: true, images: true, price: true },
    });
    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images[0] ?? getDefaultImageUrl(p.name),
        price: Number(p.price),
      }))
    );
  } catch (e) {
    next(e);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    const slug = req.params.slug;
    const cacheKey = `product:${slug}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return res.json(cached);

    const product = await prisma.product.findUnique({
      where: { slug, published: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        reviews: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!product) throw new AppError('Produto não encontrado', 404);

    const related = await prisma.product.findMany({
      where: {
        published: true,
        categoryId: product.categoryId ?? undefined,
        id: { not: product.id },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: true,
      },
    });
    const relatedStats = await getReviewStatsByProductIds(related.map((p) => p.id));

    const result = {
      ...product,
      images: normalizeProductImages(product.images, product.name),
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      avgRating:
        product.reviews.length > 0
          ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length
          : null,
      reviewCount: product.reviews.length,
      related: related.map((p) => ({
        ...p,
        images: normalizeProductImages(p.images, p.name),
        price: Number(p.price),
        avgRating: relatedStats.get(p.id)?.avgRating ?? null,
        reviewCount: relatedStats.get(p.id)?.reviewCount ?? 0,
      })),
    };
    await cacheSet(cacheKey, result, 300);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/reviews', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const schema = z.object({
      rating: z.number().min(1).max(5),
      title: z.string().optional(),
      content: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const productId = req.params.id;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('Produto não encontrado', 404);

    await prisma.review.upsert({
      where: {
        productId_userId: { productId, userId },
      },
      create: { productId, userId, ...body },
      update: body,
    });
    await cacheDel(`product:${product.slug}`);
    res.json({ message: 'Avaliação salva' });
  } catch (e) {
    next(e);
  }
});

export const productRoutes = router;
