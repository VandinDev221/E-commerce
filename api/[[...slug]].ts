/**
 * Handler serverless da Vercel: encaminha TODAS as requisições /api/* para o Express.
 * Inclui GET /api/admin/stats e PATCH /api/admin/orders/:id/status.
 * O backend deve ser buildado antes (cd backend && npm run build).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getPath(req: VercelRequest): string {
  const r = req as any;
  const slug = r.query?.slug;
  const pathFromSlug =
    Array.isArray(slug) && slug.length > 0
      ? `/api/${slug.join('/')}`
      : typeof slug === 'string' && slug
        ? `/api/${slug}`
        : '';

  // URL completa (PATCH etc.) -> extrair pathname
  if (r.url && typeof r.url === 'string') {
    const pathOnly = r.url.startsWith('http')
      ? (() => {
          try {
            return new URL(r.url).pathname;
          } catch {
            return r.url.split('?')[0] || '';
          }
        })()
      : r.url.split('?')[0] || '';
    if (pathOnly && pathOnly.startsWith('/api')) return pathOnly;
  }
  if (r.path && r.path.startsWith('/api')) return r.path;
  if (r.pathname && r.pathname.startsWith('/api')) return r.pathname;
  return pathFromSlug || '/api';
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
