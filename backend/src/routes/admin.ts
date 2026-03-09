import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'node:fs';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadImage } from '../services/upload.js';
import { cacheDel } from '../lib/redis.js';
import { normalizeProductImages } from '../lib/images.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);
router.use(requireAdmin);

// Products CRUD
const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable().or(z.literal('')),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0),
  sku: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  images: z.array(z.string().min(1)).optional(),
});

const shopeeImportProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  image: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  sourceUrl: z.string().url().optional(),
});

type ShopeeImportInputProduct = z.infer<typeof shopeeImportProductSchema>;

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isShopeeDomain(u: string) {
  const hostname = new URL(u).hostname.toLowerCase();
  return (
    hostname === 'shopee.com.br'
    || hostname.endsWith('.shopee.com.br')
    || hostname === 'shopee.com'
    || hostname.endsWith('.shopee.com')
  );
}

function normalizeShopeeProductUrl(rawUrl: string) {
  const clean = rawUrl
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .trim();
  const withProtocol = clean.startsWith('//') ? `https:${clean}` : clean;
  const normalized = withProtocol.startsWith('/')
    ? `https://shopee.com.br${withProtocol}`
    : withProtocol;

  if (!/^https?:\/\//i.test(normalized)) return null;
  if (!isShopeeDomain(normalized)) return null;

  try {
    const parsed = new URL(normalized);
    parsed.hash = '';
    parsed.search = '';
    if (parsed.pathname.includes('/product/')) {
      const m = parsed.pathname.match(/\/product\/(\d+)\/(\d+)/);
      if (m) {
        parsed.pathname = `/product/${m[1]}/${m[2]}`;
      }
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function isShopeeProductUrl(u: string) {
  try {
    const parsed = new URL(u);
    if (!isShopeeDomain(parsed.toString())) return false;
    const path = parsed.pathname;
    if (path.includes('/import/')) return false;
    return /\/product\/\d+\/\d+/.test(path) || /-i\.\d+\.\d+/.test(path);
  } catch {
    return false;
  }
}

function normalizeShopeeImageUrl(raw?: string | null) {
  if (!raw) return null;
  const clean = raw
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .trim();
  if (!clean) return null;

  if (/^[a-f0-9]{20,}$/i.test(clean)) {
    return `https://down-br.img.susercontent.com/file/${clean}`;
  }

  let candidate = clean;
  if (candidate.startsWith('//')) candidate = `https:${candidate}`;
  if (candidate.startsWith('/file/')) candidate = `https://down-br.img.susercontent.com${candidate}`;
  if (candidate.startsWith('file/')) candidate = `https://down-br.img.susercontent.com/${candidate}`;

  if (!/^https?:\/\//i.test(candidate)) return null;

  try {
    const parsed = new URL(candidate);
    parsed.hash = '';
    const host = parsed.hostname.toLowerCase();
    if (host.includes('img.susercontent.com')) {
      if (!/\/file\/[A-Za-z0-9_-]{3,}/.test(parsed.pathname)) return null;
      return parsed.toString();
    }
    if (host.includes('shopee') || host.includes('shopeemobile')) return null;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(parsed.pathname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractValidShopeeImages(images: Array<string | null | undefined> | null | undefined) {
  return Array.from(
    new Set(
      (images ?? [])
        .map((img) => normalizeShopeeImageUrl(img ?? undefined))
        .filter((img): img is string => Boolean(img))
    )
  ).slice(0, 8);
}

function normalizeShopeeImages(images: Array<string | null | undefined> | null | undefined) {
  const normalized = extractValidShopeeImages(images);
  if (normalized.length > 0) return Array.from(new Set(normalized)).slice(0, 8);
  return [];
}

function fallbackProductNameFromUrl(sourceUrl: string) {
  try {
    const parsed = new URL(sourceUrl);
    const raw = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!raw) return null;
    const withoutIds = raw.replace(/-i\.\d+\.\d+$/i, '').replace(/\/product\/\d+\/\d+$/i, '');
    const decoded = decodeURIComponent(withoutIds).replace(/[-_]+/g, ' ').trim();
    if (!decoded || decoded.length < 4) return null;
    return decoded.charAt(0).toUpperCase() + decoded.slice(1);
  } catch {
    return null;
  }
}

function decodeShopeeText(raw: string | null | undefined) {
  if (!raw) return null;
  const withUnicode = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return withUnicode
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

function isLikelyShopeeProductContent(name?: string | null, description?: string | null) {
  const n = (name ?? '').toLowerCase();
  const d = (description ?? '').toLowerCase();
  if (!n || n.length < 4) return false;
  const blockedMarkers = [
    'shopee brasil',
    'faça login',
    'faca login',
    'página indisponível',
    'pagina indisponivel',
    'precisa de ajuda',
    'shopee__domain',
  ];
  return !blockedMarkers.some((m) => n.includes(m) || d.includes(m));
}

function isPlaceholderImage(url: string) {
  return url.includes('placehold.co') || url.includes('dummyimage.com') || url.includes('picsum.photos');
}

function extractShopeeProductUrls(html: string) {
  const urls = new Set<string>();
  const absoluteSlug = html.match(/https?:\/\/[^"'\s>]*shopee[^"'\s>]*-i\.\d+\.\d+/gi) ?? [];
  const absoluteProduct = html.match(/https?:\/\/[^"'\s>]*shopee[^"'\s>]*\/product\/\d+\/\d+/gi) ?? [];
  const relativeSlug = html.match(/\/[^"'\s>]*-i\.\d+\.\d+/gi) ?? [];
  const relativeProduct = html.match(/\/product\/\d+\/\d+/gi) ?? [];

  [...absoluteSlug, ...absoluteProduct, ...relativeSlug, ...relativeProduct].forEach((u) => {
    const normalized = normalizeShopeeProductUrl(u);
    if (normalized) urls.add(normalized);
  });
  return Array.from(urls);
}

const shopeeSectionRules = [
  { slug: 'eletronicos', name: 'Eletrônicos', keywords: ['fone', 'bluetooth', 'notebook', 'smartphone', 'camera', 'monitor', 'teclado', 'mouse', 'usb', 'hdmi', 'carregador', 'smartwatch', 'tablet'] },
  { slug: 'acessorios', name: 'Acessórios', keywords: ['bolsa', 'mochila', 'capa', 'pelicula', 'case', 'carteira', 'oculos', 'relogio', 'joia', 'brinco', 'colar', 'pulseira', 'boné', 'bone'] },
  { slug: 'casa-e-cozinha', name: 'Casa e Cozinha', keywords: ['cozinha', 'panela', 'frigideira', 'talher', 'cadeira', 'mesa', 'decoracao', 'decoração', 'almofada', 'organizador', 'luminaria', 'luminária', 'tapete'] },
  { slug: 'moda', name: 'Moda', keywords: ['camisa', 'camiseta', 'blusa', 'calca', 'calça', 'vestido', 'saia', 'jaqueta', 'tenis', 'tênis', 'sapato', 'sandalia', 'sandália', 'shorts'] },
  { slug: 'beleza', name: 'Beleza', keywords: ['maquiagem', 'perfume', 'shampoo', 'creme', 'hidratante', 'skincare', 'serum', 'sérum', 'cosmetico', 'cosmético'] },
] as const;

function inferShopeeSection(name: string, description?: string | null) {
  const text = `${name} ${description ?? ''}`.toLowerCase();
  const found = shopeeSectionRules.find((rule) => rule.keywords.some((k) => text.includes(k)));
  return found ?? { slug: 'geral', name: 'Geral', keywords: [] };
}

function listNewestJsonFiles(dirPath: string, prefix: string, take = 3) {
  try {
    const names = fs.readdirSync(dirPath);
    return names
      .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
      .map((name) => `${dirPath}/${name}`)
      .map((filePath) => {
        try {
          return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { filePath: string; mtimeMs: number } => Boolean(entry))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, take)
      .map((entry) => entry.filePath);
  } catch {
    return [];
  }
}

function loadShopeeFallbackProducts(limit: number): ShopeeImportInputProduct[] {
  try {
    const tmpDir = new URL('../../tmp', import.meta.url);
    const tmpPath = tmpDir.pathname;
    const candidates = [
      `${tmpPath}/produtos.json`,
      `${tmpPath}/produtos_reais_shopee.json`,
      ...listNewestJsonFiles(tmpPath, 'shopee_import_file_', 5),
      ...listNewestJsonFiles(tmpPath, 'shopee_full_sync_', 5),
    ];

    const seen = new Set<string>();
    const collected: ShopeeImportInputProduct[] = [];

    for (const filePath of candidates) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const parsed = z.array(shopeeImportProductSchema).safeParse(raw);
        if (!parsed.success) continue;
        for (const p of parsed.data) {
          const normalizedSource = p.sourceUrl ? normalizeShopeeProductUrl(p.sourceUrl) : null;
          if (!normalizedSource || !isShopeeProductUrl(normalizedSource)) continue;
          if (seen.has(normalizedSource)) continue;
          seen.add(normalizedSource);
          collected.push({
            ...p,
            sourceUrl: normalizedSource,
          });
          if (collected.length >= limit) return collected;
        }
      } catch {
        // ignora arquivo inválido e tenta o próximo
      }
    }

    return collected.slice(0, limit);
  } catch {
    return [];
  }
}

router.get('/products', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true, slug: true } } },
    });
    res.json(products.map((p) => ({
      ...p,
      images: normalizeProductImages(p.images),
      price: Number(p.price),
      costPrice: p.costPrice != null ? Number(p.costPrice) : null,
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    })));
  } catch (e) {
    next(e);
  }
});

router.post('/products', upload.array('images', 10), async (req: AuthRequest, res, next) => {
  try {
    const body = productSchema.parse(JSON.parse(req.body.data || '{}'));
    const slug = body.slug || slugify(body.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) throw new AppError('Slug já existe', 400);

    let price = body.price;
    if (body.costPrice != null && body.costPrice > 0) {
      price = Math.round(body.costPrice * 1.15 * 100) / 100;
    }
    const sourceUrl = body.sourceUrl && body.sourceUrl !== '' ? body.sourceUrl : null;
    const costPrice = body.costPrice ?? null;

    const files = req.files as Express.Multer.File[] | undefined;
    let images: string[] = Array.isArray(body.images) ? [...body.images] : [];
    if (files?.length) {
      for (const file of files) {
        const url = await uploadImage(file.buffer, 'products');
        images.push(url);
      }
    }
    images = normalizeProductImages(images);

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        price,
        costPrice,
        sourceUrl,
        compareAtPrice: body.compareAtPrice ?? null,
        stock: body.stock ?? 0,
        sku: body.sku ?? null,
        categoryId: body.categoryId ?? null,
        images,
        featured: body.featured ?? false,
        published: body.published ?? true,
      },
    });
    res.status(201).json({ ...product, price: Number(product.price), costPrice: product.costPrice != null ? Number(product.costPrice) : null });
  } catch (e) {
    next(e);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) throw new AppError('ID do produto ausente', 400);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!product) throw new AppError('Produto não encontrado', 404);
    // Valores 100% serializáveis para evitar 500 na Vercel (Decimal, Date, circular)
    const images = Array.isArray(product.images) ? product.images : [];
    const category = product.category
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null;
    const createdAt = product.createdAt instanceof Date ? product.createdAt.toISOString() : String(product.createdAt);
    const updatedAt = product.updatedAt instanceof Date ? product.updatedAt.toISOString() : String(product.updatedAt);
    res.json({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description ?? null,
      price: Number(product.price),
      costPrice: product.costPrice != null ? Number(product.costPrice) : null,
      sourceUrl: product.sourceUrl ?? null,
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      stock: product.stock,
      sku: product.sku ?? null,
      categoryId: product.categoryId ?? null,
      category,
      images: normalizeProductImages(images),
      featured: Boolean(product.featured),
      published: Boolean(product.published),
      createdAt,
      updatedAt,
    });
  } catch (e) {
    next(e);
  }
});

router.put('/products/:id', upload.array('images', 10), async (req: AuthRequest, res, next) => {
  try {
    const body = productSchema.partial().parse(JSON.parse(req.body.data || '{}'));
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError('Produto não encontrado', 404);

    const files = req.files as Express.Multer.File[] | undefined;
    let images = product.images;
    if (files?.length) {
      const newUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImage(file.buffer, 'products');
        newUrls.push(url);
      }
      images = [...images, ...newUrls];
    }
    if (body.images !== undefined) images = body.images as string[];

    const slug = body.slug ?? product.slug;
    let updateData: Record<string, unknown> = { ...body, images };
    if (body.costPrice != null && body.costPrice > 0 && body.price == null) {
      updateData.price = Math.round(body.costPrice * 1.15 * 100) / 100;
    }
    if (body.sourceUrl === '') updateData.sourceUrl = null;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData as Parameters<typeof prisma.product.update>[0]['data'],
    });
    await cacheDel(`product:${product.slug}`);
    res.json({
      ...updated,
      price: Number(updated.price),
      costPrice: updated.costPrice != null ? Number(updated.costPrice) : null,
    });
  } catch (e) {
    next(e);
  }
});

