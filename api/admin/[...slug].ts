import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Garante explicitamente o roteamento de `/api/admin/*` para o Express.
 * (Em alguns deploys, o catch-all `api/[[...slug]].ts` não cobre todos os subpaths.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  // Garante que o Express veja exatamente /api/admin/...
  if (!normalized.startsWith('/api/admin')) {
    // Ex: "/stats" -> "/api/admin/stats"
    normalized = `/api/admin${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}

