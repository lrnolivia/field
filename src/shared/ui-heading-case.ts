// Only built-in chrome passes through this formatter. Authored names, content
// and font previews must remain untouched at their call sites.
export function formatUiChrome(value: string, enabled: boolean): string {
  return enabled ? value.toLowerCase() : value;
}

export function formatUiHeading(value: string, enabled: boolean): string {
  return formatUiChrome(value, enabled);
}
