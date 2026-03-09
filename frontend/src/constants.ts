/** Sem fallback fake: só usar imagem real. */
export const DEFAULT_IMAGE = '';

export function getDefaultImageUrl(): string {
  return DEFAULT_IMAGE;
}

/** Dados do remetente para etiqueta (padrão Shopee). Configure via .env (VITE_LABEL_*) ou edite aqui. */
export const LABEL_STORE = {
  NOME_LOJA: import.meta.env.VITE_LABEL_STORE_NAME ?? 'Minha Loja',
  CNPJ_LOJA: import.meta.env.VITE_LABEL_STORE_CNPJ ?? '00.000.000/0000-00',
  ENDERECO_LOJA: import.meta.env.VITE_LABEL_STORE_ADDRESS ?? 'Rua Exemplo, 123 - Cidade, Estado - 00000-000',
};
