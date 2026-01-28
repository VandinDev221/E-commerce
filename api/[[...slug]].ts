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
  const mod = await import('../backend/dist/index.js');
  const app = (mod as { default: (req: any, res: any) => any }).default;
  return app(req, res);
}