function parseShopeePage(html: string, url: string) {
  const name =
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i)?.[1] ??
    html.match(/"name":\s*"([^"]+)"/)?.[1] ??
    null;
  const descriptionJson =
    html.match(/"description":\s*"((?:\\.|[^"\\])+)"/i)?.[1] ??
    null;
  const description =
    html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i)?.[1] ??
    html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] ??
    html.match(/"seo_description":\s*"((?:\\.|[^"\\])+)"/i)?.[1] ??
    descriptionJson ??
    null;

  const images: string[] = [];
  const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)?.[1] ?? html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i)?.[1];
  if (ogImage) images.push(ogImage);
  const imageUrls = html.match(/https?:\/\/[^"'\s]*shopee[^"'\s]*\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/gi) ?? [];
  imageUrls.forEach((u) => {
    const clean = u.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (!images.includes(clean)) images.push(clean);
  });
  const jsonImages = html.match(/"image":\s*"((?:https?:\/\/[^"]+))"/gi) ?? [];
  jsonImages.forEach((m) => {
    const u = m.replace(/"image":\s*"/i, '').replace(/"$/, '').replace(/\\u002F/g, '/');
    if (u && !images.includes(u)) images.push(u);
  });

  const imageHashBlocks = html.match(/"images":\s*\[[^\]]+\]/gi) ?? [];
  for (const block of imageHashBlocks) {
    const hashMatches = block.match(/"([A-Za-z0-9_-]{20,})"/g) ?? [];
    for (const rawHash of hashMatches) {
      const hash = rawHash.replace(/"/g, '');
      const normalized = normalizeShopeeImageUrl(hash);
      if (normalized && !images.includes(normalized)) images.push(normalized);
    }
  }
  const imageHashSingles = html.match(/"image":\s*"([A-Za-z0-9_-]{20,})"/gi) ?? [];
  for (const m of imageHashSingles) {
    const hash = m.replace(/"image":\s*"/i, '').replace(/"$/, '');
    const normalized = normalizeShopeeImageUrl(hash);
    if (normalized && !images.includes(normalized)) images.push(normalized);
  }

  let price: number | null = null;
  const priceCents = html.match(/"price":\s*(\d{3,})/);
  const priceMin = html.match(/"price_min":\s*(\d+)/);
  const priceFormatted = html.match(/"formatted_price":\s*"R\$\s*([\d,.]+)"/);
  const priceInline = html.match(/R\$\s*([\d,.]+)/);
  if (priceCents) {
    const v = parseInt(priceCents[1], 10);
    price = v >= 1000 ? v / 100 : v;
  } else if (priceMin) {
    const v = parseInt(priceMin[1], 10);
    price = v >= 1000 ? v / 100 : v;
  } else if (priceFormatted) {
    const raw = priceFormatted[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) price = n;
  } else if (priceInline) {
    const raw = priceInline[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) price = n <= 100000 ? n : n / 100;
  }

  let stock: number | null = null;
  const stockM = html.match(/"stock":\s*(\d+)/) ?? html.match(/"stock_quantity":\s*(\d+)/) ?? html.match(/"quantity":\s*(\d+)/);
  if (stockM) stock = parseInt(stockM[1], 10);

  const decodedName = decodeShopeeText(name);
  const decodedDescription = decodeShopeeText(description);
  const validContent = isLikelyShopeeProductContent(decodedName, decodedDescription);

  return {
    name: validContent ? (decodedName ?? fallbackProductNameFromUrl(url)) : (fallbackProductNameFromUrl(url) ?? null),
    description: validContent ? decodedDescription : null,
    price,
    images: images.length > 0 ? images.slice(0, 8) : null,
    stock,
    sourceUrl: url,
  };
}

