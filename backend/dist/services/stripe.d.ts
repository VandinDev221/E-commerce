import Stripe from 'stripe';
export declare const stripe: Stripe | null;
export declare function createPaymentIntent(amount: number, currency?: string): Promise<Stripe.Response<Stripe.PaymentIntent>>;
export declare function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event;
//# sourceMappingURL=stripe.d.ts.map