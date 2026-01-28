/** Padrão placehold.co 600x600 com texto (ex: Jaqueta+Jeans) */
export const DEFAULT_IMAGE =
  'https://placehold.co/600x600?text=Produto';

export function getDefaultImageUrl(text?: string | null): string {
  if (!text?.trim()) return DEFAULT_IMAGE;
  return `https://placehold.co/600x600?text=${encodeURIComponent(text.trim()).replace(/%20/g, '+')}`;
}
