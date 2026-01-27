import { describe, expect, it, vi } from 'vitest';

async function loadApiModule(baseUrl?: string) {
  vi.resetModules();
  if (baseUrl) {
    process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
  } else {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return import('@/lib/client/api');
}

describe('apiUrl', () => {
  it('returns relative path when base is missing', async () => {
    const { apiUrl } = await loadApiModule();
    expect(apiUrl('/api/health')).toBe('/api/health');
  });

  it('joins base and path when base is present', async () => {
    const { apiUrl } = await loadApiModule('https://api.example.test/');
    expect(apiUrl('/api/health')).toBe('https://api.example.test/api/health');
  });
});
