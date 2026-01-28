import Stripe from 'stripe';
import { config } from '../config/index.js';

export const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2024-11-20.acacia' })
  : null;

export function createPaymentIntent(amount: number, currency = 'brl') {
  if (!stripe) throw new Error('Stripe não configurado');
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    automatic_payment_methods: { enabled: true },
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!config.stripe.webhookSecret) throw new Error('Webhook secret não configurado');
  return Stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  ) as Stripe.Event;
}
