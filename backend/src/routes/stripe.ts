import { Router } from 'express';
import type Stripe from 'stripe';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { constructWebhookEvent } from '../services/stripe.js';

const router = Router();

router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string' || signature.length === 0) {
      throw new AppError('Assinatura Stripe ausente', 400);
    }
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError('Payload inválido para webhook Stripe', 400);
    }
    if (!config.stripe.webhookSecret) {
      throw new AppError('Webhook Stripe não configurado no servidor', 503);
    }

    const event = constructWebhookEvent(req.body, signature);

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await prisma.order.updateMany({
        where: { paymentId: intent.id, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'PAID' },
      });
    }

    if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await prisma.order.updateMany({
        where: { paymentId: intent.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    }

    res.json({ received: true });
  } catch (e) {
    next(e);
  }
});

export const stripeRoutes = router;
