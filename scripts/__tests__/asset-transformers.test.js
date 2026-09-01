import { describe, it, expect } from 'vitest';
import {
  populateAssetFromContentAIHit,
  populateAssetFromMetadata,
} from '../asset-transformers.js';

describe('asset-transformers', () => {
  it('uses dc:subject as the keyword fallback for ContentAI hits', () => {
    const asset = populateAssetFromContentAIHit({
      assetId: 'a1',
      repositoryMetadata: {
        'repo:name': 'swift.jpg',
        'dc:format': 'image/jpeg',
      },
      assetMetadata: {
        'dc:title': 'Swift',
        'dc:subject': ['hatchback', 'maruti suzuki'],
      },
    });

    expect(asset.tags).toBe('hatchback, maruti suzuki');
    expect(asset.xcmKeywords).toBe('hatchback, maruti suzuki');
  });

  it('uses dc:subject as the keyword fallback for metadata reads', () => {
    const asset = populateAssetFromMetadata({
      repositoryMetadata: {
        'repo:name': 'brezza.jpg',
        'dc:format': 'image/jpeg',
      },
      assetMetadata: {
        'dc:title': 'Brezza',
        'dc:subject': ['suv', 'campaign:arena'],
      },
    });

    expect(asset.tags).toBe('suv, arena');
    expect(asset.xcmKeywords).toBe('suv, arena');
  });
});
