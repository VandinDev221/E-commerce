/**
 * Handler serverless da Vercel: encaminha TODAS as requisições /api/* para o Express.
 * Inclui GET /api/admin/stats e PATCH /api/admin/orders/:id/status.
 * O backend deve ser buildado antes (cd backend && npm run build).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getPath(req: VercelRequest): string {
  const r = req as any;
  // URL completa (PATCH etc.) -> extrair pathname
  if (r.url && typeof r.url === 'string') {
    if (r.url.startsWith('http')) {
      try {
        return new URL(r.url).pathname;
      } catch {
        return r.url.split('?')[0] || '/api';
      }
    }
    return r.url.split('?')[0] || '/api';
  }
  if (r.path) return r.path;
  if (r.pathname) return r.pathname;
  // Fallback: montar a partir de query.slug (ex: slug = ['admin', 'orders', 'id', 'status'])
  const slug = r.query?.slug;
  const pathFromSlug = Array.isArray(slug)
    ? `/${slug.join('/')}`
    : typeof slug === 'string'
      ? `/${slug}`
      : '';
  return pathFromSlug ? `/api/${pathFromSlug.replace(/^\/+/, '')}` : '/api';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let normalized = getPath(req);
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (!normalized.startsWith('/api')) {
    normalized = normalized === '/' ? '/api' : `/api${normalized}`;
  }
  // Garantir que o Express veja a URL (pode ser read-only na Vercel)
  try {
    Object.defineProperty(req, 'url', { value: normalized, writable: true, configurable: true });
  } catch {
    (req as any).url = normalized;
  }

  const mod = await import('../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
