const configuredApiUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '');

export const apiBaseUrl = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

export function apiUrl(path: string) {
  return `${apiBaseUrl}/${path.replace(/^\/+/, '')}`;
}