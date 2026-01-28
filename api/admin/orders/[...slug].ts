import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Garante o roteamento de /api/admin/orders/* para o Express
 * (ex: PATCH /api/admin/orders/:id/status).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  if (!normalized.startsWith('/api/admin/orders')) {
    // Ex: "/f53f5efa-.../status" -> "/api/admin/orders/f53f5efa-.../status"
    const suffix = normalized.replace(/^\/api\/admin\/orders?\/?/, '') || normalized.replace(/^\//, '');
    normalized = `/api/admin/orders/${suffix}`.replace(/\/+/g, '/');
  }
  (req as any).url = normalized;

  const mod = await import('../../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
