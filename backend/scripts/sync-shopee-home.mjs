import { chromium } from 'playwright';
import fs from 'node:fs';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ecommerce.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SHOPEE_URL = process.env.SHOPEE_URL || 'https://shopee.com.br/';
const SECTION_URLS = (process.env.SHOPEE_SECTION_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const INPUT_FILE = process.env.SHOPEE_INPUT_FILE || '';
const LIMIT = Math.max(1, Math.min(5000, Number(process.env.SHOPEE_LIMIT || 200)));
const FEATURED_COUNT = Math.max(0, Math.min(20, Number(process.env.SHOPEE_FEATURED || 8)));
const BATCH_SIZE = Math.max(1, Math.min(80, Number(process.env.SHOPEE_BATCH_SIZE || 80)));
const WAIT_LOGIN_SECONDS = Math.max(30, Math.min(600, Number(process.env.SHOPEE_WAIT_LOGIN_SECONDS || 180)));
const HEADLESS = String(process.env.SHOPEE_HEADLESS || 'false').toLowerCase() === 'true';
const PROFILE_DIR = process.env.SHOPEE_PROFILE_DIR || '.shopee-profile';
const SCROLL_ROUNDS = Math.max(4, Math.min(30, Number(process.env.SHOPEE_SCROLL_ROUNDS || 12)));
const SCROLL_STEP = Math.max(600, Math.min(2200, Number(process.env.SHOPEE_SCROLL_STEP || 1500)));

function normalizePrice(text) {
  const priceMatch = text.match(/R\$\s*([\d.,]+)/i);
  if (!priceMatch) return null;
  const value = Number(priceMatch[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeHref(href, base = 'https://shopee.com.br') {
  if (!href) return null;
  try {
    const u = new URL(href, base);
    if (!u.hostname.includes('shopee')) return null;
    u.hash = '';
    if (u.searchParams.has('sp_atk')) u.searchParams.delete('sp_atk');
    if (u.searchParams.has('xptdk')) u.searchParams.delete('xptdk');
    return u.toString();
  } catch {
    return null;
  }
}

async function waitForLoginIfNeeded(page) {
  const checkNeedsLogin = () => {
    const url = page.url().toLowerCase();
    return url.includes('/buyer/login') || url.includes('/verify');
  };
  if (!checkNeedsLogin()) return;
  if (HEADLESS) {
    throw new Error('Shopee pediu login e o script está em headless. Rode com SHOPEE_HEADLESS=false para autenticar.');
  }
  console.log(
    `[shopee-sync] login necessário. Faça login no navegador aberto. Aguardando até ${WAIT_LOGIN_SECONDS}s...`
  );
  const deadline = Date.now() + WAIT_LOGIN_SECONDS * 1000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1500);
    if (!checkNeedsLogin()) {
      console.log('[shopee-sync] login detectado, continuando importação.');
      return;
    }
  }
  throw new Error('Tempo esgotado aguardando login na Shopee.');
}

function sanitizeInputProducts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const name = typeof p?.name === 'string' ? p.name.trim() : '';
      const price = Number(p?.price);
      if (!name || !Number.isFinite(price) || price <= 0) return null;
      const sourceUrl = typeof p?.sourceUrl === 'string' ? normalizeHref(p.sourceUrl) : null;
      const image = typeof p?.image === 'string' && p.image.startsWith('http') ? p.image : undefined;
      const description = typeof p?.description === 'string' ? p.description : undefined;
      return { name, price, sourceUrl: sourceUrl ?? undefined, image, description };
    })
    .filter(Boolean);
}

