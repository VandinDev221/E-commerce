/** Placeholder estável por produto (evita dependência de SVG externo). */
const BASE = 'https://picsum.photos/seed/';

function slugSeed(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'produto';
}

export function getDefaultImageUrl(name?: string | null): string {
  const seed = slugSeed(name?.trim() || 'produto');
  return `${BASE}${seed}/600/600`;
}

/** Garante que o array de imagens tenha ao menos uma URL (padrão pelo nome). */
export function normalizeProductImages(images: string[] | null | undefined, productName?: string | null): string[] {
  if (images?.length) return images;
  return [getDefaultImageUrl(productName)];
}
