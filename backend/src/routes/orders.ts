import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createPaymentIntent } from '../services/stripe.js';
import { sendOrderConfirmation } from '../services/email.js';

const router = Router();

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().min(1),
    price: z.number(),
    name: z.string(),
    image: z.string().optional(),
  })),
  shippingStreet: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  shippingZip: z.string().min(1),
  shippingCpf: z.string().optional(),
  shippingPhone: z.string().optional(),
  paymentMethod: z.enum(['CARD', 'PIX', 'BOLETO']),
  couponCode: z.string().optional(),
  shippingCost: z.number().min(0).default(0),
});

function generateOrderNumber() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
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
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { items: true },
    });
    if (!order) throw new AppError('Pedido não encontrado', 404);
    res.json({
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/create-payment-intent', async (req: AuthRequest, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const total = body.items.reduce((s, i) => s + i.price * i.quantity, 0)
      + body.shippingCost
      - (body.couponCode ? 0 : 0); // discount applied server-side with coupon
    let discount = 0;
    if (body.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: body.couponCode.toUpperCase(),
          active: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
      });
      if (coupon) {
        const subtotal = body.items.reduce((s, i) => s + i.price * i.quantity, 0);
        if (coupon.type === 'PERCENTAGE') {
          discount = (Number(coupon.value) / 100) * subtotal;
        } else {
          discount = Math.min(Number(coupon.value), subtotal);
        }
      }
    }
    const amount = total - discount;
    if (amount <= 0) throw new AppError('Valor inválido', 400);
    const paymentIntent = await createPaymentIntent(amount);
    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: Math.round(amount * 100),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const userId = req.user!.id;
    let discount = 0;
    let couponCode: string | null = null;
    if (body.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: body.couponCode.toUpperCase(),
          active: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
      });
      if (coupon) {
        const subtotal = body.items.reduce((s, i) => s + i.price * i.quantity, 0);
        if (coupon.type === 'PERCENTAGE') {
          discount = (Number(coupon.value) / 100) * subtotal;
        } else {
          discount = Math.min(Number(coupon.value), subtotal);
        }
        couponCode = coupon.code;
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }
    const subtotal = body.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const total = subtotal + body.shippingCost - discount;
    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING',
        paymentMethod: body.paymentMethod,
        subtotal,
        shippingCost: body.shippingCost,
        discount,
        total,
        couponCode,
        shippingStreet: body.shippingStreet,
        shippingCity: body.shippingCity,
        shippingState: body.shippingState,
        shippingZip: body.shippingZip,
        ...(body.shippingCpf != null && body.shippingCpf !== '' && { shippingCpf: body.shippingCpf.replace(/\D/g, '') }),
        ...(body.shippingPhone != null && body.shippingPhone !== '' && { shippingPhone: body.shippingPhone.replace(/\D/g, '') }),
        items: {
          create: body.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
          })),
        },
      },
      include: { items: true },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await sendOrderConfirmation(user.email, orderNumber, `R$ ${total.toFixed(2)}`);
    }
    res.status(201).json({
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/payment', async (req: AuthRequest, res, next) => {
  try {
    const { paymentId } = z.object({ paymentId: z.string() }).parse(req.body);
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!order) throw new AppError('Pedido não encontrado', 404);
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId, status: 'PAID' },
    });
    res.json({ message: 'Pagamento confirmado' });
  } catch (e) {
    next(e);
  }
});

export const orderRoutes = router;
