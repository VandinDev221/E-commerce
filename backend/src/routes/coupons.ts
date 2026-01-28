import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/validate', async (req, res, next) => {
  try {
    const { code, subtotal } = z.object({
      code: z.string().min(1),
      subtotal: z.number().min(0),
    }).parse(req.body);

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        active: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
    });
    if (!coupon) throw new AppError('Cupom inválido ou expirado', 400);
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new AppError('Cupom esgotado', 400);
    }
    if (coupon.minPurchase != null && subtotal < Number(coupon.minPurchase)) {
      throw new AppError(`Valor mínimo para este cupom: R$ ${Number(coupon.minPurchase).toFixed(2)}`, 400);
    }
    let discount: number;
    if (coupon.type === 'PERCENTAGE') {
      discount = (Number(coupon.value) / 100) * subtotal;
    } else {
      discount = Math.min(Number(coupon.value), subtotal);
    }
    res.json({
      valid: true,
      code: coupon.code,
      discount,
      type: coupon.type,
      value: Number(coupon.value),
    });
  } catch (e) {
    next(e);
  }
});

export const couponRoutes = router;
