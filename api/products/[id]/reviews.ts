import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rota dedicada para `/api/products/:id/reviews`.
 * (Garantia extra para subpaths com múltiplos segmentos.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  // Se chegar como "/reviews" ou similar, prefixa com o id via query da Vercel.
  // Na prática, a URL que chega costuma ser `/api/products/<id>/reviews`,
  // mas garantimos o prefixo correto.
  if (!normalized.startsWith('/api/products/')) {
    normalized = `/api/products${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}

