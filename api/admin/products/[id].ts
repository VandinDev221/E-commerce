import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rota explícita para GET e PUT /api/admin/products/:id (editar produto).
 * Só define url/originalUrl; o Express extrai params da URL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req as any).query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'ID do produto ausente' });
    return;
  }
  const normalized = `/api/admin/products/${id}`;
  const r = req as any;

  try {
    Object.defineProperty(r, 'url', { value: normalized, writable: true, configurable: true });
  } catch {
    r.url = normalized;
  }
  try {
    Object.defineProperty(r, 'originalUrl', { value: normalized, writable: true, configurable: true });
  } catch {
    r.originalUrl = normalized;
  }

  const mod = await import('../../../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
