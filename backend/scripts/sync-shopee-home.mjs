import { chromium } from 'playwright';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ecommerce.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SHOPEE_URL = process.env.SHOPEE_URL || 'https://shopee.com.br/';
const LIMIT = Math.max(1, Math.min(80, Number(process.env.SHOPEE_LIMIT || 24)));
const FEATURED_COUNT = Math.max(0, Math.min(20, Number(process.env.SHOPEE_FEATURED || 8)));

function normalizePrice(text) {
  const priceMatch = text.match(/R\$\s*([\d.,]+)/i);
  if (!priceMatch) return null;
  const value = Number(priceMatch[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeHref(href) {
  if (!href) return null;
  try {
    const u = new URL(href, 'https://shopee.com.br');
    if (!u.hostname.includes('shopee')) return null;
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

async function run() {
  console.log(`[shopee-sync] abrindo ${SHOPEE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
  });

  try {
    await page.goto(SHOPEE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(600);
    }

    const scraped = await page.evaluate((limit) => {
      const nodes = Array.from(
        document.querySelectorAll('a[href*="-i."], a[href*="/product/"], a[href*="shopee.com.br"]')
      );
      const products = [];
      const seen = new Set();
      for (const anchor of nodes) {
        if (products.length >= limit * 2) break;
        const href = anchor.getAttribute('href') || '';
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const img = anchor.querySelector('img');
        const image = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
        const titleAttr = anchor.getAttribute('title');
        const aria = anchor.getAttribute('aria-label');
        const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
        const name = titleAttr || aria || text.split('R$')[0]?.trim();

        if (!name || name.length < 3) continue;
        products.push({
          sourceUrl: href,
          name,
          image,
          text,
        });
      }
      return products;
    }, LIMIT);

    const normalized = scraped
      .map((item) => {
        const sourceUrl = normalizeHref(item.sourceUrl);
        const price = normalizePrice(item.text);
        return {
          sourceUrl,
          name: item.name,
          image: item.image || undefined,
          price,
        };
      })
      .filter((item) => item.sourceUrl && item.price)
      .slice(0, LIMIT);

    if (normalized.length === 0) {
      throw new Error(
        'Não foi possível extrair produtos renderizados da Shopee. Verifique se a página exige login/captcha.'
      );
    }

    console.log(`[shopee-sync] produtos extraídos: ${normalized.length}`);

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

    const importRes = await fetch(`${API_URL}/admin/products/import-shopee-home`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: SHOPEE_URL,
        featuredCount: FEATURED_COUNT,
        products: normalized.map((p) => ({
          sourceUrl: p.sourceUrl,
          name: p.name,
          image: p.image,
          price: p.price,
        })),
      }),
    });
    const importJson = await importRes.json();
    if (!importRes.ok) {
      throw new Error(`Falha ao importar produtos (${importRes.status}): ${JSON.stringify(importJson)}`);
    }

    console.log('[shopee-sync] importação concluída');
    console.log(
      JSON.stringify(
        {
          totalImportados: importJson.totalImportados,
          createdCount: importJson.createdCount,
          updatedCount: importJson.updatedCount,
          skippedCount: importJson.skippedCount,
        },
        null,
        2
      )
    );
  } finally {
    await page.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error('[shopee-sync] erro:', err.message);
  process.exit(1);
});
