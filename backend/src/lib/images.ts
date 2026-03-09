/** Placeholder PNG com nome do produto (sem imagem aleatória). */
const BASE = 'https://dummyimage.com/600x600/f3f4f6/111827.png&text=';

function labelText(name: string) {
  return (name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Produto');
}

export function getDefaultImageUrl(name?: string | null): string {
  const label = labelText(name?.trim() || 'Produto');
  return `${BASE}${encodeURIComponent(label).replace(/%20/g, '+')}`;
}

/** Garante que o array de imagens tenha ao menos uma URL (padrão pelo nome). */
export function normalizeProductImages(images: string[] | null | undefined, productName?: string | null): string[] {
  if (images?.length) return images;
  return [getDefaultImageUrl(productName)];
}
