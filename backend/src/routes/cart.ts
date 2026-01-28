import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDefaultImageUrl } from '../lib/images.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function getCartIdentifier(req: AuthRequest): { userId?: string; sessionId?: string } {
  if (req.user) return { userId: req.user.id };
  const sessionId = (req.headers['x-cart-session'] as string) || req.cookies?.cartSession;
  if (sessionId) return { sessionId };
  return {};
}

async function loadCart(req: AuthRequest) {
  const id = getCartIdentifier(req);
  const where = id.userId ? { userId: id.userId } : { sessionId: id.sessionId! };
  const items = await prisma.cartItem.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          stock: true,
        },
      },
    },
  });
  const cartItems = items.map((i) => ({
    id: i.id,
    productId: i.product.id,
    name: i.product.name,
    slug: i.product.slug,
    price: Number(i.product.price),
    image: i.product.images[0] ?? getDefaultImageUrl(i.product.name),
    stock: i.product.stock,
    quantity: Math.min(i.quantity, i.product.stock),
  }));
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items: cartItems, subtotal, isUser: !!id.userId };
}

const addSchema = z.object({ productId: z.string().uuid(), quantity: z.number().min(1).max(99) });
const updateSchema = z.object({ quantity: z.number().min(0).max(99) });

router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = getCartIdentifier(req);
    if (!id.userId && !id.sessionId) return res.json({ items: [], subtotal: 0, isUser: false });
    const cart = await loadCart(req);
    res.json(cart);
  } catch (e) {
    next(e);
  }
});

router.post('/add', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = getCartIdentifier(req);
    if (!id.userId && !id.sessionId) throw new AppError('Envie header x-cart-session ou faça login', 400);
    const body = addSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product || !product.published) throw new AppError('Produto não encontrado', 404);
    if (product.stock < body.quantity) throw new AppError('Estoque insuficiente', 400);

    if (id.userId) {
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: id.userId, productId: body.productId } },
      });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(existing.quantity + body.quantity, product.stock) },
        });
      } else {
        await prisma.cartItem.create({
          data: { userId: id.userId, productId: body.productId, quantity: body.quantity },
        });
      }
    } else {
      const existing = await prisma.cartItem.findFirst({
        where: { sessionId: id.sessionId!, productId: body.productId },
      });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(existing.quantity + body.quantity, product.stock) },
        });
      } else {
        await prisma.cartItem.create({
          data: { sessionId: id.sessionId!, productId: body.productId, quantity: body.quantity },
        });
      }
    }
    const cart = await loadCart(req);
    res.json(cart);
  } catch (e) {
    next(e);
  }
});

router.patch('/:itemId', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = getCartIdentifier(req);
    if (!id.userId && !id.sessionId) throw new AppError('Carrinho não identificado', 400);
    const { quantity } = updateSchema.parse(req.body);
    const where = id.userId
      ? { id: req.params.itemId, userId: id.userId }
      : { id: req.params.itemId, sessionId: id.sessionId };
    if (quantity === 0) {
      await prisma.cartItem.deleteMany({ where });
    } else {
      await prisma.cartItem.updateMany({
        where,
        data: { quantity },
      });
    }
    res.json(await loadCart(req));
  } catch (e) {
    next(e);
  }
});

router.delete('/:itemId', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = getCartIdentifier(req);
    if (!id.userId && !id.sessionId) throw new AppError('Carrinho não identificado', 400);
    const where = id.userId
      ? { id: req.params.itemId, userId: id.userId }
      : { id: req.params.itemId, sessionId: id.sessionId };
    await prisma.cartItem.deleteMany({ where });
    res.json(await loadCart(req));
  } catch (e) {
    next(e);
  }
});

router.post('/sync', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = (req.headers['x-cart-session'] as string) || req.cookies?.cartSession;
    if (!req.user || !sessionId) return res.json(await loadCart(req));
    const sessionItems = await prisma.cartItem.findMany({
      where: { sessionId },
      include: { product: true },
    });
    for (const item of sessionItems) {
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: req.user!.id, productId: item.productId } },
      });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(existing.quantity + item.quantity, item.product.stock) },
        });
      } else {
        await prisma.cartItem.create({
          data: { userId: req.user!.id, productId: item.productId, quantity: item.quantity },
        });
      }
      await prisma.cartItem.delete({ where: { id: item.id } });
    }
    res.json(await loadCart(req));
  } catch (e) {
    next(e);
  }
});

export const cartRoutes = router;
