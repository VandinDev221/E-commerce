import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createPaymentIntent, stripe } from '../services/stripe.js';
import { sendOrderConfirmation } from '../services/email.js';

const router = Router();

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
  })).min(1),
  shippingStreet: z.string().trim().min(1),
  shippingCity: z.string().trim().min(1),
  shippingState: z.string().trim().min(1),
  shippingZip: z.string().trim().min(1),
  shippingCpf: z.string().optional(),
  shippingPhone: z.string().optional(),
  paymentMethod: z.enum(['CARD', 'PIX', 'BOLETO']),
  couponCode: z.string().optional(),
  shippingCost: z.number().min(0).max(500).default(0),
});

type CheckoutBody = z.infer<typeof checkoutSchema>;

type PricedCheckoutItem = {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  image: string | null;
};

function generateOrderNumber() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeCheckoutItems(items: CheckoutBody['items']) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(quantities.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

async function getPricedCheckoutItems(items: CheckoutBody['items']) {
  const normalized = normalizeCheckoutItems(items);
  const ids = normalized.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, published: true },
    select: { id: true, name: true, price: true, stock: true, images: true },
  });

  if (products.length !== ids.length) {
    throw new AppError('Um ou mais produtos são inválidos ou indisponíveis', 400);
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  return normalized.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError('Produto inválido no checkout', 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Estoque insuficiente para ${product.name}`, 400);
    }
    return {
      productId: product.id,
      quantity: item.quantity,
      name: product.name,
      price: Number(product.price),
      image: product.images?.[0] ?? null,
    } satisfies PricedCheckoutItem;
  });
}

function calculateSubtotal(items: PricedCheckoutItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function calculateCouponDiscount(couponCode: string | undefined, subtotal: number) {
  if (!couponCode) {
    return { discount: 0, coupon: null as null | { id: string; code: string; maxUses: number | null } };
  }

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: couponCode.trim().toUpperCase(),
      active: true,
      startsAt: { lte: new Date() },
      endsAt: { gte: new Date() },
    },
  });

  if (!coupon) {
    return { discount: 0, coupon: null as null | { id: string; code: string; maxUses: number | null } };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Cupom esgotado', 400);
  }
  if (coupon.minPurchase != null && subtotal < Number(coupon.minPurchase)) {
    throw new AppError(`Valor mínimo para este cupom: R$ ${Number(coupon.minPurchase).toFixed(2)}`, 400);
  }

  const discount = coupon.type === 'PERCENTAGE'
    ? (Number(coupon.value) / 100) * subtotal
    : Math.min(Number(coupon.value), subtotal);

  return {
    discount,
    coupon: { id: coupon.id, code: coupon.code, maxUses: coupon.maxUses ?? null },
  };
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
    if (!stripe) {
      throw new AppError('Stripe não configurado no servidor', 503);
    }
    const pricedItems = await getPricedCheckoutItems(body.items);
    const subtotal = calculateSubtotal(pricedItems);
    const { discount } = await calculateCouponDiscount(body.couponCode, subtotal);
    const amount = subtotal + body.shippingCost - discount;
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
    const pricedItems = await getPricedCheckoutItems(body.items);
    const subtotal = calculateSubtotal(pricedItems);
    const { discount, coupon } = await calculateCouponDiscount(body.couponCode, subtotal);
    const couponCode = coupon?.code ?? null;
    const total = subtotal + body.shippingCost - discount;
    if (total <= 0) throw new AppError('Valor inválido', 400);
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      for (const item of pricedItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, published: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new AppError(`Estoque insuficiente para ${item.name}`, 400);
        }
      }

      if (coupon) {
        const couponUpdated = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            ...(coupon.maxUses != null && { usedCount: { lt: coupon.maxUses } }),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (couponUpdated.count !== 1) {
          throw new AppError('Cupom esgotado', 400);
        }
      }

      const createdOrder = await tx.order.create({
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
            create: pricedItems.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              image: i.image ?? undefined,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { userId } });
      return createdOrder;
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
    if (order.paymentMethod !== 'CARD') {
      throw new AppError('Confirmação manual só é permitida para pedidos com cartão', 400);
    }
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new AppError('Pedido não está aguardando pagamento', 400);
    }
    if (!stripe) {
      throw new AppError('Stripe não configurado no servidor', 503);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Pagamento ainda não foi confirmado na Stripe', 400);
    }
    if (paymentIntent.currency !== 'brl') {
      throw new AppError('Moeda inválida para o pedido', 400);
    }
    if (paymentIntent.amount_received < Math.round(Number(order.total) * 100)) {
      throw new AppError('Valor recebido menor que o total do pedido', 400);
    }

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
