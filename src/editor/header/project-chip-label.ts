// Pure label helper kept separate from ProjectChip so its route-label behavior
// can be tested without importing editor chrome/backend modules.
export function getHeaderPageLabel(rawLabel: string): string {
  if (!rawLabel) return '';
  if (rawLabel === '/') return 'Home';
  if (rawLabel.startsWith('/')) {
    const segments = rawLabel.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1]! : rawLabel;
  }
  return rawLabel;
}
