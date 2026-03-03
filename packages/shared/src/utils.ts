export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function isWithinTimeRange(
  time: string,
  from: string | null,
  to: string | null,
): boolean {
  if (!from || !to) return true;
  const [h, m] = time.split(':').map(Number);
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const mins = h * 60 + m;
  const fmins = fh * 60 + fm;
  const tmins = th * 60 + tm;
  if (fmins <= tmins) return mins >= fmins && mins <= tmins;
  return mins >= fmins || mins <= tmins;
}

export function generateOrderNumber(lastNumber: number): number {
  return lastNumber + 1;
}
