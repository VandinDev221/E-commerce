import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { cacheGet, cacheSet } from '../lib/redis.js';
const router = Router();
router.get('/', async (_req, res, next) => {
    try {
        const cached = await cacheGet('categories:all');
        if (cached)
            return res.json(cached);
        const categories = await prisma.category.findMany({
            where: { parentId: null },
            include: {
                children: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { name: 'asc' },
        });
        await cacheSet('categories:all', categories, 3600);
        res.json(categories);
    }
    catch (e) {
        next(e);
    }
});
router.get('/:slug', async (req, res, next) => {
    try {
        const category = await prisma.category.findUnique({
            where: { slug: req.params.slug },
            include: { children: true, parent: true },
        });
        if (!category)
            return res.status(404).json({ error: 'Categoria não encontrada' });
        res.json(category);
    }
    catch (e) {
        next(e);
    }
});
export const categoryRoutes = router;
//# sourceMappingURL=categories.js.map