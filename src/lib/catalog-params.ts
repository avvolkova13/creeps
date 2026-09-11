export const catalogFilterKeys = ['q', 'category', 'condition', 'weapon', 'type', 'rarity', 'color', 'edition', 'min', 'max', 'floatMin', 'floatMax', 'tradeLock', 'stickers', 'stickerQuery'] as const;
export function updateCatalogParam(search: string, key: string, value: string | readonly string[]): string {
  const params = new URLSearchParams(search);
  params.delete(key);
  for (const item of typeof value === 'string' ? [value] : value) if (item) params.append(key, item);
  return params.toString();
}
export function resetCatalogParams(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of catalogFilterKeys) params.delete(key);
  return params.toString();
}
