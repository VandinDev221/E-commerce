/**
 * Handler serverless da Vercel: encaminha todas as requisições /api/* para o Express.
 * O backend deve ser buildado antes (cd backend && npm run build).
 */
// @ts-expect-error - backend compilado em runtime
import app from '../backend/dist/index.js';
export default app;
