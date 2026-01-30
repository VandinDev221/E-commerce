/**
 * Formato de entrega padrão: "rua, cidade - estado, CEP"
 */
export function formatAddressLine(
  street: string,
  city: string,
  state: string,
  zipCode: string
): string {
  const zip = (zipCode || '').replace(/\D/g, '');
  const parts = [
    street?.trim(),
    city?.trim() && state?.trim() ? `${city.trim()} - ${state.trim()}` : (city?.trim() || state?.trim()),
    zip,
  ].filter(Boolean);
  return parts.join(', ') || '';
}
