export function money(cents: number): string {
  return `$${(Number(cents || 0) / 100).toFixed(0)}`;
}
