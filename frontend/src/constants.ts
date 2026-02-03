/** Padrão placehold.co 600x600 com texto (ex: Jaqueta+Jeans) */
export const DEFAULT_IMAGE =
  'https://placehold.co/600x600?text=Produto';

export function getDefaultImageUrl(text?: string | null): string {
  if (!text?.trim()) return DEFAULT_IMAGE;
  return `https://placehold.co/600x600?text=${encodeURIComponent(text.trim()).replace(/%20/g, '+')}`;
}

/** Dados do remetente para etiqueta (padrão Shopee). Configure via .env (VITE_LABEL_*) ou edite aqui. */
export const LABEL_STORE = {
  NOME_LOJA: import.meta.env.VITE_LABEL_STORE_NAME ?? 'Minha Loja',
  CNPJ_LOJA: import.meta.env.VITE_LABEL_STORE_CNPJ ?? '',
  ENDERECO_LOJA: import.meta.env.VITE_LABEL_STORE_ADDRESS ?? '',
};
