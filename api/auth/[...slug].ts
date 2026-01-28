import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Alguns projetos na Vercel acabam não roteando `/api/auth/*` corretamente
 * com um único catch-all em `api/[[...slug]].ts`.
 *
 * Esta função garante explicitamente o roteamento de `/api/auth/*`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  // Garante que o Express veja exatamente /api/auth/...
  if (!normalized.startsWith('/api/auth')) {
    // Ex: "/login" -> "/api/auth/login"
    normalized = `/api/auth${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}

