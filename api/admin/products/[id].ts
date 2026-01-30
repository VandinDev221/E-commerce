import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { pathToFileURL } from 'url';

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
  // Garantir que o Express veja o :id (na Vercel req.params pode não ser preenchido pelo routing)
  (req as any).params = (req as any).params || {};
  (req as any).params.id = id;

  try {
    // Na Vercel, caminho relativo pode falhar; usar cwd + backend/dist
    const backendPath = path.join(process.cwd(), 'backend', 'dist', 'index.js');
    const mod = await import(pathToFileURL(backendPath).href);
    const app = (mod as { default: (req: any, res: any) => any }).default;
    return app(req, res);
  } catch (relErr: any) {
    // Fallback: import relativo (funciona em dev local)
    try {
      const mod = await import('../../../../backend/dist/index.js');
      const app = (mod as { default: (req: any, res: any) => any }).default;
      return app(req, res);
    } catch (err: any) {
      console.error('[api/admin/products/[id]]', err);
      return res.status(500).json({
        error: 'Erro ao carregar o backend',
        ...(process.env.NODE_ENV !== 'production' && { detail: err?.message || String(err) }),
      });
    }
  }
}
