import { describe, expect, it, vi, beforeEach } from 'vitest';
import { extractUrlsFromText, fetchLinkPreview } from '../../lib/linkPreview';

const { authedFetchMock, parseJsonResponseMock } = vi.hoisted(() => ({
  authedFetchMock: vi.fn(),
  parseJsonResponseMock: vi.fn(),
}));

vi.mock('../../lib/api/authFetch', () => ({
  authedFetch: authedFetchMock,
}));

vi.mock('../../lib/api/feedsApiCore', () => ({
  API_BASE: '',
  parseJsonResponse: parseJsonResponseMock,
}));

describe('linkPreview', () => {
  beforeEach(() => {
    authedFetchMock.mockReset();
    parseJsonResponseMock.mockReset();
  });

  it('extracts unique urls in original order', () => {
    expect(
      extractUrlsFromText(
        'One https://example.com two https://example.com and https://github.com/openai',
      ),
    ).toEqual(['https://example.com', 'https://github.com/openai']);
  });

  it('returns parsed preview data when the endpoint succeeds', async () => {
    authedFetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    parseJsonResponseMock.mockResolvedValue({
      data: {
        url: 'https://example.com',
        title: 'Example',
        siteName: 'Example',
      },
    });

    await expect(fetchLinkPreview('https://example.com')).resolves.toEqual({
      url: 'https://example.com',
      title: 'Example',
      siteName: 'Example',
    });
  });

  it('returns null when preview fetch fails', async () => {
    authedFetchMock.mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(fetchLinkPreview('https://example.com')).resolves.toBeNull();
  });
});
