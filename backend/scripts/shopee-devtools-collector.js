(() => {
  const MAX_SCROLL_ROUNDS = 24;
  const SCROLL_STEP = 1600;
  const WAIT_MS = 900;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeUrl(href, base = window.location.href) {
    if (!href) return null;
    try {
      const url = new URL(href, base);
      const host = url.hostname.toLowerCase();
      if (!host.endsWith("shopee.com.br") && !host.endsWith("shopee.com")) return null;
      url.hash = "";
      url.searchParams.delete("sp_atk");
      url.searchParams.delete("xptdk");
      return url.toString();
    } catch {
      return null;
    }
  }

  function normalizePrice(value) {
    if (!value) return null;
    const match = value.match(/R\$\s*([\d.,]+)/i);
    if (!match) return null;
    const parsed = Number(match[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function pickImage(card) {
    const img = card?.querySelector("img");
    const raw =
      img?.getAttribute("src") ||
      img?.getAttribute("data-src") ||
      img?.getAttribute("data-lazy-src") ||
      "";
    if (!raw) return undefined;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `https://shopee.com.br${raw}`;
    if (!raw.startsWith("http")) return undefined;
    return raw;
  }

  function pickName(anchor, cardText) {
    const title =
      anchor.getAttribute("title") ||
      anchor.getAttribute("aria-label") ||
      "";
    const cleanTitle = title.replace(/\s+/g, " ").trim();
    if (cleanTitle.length >= 4) return cleanTitle;

    const beforePrice = cardText.split(/R\$/i)[0]?.replace(/\s+/g, " ").trim() || "";
    if (beforePrice.length >= 4) return beforePrice;
    return "";
  }

  function collectNow() {
    const anchors = Array.from(document.querySelectorAll('a[href*="-i."], a[href*="/product/"]'));
    const items = [];
    const seen = new Set();

    for (const anchor of anchors) {
      const sourceUrl = normalizeUrl(anchor.getAttribute("href") || "");
      if (!sourceUrl || seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);

      const card =
        anchor.closest('[data-sqe="item"]') ||
        anchor.closest('[class*="item"]') ||
        anchor.closest('[class*="product"]') ||
        anchor.parentElement;
      const cardText = (card?.textContent || anchor.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      const name = pickName(anchor, cardText);
      const price = normalizePrice(cardText);
      if (!name || !price) continue;

      items.push({
        name,
        price,
        image: pickImage(card),
        sourceUrl,
      });
    }

    return items;
  }

  async function run() {
    console.log("[collector] iniciando coleta da Shopee...");
    const map = new Map();
    let stagnant = 0;
    let previousCount = 0;

    for (let i = 0; i < MAX_SCROLL_ROUNDS; i += 1) {
      const partial = collectNow();
      for (const item of partial) {
        if (!map.has(item.sourceUrl)) map.set(item.sourceUrl, item);
      }

      const currentCount = map.size;
      if (currentCount <= previousCount) stagnant += 1;
      else stagnant = 0;
      previousCount = currentCount;

      console.log(`[collector] rodada ${i + 1}/${MAX_SCROLL_ROUNDS} -> ${currentCount} produtos`);
      window.scrollBy(0, SCROLL_STEP);
      await sleep(WAIT_MS);
      if (stagnant >= 5) break;
    }

    const products = Array.from(map.values());
    const fingerprintCount = new Map();
    for (const p of products) {
      const key = `${(p.name || "").toLowerCase().trim()}|${Number(p.price || 0).toFixed(2)}|${p.image || ""}`;
      fingerprintCount.set(key, (fingerprintCount.get(key) || 0) + 1);
    }
    const topFingerprint = [...fingerprintCount.values()].sort((a, b) => b - a)[0] || 0;
    if (products.length >= 10 && topFingerprint / products.length > 0.6) {
      console.warn(
        `[collector] ALERTA: dados inconsistentes detectados (${topFingerprint}/${products.length} com mesmo fingerprint). Tente outra página/categoria.`
      );
    }
    const payload = JSON.stringify(products, null, 2);

    try {
      await navigator.clipboard.writeText(payload);
      console.log(`[collector] OK: ${products.length} produtos copiados para o clipboard.`);
    } catch {
      console.log("[collector] não foi possível copiar para clipboard automaticamente.");
    }

    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopee_products_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log(
      `[collector] arquivo JSON baixado. Agora importe com: npm run shopee:import-file -- /caminho/arquivo.json`
    );
    return products;
  }

  run();
})();
