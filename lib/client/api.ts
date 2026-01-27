const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export function apiUrl(path: string) {
  if (!API_BASE) return path;
  try {
    return new URL(path, API_BASE).toString();
  } catch {
    return path;
  }
}

export function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });
}

export function createApiEventSource(path: string) {
  return new EventSource(apiUrl(path), { withCredentials: true });
}
