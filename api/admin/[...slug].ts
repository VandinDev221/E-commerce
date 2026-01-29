import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Roteamento explícito de /api/admin/* para o Express.
 * Resolve 404 em /api/admin/stats, /api/admin/users, /api/admin/orders e PATCH orders/:id/status.
 */
function getPath(req: VercelRequest): string {
  const r = req as any;
  if (r.url && typeof r.url === 'string') {
    if (r.url.startsWith('http')) {
      try {
        return new URL(r.url).pathname;
      } catch {
        return (r.url.split('?')[0] || '').replace(/^\/api\/?/, '') || '';
      }
    }
    return (r.url.split('?')[0] || '').replace(/^\/api\/?/, '') || '';
  }
  if (r.path) return r.path.replace(/^\/api\/?/, '');
  if (r.pathname) return r.pathname.replace(/^\/api\/?/, '');
  const slug = r.query?.slug;
  const pathFromSlug = Array.isArray(slug)
    ? slug.join('/')
    : typeof slug === 'string'
      ? slug
      : '';
  return pathFromSlug ? pathFromSlug : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const afterAdmin = getPath(req).replace(/^admin\/?/, '').replace(/^\/+/, '');
  const normalized = `/api/admin${afterAdmin ? `/${afterAdmin}` : ''}`;

  try {
    Object.defineProperty(req, 'url', { value: normalized, writable: true, configurable: true });
  } catch {
    (req as any).url = normalized;
  }

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
