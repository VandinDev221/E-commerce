import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadImage } from '../services/upload.js';
import { cacheDel } from '../lib/redis.js';
import { getDefaultImageUrl, normalizeProductImages } from '../lib/images.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authMiddleware);
router.use(requireAdmin);
// Products CRUD
const productSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).optional(),
    stock: z.number().int().min(0),
    sku: z.string().optional(),
    categoryId: z.string().uuid().optional().nullable(),
    featured: z.boolean().optional(),
    published: z.boolean().optional(),
    images: z.array(z.string().min(1)).optional(),
});
function slugify(s) {
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
router.get('/products', async (_req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            include: { category: { select: { name: true, slug: true } } },
        });
        res.json(products.map((p) => ({
            ...p,
            images: normalizeProductImages(p.images, p.name),
            price: Number(p.price),
            compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        })));
    }
    catch (e) {
        next(e);
    }
});
router.post('/products', upload.array('images', 10), async (req, res, next) => {
    try {
        const body = productSchema.parse(JSON.parse(req.body.data || '{}'));
        const slug = body.slug || slugify(body.name);
        const existing = await prisma.product.findUnique({ where: { slug } });
        if (existing)
            throw new AppError('Slug já existe', 400);
        const files = req.files;
        let images = Array.isArray(body.images) ? [...body.images] : [];
        if (files?.length) {
            for (const file of files) {
                const url = await uploadImage(file.buffer, 'products');
                images.push(url);
            }
        }
        if (images.length === 0)
            images = [getDefaultImageUrl(body.name)];
        const product = await prisma.product.create({
            data: {
                ...body,
                slug,
                images,
                featured: body.featured ?? false,
                published: body.published ?? true,
            },
        });
        res.status(201).json({ ...product, price: Number(product.price) });
    }
    catch (e) {
        next(e);
    }
});
router.get('/products/:id', async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { category: true },
        });
        if (!product)
            throw new AppError('Produto não encontrado', 404);
        res.json({
            ...product,
            images: normalizeProductImages(product.images, product.name),
            price: Number(product.price),
            compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        });
    }
    catch (e) {
        next(e);
    }
});
router.put('/products/:id', upload.array('images', 10), async (req, res, next) => {
    try {
        const body = productSchema.partial().parse(JSON.parse(req.body.data || '{}'));
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product)
            throw new AppError('Produto não encontrado', 404);
        const files = req.files;
        let images = product.images;
        if (files?.length) {
            const newUrls = [];
            for (const file of files) {
                const url = await uploadImage(file.buffer, 'products');
                newUrls.push(url);
            }
            images = [...images, ...newUrls];
        }
        if (body.images !== undefined)
            images = body.images;
        const slug = body.slug ?? product.slug;
        const updated = await prisma.product.update({
            where: { id: req.params.id },
            data: { ...body, images },
        });
        await cacheDel(`product:${product.slug}`);
        res.json({ ...updated, price: Number(updated.price) });
    }
    catch (e) {
        next(e);
    }
});
router.delete('/products/:id', async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!product)
            throw new AppError('Produto não encontrado', 404);
        await prisma.product.delete({ where: { id: req.params.id } });
        await cacheDel(`product:${product.slug}`);
        res.json({ message: 'Produto removido' });
    }
    catch (e) {
        next(e);
    }
});
// Categories
router.get('/categories', async (_req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    }
    catch (e) {
        next(e);
    }
});
router.post('/categories', async (req, res, next) => {
    try {
        const body = z.object({
            name: z.string().min(1),
            slug: z.string().optional(),
            description: z.string().optional(),
            parentId: z.string().uuid().optional().nullable(),
        }).parse(req.body);
        const slug = body.slug || slugify(body.name);
        const category = await prisma.category.create({
            data: { ...body, slug },
        });
        res.status(201).json(category);
    }
    catch (e) {
        next(e);
    }
});
// Orders
router.get('/orders', async (_req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: { items: true },
        });
        res.json(orders.map((o) => ({
            ...o,
            subtotal: Number(o.subtotal),
            shippingCost: Number(o.shippingCost),
            discount: Number(o.discount),
            total: Number(o.total),
        })));
    }
    catch (e) {
        next(e);
    }
});
router.patch('/orders/:id/status', async (req, res, next) => {
    try {
        const { status } = z.object({
            status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
        }).parse(req.body);
        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: { status, ...(status === 'SHIPPED' && { trackingCode: `BR${Date.now()}` }) },
        });
        res.json(order);
    }
    catch (e) {
        next(e);
    }
});
// Users
router.get('/users', async (_req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    }
    catch (e) {
        next(e);
    }
});
router.post('/users', async (req, res, next) => {
    try {
        const body = z
            .object({
            email: z.string().email(),
            name: z.string().min(1).optional(),
            password: z.string().min(6),
            role: z.enum(['USER', 'ADMIN']).optional(),
        })
            .parse(req.body);
        const existing = await prisma.user.findUnique({ where: { email: body.email } });
        if (existing) {
            throw new AppError('E-mail já cadastrado', 400);
        }
        const passwordHash = await bcrypt.hash(body.password, 10);
        const user = await prisma.user.create({
            data: {
                email: body.email,
                name: body.name,
                passwordHash,
                role: body.role ?? 'USER',
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        res.status(201).json(user);
    }
    catch (e) {
        next(e);
    }
});
router.patch('/users/:id/role', async (req, res, next) => {
    try {
        const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(req.body);
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
        });
        res.json({ id: user.id, role: user.role });
    }
    catch (e) {
        next(e);
    }
});
// Coupons
router.get('/coupons', async (_req, res, next) => {
    try {
        const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(coupons.map((c) => ({
            ...c,
            value: Number(c.value),
            minPurchase: c.minPurchase ? Number(c.minPurchase) : null,
        })));
    }
    catch (e) {
        next(e);
    }
});
router.post('/coupons', async (req, res, next) => {
    try {
        const body = z.object({
            code: z.string().min(1),
            type: z.enum(['PERCENTAGE', 'FIXED']),
            value: z.number().min(0),
            minPurchase: z.number().min(0).optional(),
            maxUses: z.number().int().min(0).optional(),
            startsAt: z.string().datetime(),
            endsAt: z.string().datetime(),
        }).parse(req.body);
        const coupon = await prisma.coupon.create({
            data: {
                ...body,
                code: body.code.toUpperCase(),
                startsAt: new Date(body.startsAt),
                endsAt: new Date(body.endsAt),
            },
        });
        res.status(201).json(coupon);
    }
    catch (e) {
        next(e);
    }
});
// Stats
router.get('/stats', async (_req, res, next) => {
    try {
        const [totalOrders, totalRevenue, totalProducts, totalUsers] = await Promise.all([
            prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
            prisma.order.aggregate({
                where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
                _sum: { total: true },
            }),
            prisma.product.count(),
            prisma.user.count(),
        ]);
        res.json({
            totalOrders,
            totalRevenue: totalRevenue._sum.total ? Number(totalRevenue._sum.total) : 0,
            totalProducts,
            totalUsers,
        });
    }
    catch (e) {
        next(e);
    }
});
// Blog (admin)
router.get('/posts', async (_req, res, next) => {
    try {
        const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(posts);
    }
    catch (e) {
        next(e);
    }
});
router.post('/posts', async (req, res, next) => {
    try {
        const body = z.object({
            title: z.string().min(1),
            slug: z.string().optional(),
            excerpt: z.string().optional(),
            content: z.string(),
            published: z.boolean().optional(),
        }).parse(req.body);
        const slug = body.slug || slugify(body.title);
        const post = await prisma.post.create({
            data: { ...body, slug, published: body.published ?? false },
        });
        res.status(201).json(post);
    }
    catch (e) {
        next(e);
    }
});
router.put('/posts/:id', async (req, res, next) => {
    try {
        const body = z.object({
            title: z.string().min(1).optional(),
            slug: z.string().optional(),
            excerpt: z.string().optional(),
            content: z.string().optional(),
            published: z.boolean().optional(),
        }).parse(req.body);
        const post = await prisma.post.update({
            where: { id: req.params.id },
            data: body,
        });
        res.json(post);
    }
    catch (e) {
        next(e);
    }
});
export const adminRoutes = router;
//# sourceMappingURL=admin.js.map