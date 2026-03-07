import { describe, expect, it } from 'vitest';
import {
  getPortfolioUrlSafetyError,
  validatePortfolioUrl,
} from '../../lib/portfolio/linkValidation';

describe('portfolio link safety validation', () => {
  it('accepts normal project URLs', async () => {
    expect(getPortfolioUrlSafetyError('https://phuzzle.vercel.app/')).toBe('');
    const result = await validatePortfolioUrl('https://phuzzle.vercel.app/');
    expect(result.ok).toBe(true);
  });

  it('blocks explicit URLs by keyword', async () => {
    const url = 'https://example.com/xxx-video';
    expect(getPortfolioUrlSafetyError(url)).toMatch(/not allowed/i);
    const result = await validatePortfolioUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not allowed/i);
    }
  });

  it('blocks explicit TLDs', async () => {
    const url = 'https://sample.xxx/path';
    expect(getPortfolioUrlSafetyError(url)).toMatch(/not allowed/i);
    const result = await validatePortfolioUrl(url);
    expect(result.ok).toBe(false);
  });
});
