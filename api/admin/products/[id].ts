import type { VercelRequest, VercelResponse } from '@vercel/node';

const PLACEHOLDER_IMG = 'https://placehold.co/600x600?text=';

function getDefaultImageUrl(name?: string | null): string {
  if (!name?.trim()) return `${PLACEHOLDER_IMG}Produto`;
  return `${PLACEHOLDER_IMG}${encodeURIComponent(name.trim()).replace(/%20/g, '+')}`;
}

/**
 * GET: busca o produto direto no Prisma (evita 500 ao repassar para Express na Vercel).
 * PUT: repassa para o Express (upload de imagens).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req as any).query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'ID do produto ausente' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader || (req as any).cookies?.accessToken;
      if (!token) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const jwtMod = await import('jsonwebtoken');
      const { config } = await import('../../../../backend/dist/config/index.js');
      const decoded = jwtMod.default.verify(token, config.jwt.secret) as { userId: string };
      const { prisma } = await import('../../../../backend/dist/lib/prisma.js');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true },
      });
      if (!user || user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Acesso negado' });
        return;
      }
      const product = await prisma.product.findUnique({
        where: { id },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }
      const images = Array.isArray(product.images) ? product.images : [];
      res.status(200).json({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description ?? null,
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
        stock: product.stock,
        sku: product.sku ?? null,
        categoryId: product.categoryId ?? null,
        category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
        images: images.length ? images : [getDefaultImageUrl(product.name)],
        featured: Boolean(product.featured),
        published: Boolean(product.published),
        createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : String(product.createdAt),
        updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : String(product.updatedAt),
      });
    } catch (e: any) {
      if (e?.name === 'JsonWebTokenError' || e?.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token inválido ou expirado' });
        return;
      }
      console.error('[admin/products/:id GET]', e);
      res.status(500).json({ error: e?.message || 'Erro ao carregar produto' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const normalized = `/api/admin/products/${id}`;
    const r = req as any;
    try {
      Object.defineProperty(r, 'url', { value: normalized, writable: true, configurable: true });
    } catch {
      r.url = normalized;
    }
    try {
      Object.defineProperty(r, 'originalUrl', { value: normalized, writable: true, configurable: true });
    } catch {
      r.originalUrl = normalized;
    }
    const mod = await import('../../../../backend/dist/index.js');
    const app = (mod as { default: (req: any, res: any) => any }).default;
    return app(req, res);
  }

  res.status(405).json({ error: 'Método não permitido' });
}
