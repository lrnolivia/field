import { describe, expect, it } from 'vitest';
import { createDefaultShadow, formatShadowEntries, parseShadowEntries } from '@/editor/ui/shadow-utils';

describe('effect shadow CSS contract', () => {
  it('formats the default box shadow as valid visible CSS and round-trips it', () => {
    const original = createDefaultShadow();
    const formatted = formatShadowEntries([original]);
    expect(formatted.boxShadow).toBe('0px 4px 8px 0px rgba(0, 0, 0, 0.25)');
    const [roundTrip] = parseShadowEntries(formatted.boxShadow, '');
    expect(roundTrip).toMatchObject({
      type: 'box',
      x: 0,
      y: 4,
      blur: 8,
      spread: 0,
      color: 'rgba(0, 0, 0, 0.25)',
    });
  });

  it('formats drop shadow separately so non-shadow filters can be preserved by the editor', () => {
    const drop = { ...createDefaultShadow(), type: 'drop' as const, x: 2, y: 3, blur: 6, color: '#00000080' };
    const formatted = formatShadowEntries([drop]);
    expect(formatted.boxShadow).toBe('');
    expect(formatted.dropShadowFilter).toBe('drop-shadow(2px 3px 6px #00000080)');
  });
});
