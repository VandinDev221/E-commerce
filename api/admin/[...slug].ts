import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Roteamento explícito de `/api/admin/*` para o backend Express.
 * GET /api/admin/stats e PATCH /api/admin/orders/:id/status na Vercel.
 */
function getPath(req: VercelRequest): string {
  const r = req as any;
  // URL completa (ex: PATCH na Vercel) -> extrair pathname
  if (r.url && typeof r.url === 'string') {
    if (r.url.startsWith('http')) {
      try {
        return new URL(r.url).pathname;
      } catch {
        return r.url.split('?')[0] || '/api/admin';
      }
    }
    return r.url.split('?')[0] || '/api/admin';
  }
  if (r.path) return r.path;
  if (r.pathname) return r.pathname;
  // Fallback: montar a partir de query.slug (GET costuma vir assim)
  const slug = r.query?.slug;
  const pathFromSlug = Array.isArray(slug)
    ? `/${slug.join('/')}`
    : typeof slug === 'string'
      ? `/${slug}`
      : '';
  return pathFromSlug ? `/api/admin${pathFromSlug}` : '/api/admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let normalized = getPath(req);
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (!normalized.startsWith('/api/admin')) {
    normalized = normalized === '/' ? '/api/admin' : `/api/admin${normalized}`;
  }
  // Garantir que o Express veja a URL (pode ser read-only no req da Vercel)
  try {
    Object.defineProperty(req, 'url', { value: normalized, writable: true, configurable: true });
  } catch {
    (req as any).url = normalized;
  }

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
