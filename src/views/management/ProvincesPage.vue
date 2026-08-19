<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { apiUrl } from '@/utils/helpers/api-url';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useAuthStore } from '@/stores/auth';
import { useNotification } from '@/composables/useNotification';
import { toSafeNumber } from '@/utils/helpers/record-counts';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';

const route = useRoute();
const authStore = useAuthStore();
const page = ref({ title: 'Provinces' });
const breadcrumbs = ref([
  { title: 'Territories', disabled: false, href: '#' },
  { title: 'Provinces', disabled: true, href: '#' }
]);

interface CountryOption {
  uuid: string;
  name: string;
}

interface ProvinceRecord {
  uuid: string;
  name: string;
  country_uuid?: string | null;
  signature?: string;
  country?: CountryOption;
  country_name?: string;
  users?: Array<Record<string, unknown>>;
  total_areas?: number;
  total_warehouses?: number;
  total_entry?: number;
  total_exist?: number;
  total_users?: number;
  created_at?: string;
  updated_at?: string;
}

interface ApiListResponse<T> {
  status?: string;
  message?: string;
  data?: T[];
  pagination?: Record<string, unknown>;
}

const provinces = ref<ProvinceRecord[]>([]);
const countries = ref<CountryOption[]>([]);
const loading = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const dialog = ref(false);
const editingProvince = ref<ProvinceRecord | null>(null);
const form = ref({
  name: '',
  country_uuid: ''
});
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const deleteDialog = ref(false);
const itemToDelete = ref<ProvinceRecord | null>(null);

const apiBaseUrl = apiUrl('provinces');
const headers = [
  { title: 'Country', key: 'country_name' },
  { title: 'Name', key: 'name' },
  { title: 'Total Areas', key: 'total_areas' },
  { title: 'Total Warehouses', key: 'total_warehouses' },
  { title: 'Total Entry', key: 'total_entry' },
  { title: 'Total Exist', key: 'total_exist' },
  { title: 'Total Users', key: 'total_users' },
  { title: 'Actions', key: 'actions', align: 'end' as const, sortable: false }
];

const { showSuccess, showError } = useNotification();

const notify = (message: string, type: 'success' | 'error') => {
  alertMessage.value = message;
  alertType.value = type;
  if (type === 'success') {
    showSuccess(message);
  } else {
    showError(message);
  }
};

const resetForm = () => {
  form.value = {
    name: '',
    country_uuid: ''
  };
};

const openCreateDialog = () => {
  editingProvince.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (province: ProvinceRecord) => {
  editingProvince.value = province;
  form.value = {
    name: province.name || '',
    country_uuid: province.country_uuid || province.country?.uuid || ''
  };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingProvince.value = null;
};

const openDeleteDialog = (province: ProvinceRecord) => {
  itemToDelete.value = province;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  itemToDelete.value = null;
};

const getCountryName = (countryUuid: string) => {
  const found = countries.value.find((item) => item.uuid === countryUuid);
  return found ? found.name : countryUuid || '—';
};

const loadCountries = async () => {
  try {
    const response = (await fetchWrapper.get(apiUrl('countries/all'))) as ApiListResponse<CountryOption>;
    countries.value = (response.data || []).filter((item) => item?.uuid).map((item) => ({ uuid: item.uuid, name: item.name || 'Unnamed' }));
  } catch (error) {
    notify(error as string, 'error');
  }
};

const loadProvinces = async () => {
  loading.value = true;
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/all`)) as ApiListResponse<ProvinceRecord>;
    provinces.value = (response.data || []).map((item) => ({
      ...item,
      country_name: item.country_uuid ? getCountryName(item.country_uuid) : item.country?.name || '—',
      total_areas: toSafeNumber(item.total_areas ?? 0),
      total_warehouses: toSafeNumber(item.total_warehouses ?? 0),
      total_entry: toSafeNumber(item.total_entry ?? 0),
      total_exist: toSafeNumber(item.total_exist ?? 0),
      total_users: toSafeNumber(item.total_users ?? item.users?.length ?? 0)
    }));
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    loading.value = false;
  }
};

const submitProvince = async () => {
  if (!form.value.name.trim()) {
    notify('Province name is required', 'error');
    return;
  }

  if (!form.value.country_uuid) {
    notify('Country is required', 'error');
    return;
  }

  submitting.value = true;

  try {
    const payload = {
      name: form.value.name.trim(),
      country_uuid: form.value.country_uuid,
      signature: authStore.user?.fullname || authStore.user?.email || ''
    };

    if (editingProvince.value) {
      await fetchWrapper.put(`${apiBaseUrl}/update/${editingProvince.value.uuid}`, payload);
      notify('Province updated successfully', 'success');
    } else {
      await fetchWrapper.post(`${apiBaseUrl}/create`, payload);
      notify('Province created successfully', 'success');
    }

    closeDialog();
    await loadProvinces();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    submitting.value = false;
  }
};

const deleteProvince = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;

  try {
    await fetchWrapper.delete(`${apiBaseUrl}/delete/${itemToDelete.value.uuid}`);
    notify('Province deleted successfully', 'success');
    closeDeleteDialog();
    await loadProvinces();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  loadCountries();
  loadProvinces();
});

const pageTitle = computed<string>(() => String(route.meta?.title || page.value.title));
</script>

<template>
  <BaseBreadcrumb :title="pageTitle" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard :title="pageTitle">
        <div class="d-flex justify-end mb-4">
          <v-btn color="primary" @click="openCreateDialog">Add Province</v-btn>
        </div>

        <v-alert v-if="alertMessage" class="mb-4" :type="alertType" variant="tonal" closable @click:close="alertMessage = ''">
          {{ alertMessage }}
        </v-alert>

        <v-data-table :headers="headers" :items="provinces" :loading="loading" class="elevation-0" density="comfortable">
          <template #item.country_name="{ item }">
            <span>{{ item.country_name || '—' }}</span>
          </template>

          <template #item.total_areas="{ item }">
            <span>{{ item.total_areas ?? 0 }}</span>
          </template>

          <template #item.total_warehouses="{ item }">
            <span>{{ item.total_warehouses ?? 0 }}</span>
          </template>

          <template #item.total_entry="{ item }">
            <span>{{ item.total_entry ?? 0 }}</span>
          </template>

          <template #item.total_exist="{ item }">
            <span>{{ item.total_exist ?? 0 }}</span>
          </template>

          <template #item.total_users="{ item }">
            <span>{{ item.total_users ?? 0 }}</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-2 justify-end align-center">
              <v-btn size="x-small" color="primary" variant="text" icon @click="openEditDialog(item)">
                <PencilIcon size="18" />
              </v-btn>

              <v-btn size="x-small" color="error" variant="text" icon @click="openDeleteDialog(item)">
                <TrashIcon size="18" />
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <v-dialog v-model="deleteDialog" max-width="420" persistent>
    <v-card>
      <v-card-title class="text-h6 px-6 pt-6">Delete Confirmation</v-card-title>
      <v-card-text class="px-6 pb-2">
        Are you sure you want to delete this item? This action cannot be undone.
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
        <v-btn color="error" :loading="deleting" @click="deleteProvince">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" max-width="520">
    <v-card>
      <v-card-title class="px-6 pt-6">
        {{ editingProvince ? 'Edit Province' : 'Create Province' }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-text-field v-model="form.name" label="Province Name" required />
          </v-col>
          <v-col cols="12">
            <v-select v-model="form.country_uuid" :items="countries" item-title="name" item-value="uuid" label="Country" clearable />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" @click="submitProvince">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
