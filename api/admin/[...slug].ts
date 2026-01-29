import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Garante o roteamento explícito de `/api/admin/*` para o backend Express,
 * evitando 404 quando o catch-all único não trata corretamente na Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req as any).query;
  const slug = query?.slug;
  // Na Vercel, rotas dinâmicas (ex: PATCH /api/admin/orders/:id/status) vêm em query.slug
  const pathFromSlug = Array.isArray(slug) ? `/${slug.join('/')}` : typeof slug === 'string' ? `/${slug}` : '';
  const rawUrl: string =
    (req as any).url ?? (req as any).path ?? (req as any).pathname ?? (pathFromSlug || '/');
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  if (!normalized.startsWith('/api/admin')) {
    // Ex: "/stats" ou pathFromSlug "orders/xxx/status" -> "/api/admin/..."
    normalized = pathFromSlug ? `/api/admin${pathFromSlug}` : `/api/admin${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
