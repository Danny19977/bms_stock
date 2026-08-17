import { defineStore } from 'pinia';
import { router } from '@/router';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useNotificationStore } from '@/stores/notificationStore';

const baseUrl = `${import.meta.env.VITE_API_URL}/auth`;

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    // initialize state from local storage to enable user to stay logged in
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    })(),
    returnUrl: null as string | null
  }),
  actions: {
    async login(identifier: string, password: string) {
      const notificationStore = useNotificationStore();

      try {
        const response = await fetchWrapper.post(`${baseUrl}/login`, { identifier, password });

        const authUser = {
          ...(typeof response?.user === 'object' && response.user ? response.user : response),
          token: response?.token
        };

        // update pinia state
        this.user = authUser;
        // store user details and jwt in local storage to keep user logged in between page refreshes
        localStorage.setItem('user', JSON.stringify(authUser));
        notificationStore.success('Successfully logged in! Welcome back.');
        // redirect to previous url or default to home page
        router.push(this.returnUrl || '/dashboard/default');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        notificationStore.error(message);
        throw error;
      }
    },
    logout(message = 'You have been logged out.') {
      const notificationStore = useNotificationStore();
      this.user = null;
      localStorage.removeItem('user');
      notificationStore.info(message);
      router.push('/login');
    }
  }
});
