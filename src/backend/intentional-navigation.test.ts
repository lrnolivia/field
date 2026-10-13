import { afterEach, describe, expect, it } from 'vitest';
import {
  armIntentionalNavigationBypass,
  consumeIntentionalNavigationBypass,
  resetIntentionalNavigationBypassForTests,
} from './intentional-navigation';

afterEach(() => resetIntentionalNavigationBypassForTests());

describe('intentional navigation unload bypass', () => {
  it('is one-shot', () => {
    armIntentionalNavigationBypass(1000, 2000);
    expect(consumeIntentionalNavigationBypass(1500)).toBe(true);
    expect(consumeIntentionalNavigationBypass(1501)).toBe(false);
  });

  it('expires instead of suppressing an unrelated later unload', () => {
    armIntentionalNavigationBypass(1000, 500);
    expect(consumeIntentionalNavigationBypass(1600)).toBe(false);
  });

  it('does not exist until explicitly armed', () => {
    expect(consumeIntentionalNavigationBypass(1000)).toBe(false);
  });
});
