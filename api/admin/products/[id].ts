import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rota explícita para GET e PUT /api/admin/products/:id.
 * Apenas repassa para o Express (não importa jsonwebtoken nem Prisma aqui).
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

  try {
    const mod = await import('../../../backend/dist/index.js');
    const app = (mod as { default: (req: any, res: any) => any }).default;
    return app(req, res);
  } catch (err: any) {
    console.error('[admin/products/:id]', err);
    res.status(500).json({ error: err?.message || 'Erro ao carregar backend' });
  }
}
