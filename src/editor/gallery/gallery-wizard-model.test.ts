import { describe, expect, it } from 'vitest';
import {
  appendGalleryWizardMedia,
  moveGalleryWizardMedia,
  removeGalleryWizardMedia,
} from './gallery-wizard-model';

describe('Gallery creation wizard model', () => {
  it('dedupes canonical media URLs while preserving selection order', () => {
    expect(appendGalleryWizardMedia(['/a.jpg', '/b.jpg'], ['/b.jpg', '/c.jpg', '/a.jpg']))
      .toEqual(['/a.jpg', '/b.jpg', '/c.jpg']);
  });

  it('supports deliberate initial ordering without mutating the prior list', () => {
    const original = ['/a.jpg', '/b.jpg', '/c.jpg'];
    expect(moveGalleryWizardMedia(original, 1, -1)).toEqual(['/b.jpg', '/a.jpg', '/c.jpg']);
    expect(moveGalleryWizardMedia(original, 1, 1)).toEqual(['/a.jpg', '/c.jpg', '/b.jpg']);
    expect(original).toEqual(['/a.jpg', '/b.jpg', '/c.jpg']);
  });

  it('removes media predictably and hard-stops invalid moves', () => {
    expect(removeGalleryWizardMedia(['/a.jpg', '/b.jpg'], 0)).toEqual(['/b.jpg']);
    expect(moveGalleryWizardMedia(['/a.jpg'], 0, -1)).toEqual(['/a.jpg']);
  });
});
