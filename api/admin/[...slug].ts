import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Roteamento explícito de `/api/admin/*` para o backend Express.
 * Garante que GET /api/admin/stats e PATCH /api/admin/orders/:id/status funcionem na Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req as any).query;
  const slug = query?.slug;
  // slug = ['stats'] ou ['orders', 'id', 'status'] etc.
  const pathFromSlug = Array.isArray(slug)
    ? `/${slug.join('/')}`
    : typeof slug === 'string'
      ? `/${slug}`
      : '';

  const rawUrl: string =
    (req as any).url ??
    (req as any).path ??
    (req as any).pathname ??
    (pathFromSlug ? `/api/admin${pathFromSlug}` : '/api/admin');

  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  if (!normalized.startsWith('/api/admin')) {
    normalized = pathFromSlug ? `/api/admin${pathFromSlug}` : '/api/admin';
  }

  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
