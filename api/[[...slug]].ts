/**
 * Handler serverless da Vercel: encaminha todas as requisições /api/* para o Express.
 * O backend deve ser buildado antes (cd backend && npm run build).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Importante:
 * - O backend é ESM (package.json com "type": "module")
 * - A Serverless Function da Vercel costuma rodar em CommonJS
 * Então precisamos usar dynamic import() para carregar o backend ESM.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Na Vercel, o path pode vir em url, path ou pathname (ex: /api/admin/orders/:id/status).
  // O Express usa req.url; garantimos prefixo /api e repassamos método (GET, PATCH, etc.).
  const rawUrl: string =
    (req as any).url ??
    (req as any).path ??
    (req as any).pathname ??
    (typeof (req as any).query?.slug === 'string'
      ? `/api/${(req as any).query.slug}`
      : Array.isArray((req as any).query?.slug)
        ? `/api/${((req as any).query.slug as string[]).join('/')}`
        : '/');
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  if (!normalized.startsWith('/api')) {
    normalized = normalized === '/' ? '/api' : `/api${normalized}`;
  }
  if (normalized === '/api' && Array.isArray((req as any).query?.slug)) {
    normalized = `/api/${((req as any).query.slug as string[]).join('/')}`;
  }
  (req as any).url = normalized;

  const mod = await import('../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
