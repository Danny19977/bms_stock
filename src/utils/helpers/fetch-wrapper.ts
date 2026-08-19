import { useAuthStore } from '@/stores/auth';
import { apiBaseUrl } from '@/utils/helpers/api-url';

export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE')
};

interface temp {
  method: string;
  headers: Record<string, string>;
  body?: BodyInit;
}

interface UserData {
  token?: string;
  user?: Record<string, unknown>;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

function request(method: string) {
  return (url: string, body?: object | FormData) => {
    const requestOptions: temp = {
      method,
      headers: authHeader(url)
    };
    if (body) {
      if (body instanceof FormData) {
        requestOptions.body = body;
      } else {
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.body = JSON.stringify(body);
      }
    }
    return fetch(url, requestOptions).then(handleResponse);
  };
}

// helper functions

function authHeader(url: string): Record<string, string> {
  // return auth header with jwt if user is logged in and request is to the api url
  const { user } = useAuthStore();
  const isLoggedIn = !!user?.token;
  const isApiUrl = url.startsWith(apiBaseUrl);
  if (isLoggedIn && isApiUrl) {
    return { Authorization: `Bearer ${user.token}` };
  } else {
    return {};
  }
}

function handleResponse(response: Response): Promise<UserData> {
  return response.text().then((text: string) => {
    let data: any = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const { user, logout } = useAuthStore();
      if ([401, 403].includes(response.status) && user) {
        logout();
      }

      const error: string = (data && (data.message || data.error)) || response.statusText || 'Request failed';
      return Promise.reject(error);
    }

    return data as UserData;
  });
}
