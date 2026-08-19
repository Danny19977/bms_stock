import { defineStore } from 'pinia';

import { apiUrl } from '@/utils/helpers/api-url';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const baseUrl = apiUrl('users');

export const useUsersStore = defineStore({
  id: 'Authuser',
  state: () => ({
    users: {}
  }),
  actions: {
    async getAll() {
      this.users = { loading: true };
      fetchWrapper
        .get(baseUrl)
        .then((users) => (this.users = users))
        .catch((error) => (this.users = { error }));
    }
  }
});
