import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Roteamento explícito de /api/admin/* para o Express.
 * Prioriza query.slug (sempre preenchido pela Vercel nesta rota) para evitar 404 em PATCH.
 */
function getNormalizedUrl(req: VercelRequest): string {
  const r = req as any;
  // 1) Prioridade: query.slug (ex: ['orders','uuid','status'] ou ['stats'])
  const slug = r.query?.slug;
  if (Array.isArray(slug) && slug.length > 0) {
    return `/api/admin/${slug.join('/')}`;
  }
  if (typeof slug === 'string' && slug) {
    return `/api/admin/${slug}`;
  }
  // 2) req.url (path ou URL completa)
  if (r.url && typeof r.url === 'string') {
    const pathOnly = r.url.startsWith('http')
      ? (() => { try { return new URL(r.url).pathname; } catch { return r.url.split('?')[0]; } })()
      : r.url.split('?')[0];
    if (pathOnly && pathOnly.startsWith('/api')) return pathOnly;
    if (pathOnly) return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  }
  if (r.path && r.path.startsWith('/api')) return r.path;
  if (r.pathname && r.pathname.startsWith('/api')) return r.pathname;
  return '/api/admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const normalized = getNormalizedUrl(req);

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

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
