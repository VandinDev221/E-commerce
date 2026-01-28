import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { getDefaultImageUrl } from '../lib/images.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function withDefaultCover<T extends { coverImage: string | null; title: string }>(p: T): T & { coverImage: string } {
  return { ...p, coverImage: p.coverImage ?? getDefaultImageUrl(p.title) };
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Number(req.query.limit) || 10);
    const cacheKey = `blog:list:${page}:${limit}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return res.json(cached);

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, createdAt: true },
      }),
      prisma.post.count({ where: { published: true } }),
    ]);
    const items = posts.map(withDefaultCover);
    const result = { items, total, page, totalPages: Math.ceil(total / limit) };
    await cacheSet(cacheKey, result, 300);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, published: true },
    });
    if (!post) throw new AppError('Post não encontrado', 404);
    res.json(withDefaultCover(post));
  } catch (e) {
    next(e);
  }
});

export const blogRoutes = router;
