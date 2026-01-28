import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDefaultImageUrl } from '../lib/images.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
const router = Router();
router.use(authMiddleware);
router.get('/', async (req, res, next) => {
    try {
        const items = await prisma.wishlistItem.findMany({
            where: { userId: req.user.id },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        price: true,
                        compareAtPrice: true,
                        images: true,
                        stock: true,
                    },
                },
            },
        });
        res.json(items.map((i) => ({
            id: i.id,
            productId: i.product.id,
            name: i.product.name,
            slug: i.product.slug,
            price: Number(i.product.price),
            compareAtPrice: i.product.compareAtPrice ? Number(i.product.compareAtPrice) : null,
            image: i.product.images[0] ?? getDefaultImageUrl(i.product.name),
            stock: i.product.stock,
            addedAt: i.createdAt,
        })));
    }
    catch (e) {
        next(e);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { productId } = z.object({ productId: z.string().uuid() }).parse(req.body);
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new AppError('Produto não encontrado', 404);
        await prisma.wishlistItem.upsert({
            where: { userId_productId: { userId: req.user.id, productId } },
            create: { userId: req.user.id, productId },
            update: {},
        });
        res.status(201).json({ message: 'Adicionado à lista de desejos' });
    }
    catch (e) {
        next(e);
    }
});
router.delete('/:productId', async (req, res, next) => {
    try {
        await prisma.wishlistItem.deleteMany({
            where: { userId: req.user.id, productId: req.params.productId },
        });
        res.json({ message: 'Removido da lista de desejos' });
    }
    catch (e) {
        next(e);
    }
});
export const wishlistRoutes = router;
//# sourceMappingURL=wishlist.js.map