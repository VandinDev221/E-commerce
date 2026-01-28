import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Garante explicitamente o roteamento de `/api/products/*` para o Express.
 * (Alguns deploys não encaminham subpaths via o catch-all único.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl: string = (req as any).url ?? (req as any).path ?? '/';
  let normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  // Garante que o Express veja exatamente /api/products/...
  if (!normalized.startsWith('/api/products')) {
    // Ex: "/hub-usb-c" -> "/api/products/hub-usb-c"
    normalized = `/api/products${normalized}`;
  }
  (req as any).url = normalized;

  const mod = await import('../../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}

