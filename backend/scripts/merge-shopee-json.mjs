import fs from "node:fs";
import path from "node:path";

function printUsage() {
  console.log("Uso:");
  console.log("  node scripts/merge-shopee-json.mjs --out ./tmp/produtos.json arquivo1.json [arquivo2.json ...]");
}

function normalizeUrl(href) {
  if (!href || typeof href !== "string") return null;
  try {
    const url = new URL(href, "https://shopee.com.br");
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

function normalizeImage(value) {
  if (!value || typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith("//")) return `https:${v}`;
  if (v.startsWith("/")) return `https://shopee.com.br${v}`;
  if (!v.startsWith("http")) return undefined;
  return v;
}

function parsePrice(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function sanitize(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((p) => {
      const name = typeof p?.name === "string" ? p.name.replace(/\s+/g, " ").trim() : "";
      const price = parsePrice(p?.price);
      if (!name || !price) return null;
      const sourceUrl = normalizeUrl(p?.sourceUrl || p?.url || "");
      if (!sourceUrl) return null;
      const image = normalizeImage(p?.image);
      const description = typeof p?.description === "string" ? p.description.trim() : undefined;
      return { name, price, image, sourceUrl, description };
    })
    .filter(Boolean);
}

function dedupe(products) {
  const map = new Map();
  for (const product of products) {
    const key = product.sourceUrl || `${product.name.toLowerCase()}::${product.price}`;
    if (!map.has(key)) {
      map.set(key, product);
      continue;
    }

    const existing = map.get(key);
    if (!existing.image && product.image) existing.image = product.image;
    if ((!existing.description || existing.description.length < 24) && product.description) {
      existing.description = product.description;
    }
  }
  return Array.from(map.values());
}

function parseArgs(argv) {
  const outIndex = argv.indexOf("--out");
  if (outIndex === -1 || outIndex === argv.length - 1) return null;
  const outFile = argv[outIndex + 1];
  const files = argv.filter((_, i) => i !== outIndex && i !== outIndex + 1);
  return { outFile, files };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args || args.files.length === 0) {
    printUsage();
    process.exit(1);
  }

  const collected = [];
  for (const file of args.files) {
    const abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      console.error(`[merge] arquivo não encontrado: ${abs}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(abs, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error(`[merge] JSON inválido em ${abs}: ${error.message}`);
      process.exit(1);
    }
    const sanitized = sanitize(parsed);
    console.log(`[merge] ${path.basename(abs)} -> ${sanitized.length} itens válidos`);
    collected.push(...sanitized);
  }

  const merged = dedupe(collected);
  const outAbs = path.resolve(process.cwd(), args.outFile);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(merged, null, 2), "utf8");
  console.log(`[merge] total bruto: ${collected.length}`);
  console.log(`[merge] total deduplicado: ${merged.length}`);
  console.log(`[merge] saída: ${outAbs}`);
}

main();
