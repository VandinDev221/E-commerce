import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rota explícita para GET/PUT/DELETE /api/admin/products/:id.
 * Evita 404 quando o catch-all não recebe o path corretamente na Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req as any).query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'ID do produto ausente' });
    return;
  }
  const normalized = `/api/admin/products/${id}`;

  try {
    Object.defineProperty(req, 'url', { value: normalized, writable: true, configurable: true });
  } catch {
    (req as any).url = normalized;
  }
  if ((req as any).originalUrl === undefined) {
    try {
      Object.defineProperty(req, 'originalUrl', { value: normalized, writable: true, configurable: true });
    } catch {
      (req as any).originalUrl = normalized;
    }
  }

  const mod = await import('../../../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
