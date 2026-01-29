import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Garante o roteamento explícito de `/api/admin/*` para o backend Express,
 * evitando 404 quando o catch-all único não trata corretamente na Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  if (!normalized.startsWith('/api/admin')) {
    // Ex: "/stats" -> "/api/admin/stats"
    normalized = `/api/admin${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
