function isRealImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('placehold.co') || host.includes('dummyimage.com') || host.includes('picsum.photos')) {
      return false;
    }
    if (host.includes('img.susercontent.com') || host.includes('res.cloudinary.com')) return true;
    return /\.(jpg|jpeg|png|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** Mantém apenas URLs de imagem reais e válidas. */
export function normalizeProductImages(images: string[] | null | undefined): string[] {
  return Array.from(
    new Set((images ?? []).filter((img) => typeof img === 'string' && isRealImageUrl(img)))
  );
}
