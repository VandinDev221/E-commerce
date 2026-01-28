/** Padrão placehold.co 600x600 com texto (ex: Jaqueta+Jeans) */
const BASE = 'https://placehold.co/600x600?text=';
export function getDefaultImageUrl(name) {
    if (!name?.trim())
        return `${BASE}Produto`;
    return `${BASE}${encodeURIComponent(name.trim()).replace(/%20/g, '+')}`;
}
/** Garante que o array de imagens tenha ao menos uma URL (padrão pelo nome). */
export function normalizeProductImages(images, productName) {
    if (images?.length)
        return images;
    return [getDefaultImageUrl(productName)];
}
//# sourceMappingURL=images.js.map