router.post('/products/import-shopee', async (req, res, next) => {
  try {
    const { url } = z.object({
      url: z.string().url().refine((u) => isShopeeDomain(u), 'URL deve ser de um domínio da Shopee'),
    }).parse(req.body);
    const normalizedUrl = normalizeShopeeProductUrl(url);
    if (!normalizedUrl || !isShopeeProductUrl(normalizedUrl)) {
      throw new AppError('Informe um link real de produto da Shopee', 400);
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    };
    const response = await fetch(normalizedUrl, { headers, redirect: 'follow' });
    const html = await response.text();
    const data = parseShopeePage(html, normalizedUrl);
    const realImages = extractValidShopeeImages(data.images);
    const hasValidText = isLikelyShopeeProductContent(data.name, data.description);
    const safeName = (hasValidText ? data.name : null) ?? fallbackProductNameFromUrl(normalizedUrl) ?? 'Produto Shopee';
    const safeDescription = hasValidText ? data.description : null;
    const safePrice = hasValidText ? data.price : null;
    const warning = !hasValidText || realImages.length === 0
      ? 'Shopee bloqueou parte da coleta automática. Nome/link foram preenchidos; complete preço, descrição e imagens reais manualmente.'
      : null;

    res.json({
      name: safeName,
      description: safeDescription,
      price: safePrice,
      images: realImages,
      image: realImages[0] ?? null,
      stock: Math.max(0, data.stock ?? 0),
      sourceUrl: normalizedUrl,
      warning,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/products/import-shopee-home', async (req, res, next) => {
  try {
    const body = z.object({
      url: z.string().url().optional(),
      sectionUrls: z.array(z.string().url()).optional(),
      productUrls: z.array(z.string().url()).optional(),
      products: z.array(shopeeImportProductSchema).optional(),
      limit: z.number().int().min(1).max(80).optional(),
      featuredCount: z.number().int().min(0).max(20).optional(),
    }).parse(req.body);

    const sourceUrl = body.url ?? 'https://shopee.com.br/';
    if (!isShopeeDomain(sourceUrl)) throw new AppError('A URL base precisa ser da Shopee', 400);
    const sectionUrls = (body.sectionUrls ?? []).filter((u) => isShopeeDomain(u));
    const limit = body.limit ?? 24;
    const featuredCount = body.featuredCount ?? 8;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    };

    const sectionsNeeded = new Set<string>();
    let importedRaw: Array<{
      url: string;
      name: string;
      description: string | null;
      costPrice: number;
      price: number;
      images: string[];
      stock: number;
      sectionSlug: string;
      sectionName: string;
    }> = [];
    let candidateUrls: string[] = [];

    const addManualProducts = async (manualProducts: ShopeeImportInputProduct[]) => {
      for (let idx = 0; idx < manualProducts.length; idx += 1) {
        const p = manualProducts[idx];
        const source = p.sourceUrl ? normalizeShopeeProductUrl(p.sourceUrl) : null;
        if (!source || !isShopeeProductUrl(source)) continue;
        let parsedName = p.name.trim();
        let parsedDescription = p.description?.trim() || null;
        let parsedImages = normalizeShopeeImages([...(p.images ?? []), p.image]);
        let parsedStock = 100;

        if (source && (source.includes('/product/') || source.includes('-i.'))) {
          try {
            const response = await fetch(source, { headers, redirect: 'follow' });
            const html = await response.text();
            const enriched = parseShopeePage(html, source);
            const enrichedImages = extractValidShopeeImages(enriched.images);
            const canUseText = isLikelyShopeeProductContent(enriched.name, enriched.description);
            if (canUseText && enriched.name) parsedName = enriched.name;
            if (canUseText && (!parsedDescription || parsedDescription.length < 50) && enriched.description) {
              parsedDescription = enriched.description;
            }
            if (enrichedImages.length > 0) {
              parsedImages = enrichedImages;
            }
            parsedStock = Math.max(100, enriched.stock ?? 0);
          } catch {
            // se falhar enriquecimento, mantém dados enviados
          }
        }

        if (!parsedDescription || parsedDescription.trim().length < 24) {
          parsedDescription = 'Descrição indisponível';
        }

        const section = inferShopeeSection(parsedName, parsedDescription);
        const costPrice = Math.round(p.price * 100) / 100;
        const price = Math.round(costPrice * 1.15 * 100) / 100;
        sectionsNeeded.add(section.slug);
        importedRaw.push({
          url: source,
          name: parsedName,
          description: parsedDescription,
          costPrice,
          price,
          images: parsedImages,
          stock: parsedStock,
          sectionSlug: section.slug,
          sectionName: section.name,
        });
      }
    };

    if (body.products && body.products.length > 0) {
      await addManualProducts(body.products.slice(0, limit));
    } else {
      const allProductUrls = new Set<string>();
      const sources = sectionUrls.length > 0 ? sectionUrls : [sourceUrl];
      for (const src of sources) {
        try {
          const response = await fetch(src, { headers, redirect: 'follow' });
          const html = await response.text();
          extractShopeeProductUrls(html).forEach((u) => allProductUrls.add(u));
        } catch {
          // ignora fonte quebrada para tentar as outras
        }
      }

      (body.productUrls ?? []).forEach((u) => {
        const normalized = normalizeShopeeProductUrl(u);
        if (normalized) allProductUrls.add(normalized);
      });

      candidateUrls = Array.from(allProductUrls).slice(0, limit);
      if (candidateUrls.length === 0) {
        const fallbackProducts = loadShopeeFallbackProducts(limit);
        if (fallbackProducts.length > 0) {
          await addManualProducts(fallbackProducts);
        } else {
          throw new AppError(
            'Não foi possível extrair links válidos da Shopee. Informe links reais de produto em "productUrls" ou dados em "products".',
            400
          );
        }
      }

      for (const productUrl of candidateUrls) {
        try {
          const response = await fetch(productUrl, { headers, redirect: 'follow' });
          const html = await response.text();
          const parsed = parseShopeePage(html, productUrl);
          if (!parsed.name || parsed.price == null || parsed.price <= 0) continue;
          const section = inferShopeeSection(parsed.name, parsed.description);
          const costPrice = Math.round(parsed.price * 100) / 100;
          const price = Math.round(costPrice * 1.15 * 100) / 100;
          sectionsNeeded.add(section.slug);
          importedRaw.push({
            url: productUrl,
            name: parsed.name,
            description: parsed.description,
            costPrice,
            price,
            images: normalizeShopeeImages(parsed.images),
            stock: Math.max(100, parsed.stock ?? 0),
            sectionSlug: section.slug,
            sectionName: section.name,
          });
        } catch {
          // segue para próximos produtos
        }
      }
    }

    if (importedRaw.length === 0) {
      const fallbackProducts = loadShopeeFallbackProducts(limit);
      if (fallbackProducts.length > 0) {
        await addManualProducts(fallbackProducts);
      }
    }

    if (importedRaw.length === 0) {
      throw new AppError(
        'Nenhum produto válido foi extraído online. O fallback automático também não encontrou base local válida.',
        400
      );
    }

    // Deduplica por URL e por fingerprint de conteúdo para evitar catálogos poluídos por dados repetidos.
    const seenUrls = new Set<string>();
    const seenFingerprints = new Set<string>();
    const dedupedRaw: typeof importedRaw = [];
    for (const item of importedRaw) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      const normalizedName = slugify(item.name);
      const priceFingerprint = item.costPrice.toFixed(2);
      const primaryImage = item.images.find((img) => !isPlaceholderImage(img)) ?? item.images[0] ?? '';
      const fingerprint = `${normalizedName}|${priceFingerprint}|${primaryImage}`;
      if (seenFingerprints.has(fingerprint)) continue;
      seenFingerprints.add(fingerprint);
      dedupedRaw.push(item);
    }
    importedRaw = dedupedRaw;

      // Se um lote vier "viciado" com a mesma imagem em quase todos os itens, remove a imagem dominante.
    if (importedRaw.length >= 10) {
      const imageFrequency = new Map<string, number>();
      for (const item of importedRaw) {
        const primary = item.images.find((img) => !isPlaceholderImage(img)) ?? item.images[0] ?? '';
        if (!primary) continue;
        imageFrequency.set(primary, (imageFrequency.get(primary) ?? 0) + 1);
      }
      const dominant = Array.from(imageFrequency.entries()).sort((a, b) => b[1] - a[1])[0];
      if (dominant && dominant[1] / importedRaw.length >= 0.6) {
        importedRaw = importedRaw.map((item) => {
          const primary = item.images.find((img) => !isPlaceholderImage(img)) ?? item.images[0] ?? '';
          if (primary === dominant[0]) return { ...item, images: [] };
          return item;
        });
      }
    }

    const existingCategories = await prisma.category.findMany({
      where: { slug: { in: Array.from(sectionsNeeded) } },
      select: { id: true, slug: true },
    });
    const categoryBySlug = new Map(existingCategories.map((c) => [c.slug, c.id]));

    for (const sectionSlug of sectionsNeeded) {
      if (categoryBySlug.has(sectionSlug)) continue;
      const rule = shopeeSectionRules.find((r) => r.slug === sectionSlug);
      const created = await prisma.category.create({
        data: {
          name: rule?.name ?? (sectionSlug === 'geral' ? 'Geral' : sectionSlug),
          slug: sectionSlug,
          description: `Produtos importados automaticamente da Shopee (${sectionSlug}).`,
        },
        select: { id: true, slug: true },
      });
      categoryBySlug.set(created.slug, created.id);
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const importedProducts: Array<{ id: string; name: string; price: number; costPrice: number; section: string; featured: boolean }> = [];

    for (let i = 0; i < importedRaw.length; i += 1) {
      const item = importedRaw[i];
      if (!item.images || item.images.length === 0) {
        skippedCount += 1;
        continue;
      }
      const categoryId = categoryBySlug.get(item.sectionSlug) ?? null;
      const featured = i < featuredCount;
      const itemIdMatch = item.url.match(/-i\.(\d+)\.(\d+)/) ?? item.url.match(/\/product\/(\d+)\/(\d+)/);
      const sku = itemIdMatch ? `SHP-${itemIdMatch[1]}-${itemIdMatch[2]}` : undefined;
      const primaryImage = item.images.find((img) => !isPlaceholderImage(img)) ?? item.images[0] ?? null;

      const existingBySource = await prisma.product.findFirst({
        where: { sourceUrl: item.url },
        select: { id: true, slug: true, description: true, images: true, stock: true },
      });

      let existingByFingerprint: { id: string; description: string | null; images: string[]; stock: number } | null = null;
      if (!existingBySource) {
        existingByFingerprint = await prisma.product.findFirst({
          where: {
            name: item.name,
            costPrice: item.costPrice,
            ...(primaryImage
              ? { images: { has: primaryImage } }
              : {}),
          },
          select: { id: true, description: true, images: true, stock: true },
          orderBy: { updatedAt: 'desc' },
        });
      }
      const existingTarget = existingBySource ?? existingByFingerprint;

      if (existingTarget) {
        const importedHasRealImage = item.images.some((img) => !isPlaceholderImage(img));
        const existingHasRealImage = (existingTarget.images ?? []).some((img) => !isPlaceholderImage(img));
        const descriptionToSave =
          item.description && item.description.length >= (existingTarget.description?.length ?? 0)
            ? item.description
            : existingTarget.description;
        const updated = await prisma.product.update({
          where: { id: existingTarget.id },
          data: {
            name: item.name,
            description: descriptionToSave ?? undefined,
            costPrice: item.costPrice,
            price: item.price,
            images: importedHasRealImage || !existingHasRealImage ? item.images : existingTarget.images,
            stock: Math.max(100, item.stock, existingTarget.stock),
            categoryId,
            sourceUrl: item.url,
            featured,
            published: true,
            ...(sku && { sku }),
          },
          select: { id: true, name: true, price: true, costPrice: true },
        });
        updatedCount += 1;
        importedProducts.push({
          id: updated.id,
          name: updated.name,
          price: Number(updated.price),
          costPrice: Number(updated.costPrice ?? item.costPrice),
          section: item.sectionName,
          featured,
        });
        continue;
      }

      const baseSlug = slugify(item.name) || `produto-shopee-${Date.now()}`;
      let finalSlug = baseSlug;
      for (let suffix = 1; suffix < 999; suffix += 1) {
        const existingSlug = await prisma.product.findUnique({ where: { slug: finalSlug }, select: { id: true } });
        if (!existingSlug) break;
        finalSlug = `${baseSlug}-${suffix}`;
      }

      if (!finalSlug) {
        skippedCount += 1;
        continue;
      }

      try {
        const created = await prisma.product.create({
          data: {
            name: item.name,
            slug: finalSlug,
            description: item.description ?? undefined,
            costPrice: item.costPrice,
            price: item.price,
            images: item.images,
            stock: item.stock,
            categoryId,
            sourceUrl: item.url,
            featured,
            published: true,
            ...(sku && { sku }),
          },
          select: { id: true, name: true, price: true, costPrice: true },
        });
        createdCount += 1;
        importedProducts.push({
          id: created.id,
          name: created.name,
          price: Number(created.price),
          costPrice: Number(created.costPrice ?? item.costPrice),
          section: item.sectionName,
          featured,
        });
      } catch {
        skippedCount += 1;
      }
    }

    await cacheDel('products:featured');
    res.json({
      message: 'Importação da Shopee finalizada',
      sourceUrl,
      totalUrlsLidas: candidateUrls.length > 0 ? candidateUrls.length : importedRaw.length,
      totalImportados: importedProducts.length,
      createdCount,
      updatedCount,
      skippedCount,
      markupPercent: 15,
      featuredCount,
      products: importedProducts,
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError('Produto não encontrado', 404);

    const orderItems = await prisma.orderItem.findMany({
      where: { productId: id },
      include: { order: { select: { status: true } } },
    });

    const statusesQueImpedemExclusao = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED'];
    const algumPedidoEmAndamento = orderItems.some((item) =>
      statusesQueImpedemExclusao.includes(item.order.status)
    );
    if (algumPedidoEmAndamento) {
      throw new AppError(
        'Não é possível excluir: este produto está em pedidos que ainda não foram entregues.',
        400
      );
    }

    await prisma.product.delete({ where: { id } });
    await cacheDel(`product:${product.slug}`);
    res.json({ message: 'Produto removido' });
  } catch (e) {
    next(e);
  }
});

// Categories
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (e) {
    next(e);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      slug: z.string().optional(),
      description: z.string().optional(),
      parentId: z.string().uuid().optional().nullable(),
    }).parse(req.body);
    const slug = body.slug || slugify(body.name);
    const category = await prisma.category.create({
      data: { ...body, slug },
    });
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
});

// Orders
router.get('/orders', async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    res.json(orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      shippingCost: Number(o.shippingCost),
      discount: Number(o.discount),
      total: Number(o.total),
      shopeeOrderId: o.shopeeOrderId ?? null,
      shopeePlacedAt: o.shopeePlacedAt?.toISOString() ?? null,
    })));
  } catch (e) {
    next(e);
  }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, user: { select: { name: true, email: true } } },
    });
    if (!order) throw new AppError('Pedido não encontrado', 404);
    res.json({
      ...order,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
      shopeeOrderId: order.shopeeOrderId ?? null,
      shopeePlacedAt: order.shopeePlacedAt?.toISOString() ?? null,
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    }).parse(req.body);
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status, ...(status === 'SHIPPED' && { trackingCode: `BR${Date.now()}` }) },
    });
    res.json(order);
  } catch (e) {
    next(e);
  }
});

