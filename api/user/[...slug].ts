import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Garante explicitamente o roteamento de `/api/user/*` para o Express.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  if (!normalized.startsWith('/api/user')) {
    normalized = `/api/user${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}

