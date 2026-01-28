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
  // Na Vercel, o path que chega à função pode vir sem o prefixo /api (ex: /auth/login).
  // O Express espera /api/auth/login; garantimos o prefixo no mesmo objeto req.
  const rawUrl = (req as any).url ?? (req as any).path ?? '/';
  if (!rawUrl.startsWith('/api')) {
    (req as any).url = '/api' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
  }

  const mod = await import('../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