router.patch('/orders/:id/shopee', async (req, res, next) => {
  try {
    const body = z.object({ shopeeOrderId: z.string().optional() }).parse(req.body);
    const normalizedShopeeOrderId = body.shopeeOrderId?.trim() || null;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        shopeeOrderId: normalizedShopeeOrderId,
        shopeePlacedAt: normalizedShopeeOrderId ? new Date() : null,
      },
    });
    res.json({
      id: order.id,
      shopeeOrderId: order.shopeeOrderId,
      shopeePlacedAt: order.shopeePlacedAt?.toISOString() ?? null,
    });
  } catch (e) {
    next(e);
  }
});

// Users
router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().min(1).optional(),
        password: z.string().min(6),
        role: z.enum(['USER', 'ADMIN']).optional(),
      })
      .parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new AppError('E-mail já cadastrado', 400);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        role: body.role ?? 'USER',
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
    });
    res.json({ id: user.id, role: user.role });
  } catch (e) {
    next(e);
  }
});

router.delete('/users/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      throw new AppError('Você não pode excluir sua própria conta', 400);
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// Coupons
router.get('/coupons', async (_req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons.map((c) => ({
      ...c,
      value: Number(c.value),
      minPurchase: c.minPurchase ? Number(c.minPurchase) : null,
    })));
  } catch (e) {
    next(e);
  }
});

