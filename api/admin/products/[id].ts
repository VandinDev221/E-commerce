import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rota explícita para GET e PUT /api/admin/products/:id (editar produto).
 * Evita 404 na Vercel quando o catch-all não trata corretamente.
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
  // Garantir params para o Express (router /products/:id)
  if (!r.params || typeof r.params !== 'object') {
    try {
      Object.defineProperty(r, 'params', { value: { id }, writable: true, configurable: true });
    } catch {
      r.params = { id };
    }
  } else {
    r.params.id = id;
  }

  const mod = await import('../../../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
