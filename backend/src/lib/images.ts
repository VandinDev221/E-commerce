/** Padrão placehold.co 600x600 com texto (ex: Jaqueta+Jeans) */
const BASE = 'https://placehold.co/600x600?text=';

export function getDefaultImageUrl(name?: string | null): string {
  if (!name?.trim()) return `${BASE}Produto`;
  return `${BASE}${encodeURIComponent(name.trim()).replace(/%20/g, '+')}`;
}

/** Garante que o array de imagens tenha ao menos uma URL (padrão pelo nome). */
export function normalizeProductImages(images: string[] | null | undefined, productName?: string | null): string[] {
  if (images?.length) return images;
  return [getDefaultImageUrl(productName)];
}
