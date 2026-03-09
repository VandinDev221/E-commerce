import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Roteamento explícito de /api/coupons/* para o Express.
 * Garante que POST /api/coupons/validate e outras rotas de cupons funcionem na Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r = req as any;
  let normalized = '/api/coupons';
  if (r.url && typeof r.url === 'string') {
    const pathOnly = r.url.startsWith('http')
      ? (() => {
          try {
            return new URL(r.url).pathname;
          } catch {
            return r.url.split('?')[0];
          }
        })()
      : r.url.split('?')[0];
    if (pathOnly?.startsWith('/api/coupons')) normalized = pathOnly;
  }
  if (
    normalized === '/api/coupons' &&
    (r.path?.startsWith('/api/coupons') || r.pathname?.startsWith('/api/coupons'))
  ) {
    normalized = r.path ?? r.pathname ?? normalized;
  }
  if (normalized === '/api/coupons') {
    const slug = r.query?.slug;
    const pathFromSlug = Array.isArray(slug) ? `/${slug.join('/')}` : typeof slug === 'string' ? `/${slug}` : '';
    if (pathFromSlug) normalized = `/api/coupons${pathFromSlug}`;
  }
  try {
    Object.defineProperty(req, 'url', { value: normalized, writable: true, configurable: true });
  } catch {
    (req as any).url = normalized;
  }
  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