async function collectProductsFromPage(page, maxProducts) {
  await waitForLoginIfNeeded(page);
  await page.waitForTimeout(2000);

  let previousCount = 0;
  let stagnant = 0;
  for (let i = 0; i < SCROLL_ROUNDS; i += 1) {
    await page.mouse.wheel(0, SCROLL_STEP);
    await page.waitForTimeout(700);
    const count = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="-i."], a[href*="/product/"]');
      return links.length;
    });
    if (count <= previousCount) stagnant += 1;
    else stagnant = 0;
    previousCount = count;
    if (stagnant >= 4 || count >= maxProducts * 2) break;
  }

  const scraped = await page.evaluate((cap) => {
    const nodes = Array.from(document.querySelectorAll('a[href*="-i."], a[href*="/product/"]'));
    const items = [];
    const seen = new Set();
    for (const anchor of nodes) {
      if (items.length >= cap * 3) break;
      const href = anchor.getAttribute('href') || '';
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const img = anchor.querySelector('img');
      const image =
        img?.getAttribute('src')
        || img?.getAttribute('data-src')
        || img?.getAttribute('data-lazy-src')
        || '';
      const titleAttr = anchor.getAttribute('title');
      const aria = anchor.getAttribute('aria-label');
      const blockText = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
      const priceTextMatch = blockText.match(/R\$\s*[\d.,]+/);
      const priceText = priceTextMatch?.[0] || '';
      const nameCandidate = titleAttr || aria || blockText.split('R$')[0]?.trim() || '';
      if (nameCandidate.length < 3 || !priceText) continue;
      items.push({
        sourceUrl: href,
        name: nameCandidate,
        image,
        priceText,
      });
    }
    return items;
  }, maxProducts);

  return scraped
    .map((item) => {
      const sourceUrl = normalizeHref(item.sourceUrl, page.url());
      const price = normalizePrice(item.priceText);
      return {
        sourceUrl,
        name: item.name,
        image: item.image && item.image.startsWith('http') ? item.image : undefined,
        price,
      };
    })
    .filter((item) => item.sourceUrl && item.price);
}

async function loginAdmin() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    const text = await loginRes.text();
    throw new Error(`Falha no login admin (${loginRes.status}): ${text}`);
  }
  const loginJson = await loginRes.json();
  const token = loginJson.accessToken;
  if (!token) throw new Error('Token de admin ausente na resposta de login');
  return token;
}

async function importInBatches(token, products) {
  let totalImportados = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const importRes = await fetch(`${API_URL}/admin/products/import-shopee-home`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: SHOPEE_URL,
        limit: chunk.length,
        featuredCount: i === 0 ? FEATURED_COUNT : 0,
        products: chunk,
      }),
    });
    const importJson = await importRes.json();
    if (!importRes.ok) {
      throw new Error(
        `Falha ao importar lote ${Math.floor(i / BATCH_SIZE) + 1} (${importRes.status}): ${JSON.stringify(importJson)}`
      );
    }
    totalImportados += importJson.totalImportados ?? 0;
    createdCount += importJson.createdCount ?? 0;
    updatedCount += importJson.updatedCount ?? 0;
    skippedCount += importJson.skippedCount ?? 0;
    console.log(
      `[shopee-sync] lote ${Math.floor(i / BATCH_SIZE) + 1}: +${importJson.totalImportados ?? 0} importados`
    );
  }
  return { totalImportados, createdCount, updatedCount, skippedCount };
}

async function run() {
  let products = [];

  if (INPUT_FILE) {
    const fileRaw = fs.readFileSync(INPUT_FILE, 'utf8');
    const parsed = JSON.parse(fileRaw);
    products = sanitizeInputProducts(parsed).slice(0, LIMIT);
    if (products.length === 0) {
      throw new Error('Arquivo de entrada não contém produtos válidos. Use um JSON array com name e price.');
    }
    console.log(`[shopee-sync] carregados ${products.length} produtos do arquivo ${INPUT_FILE}`);
  } else {
    console.log(`[shopee-sync] abrindo Shopee com perfil persistente em ${PROFILE_DIR}`);
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: HEADLESS,
      viewport: { width: 1366, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    const page = context.pages()[0] ?? (await context.newPage());

    try {
      const targets = [SHOPEE_URL, ...SECTION_URLS].slice(0, 20);
      const seen = new Map();
      for (const target of targets) {
        console.log(`[shopee-sync] coletando: ${target}`);
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const extracted = await collectProductsFromPage(page, LIMIT);
        for (const item of extracted) {
          if (!item.sourceUrl) continue;
          if (!seen.has(item.sourceUrl)) seen.set(item.sourceUrl, item);
        }
        if (seen.size >= LIMIT) break;
      }
      products = Array.from(seen.values()).slice(0, LIMIT);
      if (products.length === 0) {
        throw new Error(
          'Não foi possível extrair produtos automaticamente. Faça login na Shopee e tente novamente, ou use SHOPEE_INPUT_FILE.'
        );
      }
      console.log(`[shopee-sync] produtos extraídos do navegador: ${products.length}`);
    } finally {
      await context.close();
    }
  }

  const token = await loginAdmin();
  const summary = await importInBatches(
    token,
    products.map((p) => ({
      sourceUrl: p.sourceUrl,
      name: p.name,
      image: p.image,
      price: p.price,
    }))
  );
  console.log('[shopee-sync] importação concluída');
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((err) => {
  console.error('[shopee-sync] erro:', err.message);
  process.exit(1);
});