router.post('/coupons', async (req, res, next) => {
  try {
    const body = z.object({
      code: z.string().min(1),
      type: z.enum(['PERCENTAGE', 'FIXED']),
      value: z.number().min(0),
      minPurchase: z.number().min(0).optional(),
      maxUses: z.number().int().min(0).optional(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    }).parse(req.body);
    const coupon = await prisma.coupon.create({
      data: {
        ...body,
        code: body.code.toUpperCase(),
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
      },
    });
    res.status(201).json(coupon);
  } catch (e) {
    next(e);
  }
});

// Stats
router.get('/stats', async (_req, res, next) => {
  try {
    const [totalOrders, totalRevenue, totalProducts, totalUsers] = await Promise.all([
      prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({
        where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
      }),
      prisma.product.count(),
      prisma.user.count(),
    ]);
    res.json({
      totalOrders,
      totalRevenue: totalRevenue._sum.total ? Number(totalRevenue._sum.total) : 0,
      totalProducts,
      totalUsers,
    });
  } catch (e) {
    next(e);
  }
});

// Blog (admin)
router.get('/posts', async (_req, res, next) => {
  try {
    const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(posts);
  } catch (e) {
    next(e);
  }
});

router.post('/posts', async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1),
      slug: z.string().optional(),
      excerpt: z.string().optional(),
      content: z.string(),
      published: z.boolean().optional(),
    }).parse(req.body);
    const slug = body.slug || slugify(body.title);
    const post = await prisma.post.create({
      data: { ...body, slug, published: body.published ?? false },
    });
    res.status(201).json(post);
  } catch (e) {
    next(e);
  }
});

router.put('/posts/:id', async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(1).optional(),
      slug: z.string().optional(),
      excerpt: z.string().optional(),
      content: z.string().optional(),
      published: z.boolean().optional(),
    }).parse(req.body);
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json(post);
  } catch (e) {
    next(e);
  }
});

export const adminRoutes = router;
