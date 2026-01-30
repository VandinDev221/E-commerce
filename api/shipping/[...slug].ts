import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Roteamento explícito de /api/shipping/* para o Express.
 * Resolve 404 em /api/shipping/cep/:zip e POST /api/shipping/calculate na Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const r = req as any;
  let normalized = '/api/shipping';
  if (r.url && typeof r.url === 'string') {
    const pathOnly = r.url.startsWith('http') ? (() => { try { return new URL(r.url).pathname; } catch { return r.url.split('?')[0]; } })() : r.url.split('?')[0];
    if (pathOnly?.startsWith('/api/shipping')) normalized = pathOnly;
  }
  if (normalized === '/api/shipping' && (r.path?.startsWith('/api/shipping') || r.pathname?.startsWith('/api/shipping'))) {
    normalized = r.path ?? r.pathname ?? normalized;
  }
  if (normalized === '/api/shipping') {
    const slug = r.query?.slug;
    const pathFromSlug = Array.isArray(slug) ? `/${slug.join('/')}` : typeof slug === 'string' ? `/${slug}` : '';
    if (pathFromSlug) normalized = `/api/shipping${pathFromSlug}`;
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
