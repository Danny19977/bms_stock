<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { apiUrl } from '@/utils/helpers/api-url';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useNotification } from '@/composables/useNotification';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';

const route = useRoute();
const page = ref({ title: 'Areas' });
const breadcrumbs = ref([
  { title: 'Territories', disabled: false, href: '#' },
  { title: 'Areas', disabled: true, href: '#' }
]);

interface CountryOption {
  uuid: string;
  name: string;
}

interface ProvinceOption {
  uuid: string;
  name: string;
  country_uuid?: string | null;
}

interface AreaRecord {
  uuid: string;
  name: string;
  code?: string | null;
  province_uuid?: string | null;
  province?: ProvinceOption;
  province_name?: string;
  country_uuid?: string | null;
  country_name?: string;
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

const areas = ref<AreaRecord[]>([]);
const countries = ref<CountryOption[]>([]);
const provinces = ref<ProvinceOption[]>([]);
const loading = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const dialog = ref(false);
const editingArea = ref<AreaRecord | null>(null);
const form = ref({
  name: '',
  country_uuid: '',
  province_uuid: ''
});
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const deleteDialog = ref(false);
const itemToDelete = ref<AreaRecord | null>(null);

const apiBaseUrl = apiUrl('areas');
const headers = [
  { title: 'Country', key: 'country_name' },
  { title: 'Province', key: 'province_name' },
  { title: 'Area', key: 'name' },
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
    country_uuid: '',
    province_uuid: ''
  };
};

const openCreateDialog = () => {
  editingArea.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (area: AreaRecord) => {
  editingArea.value = area;
  form.value = {
    name: area.name || '',
    country_uuid: area.country_uuid || area.province?.country_uuid || '',
    province_uuid: area.province_uuid || area.province?.uuid || ''
  };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingArea.value = null;
};

const filteredProvinces = computed<ProvinceOption[]>(() => {
  if (!form.value.country_uuid) {
    return provinces.value;
  }

  return provinces.value.filter((item) => item.country_uuid === form.value.country_uuid);
});

const handleCountryChange = (value: string | null) => {
  form.value.country_uuid = value || '';
  form.value.province_uuid = '';
};

const openDeleteDialog = (area: AreaRecord) => {
  itemToDelete.value = area;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  itemToDelete.value = null;
};

const getCountryName = (countryUuid?: string | null) => {
  if (!countryUuid) {
    return '—';
  }

  const found = countries.value.find((item) => item.uuid === countryUuid);
  return found ? found.name : countryUuid;
};

const getProvinceName = (provinceUuid?: string | null) => {
  if (!provinceUuid) {
    return '—';
  }

  const found = provinces.value.find((item) => item.uuid === provinceUuid);
  return found ? found.name : provinceUuid;
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
  try {
    const response = (await fetchWrapper.get(apiUrl('provinces/all'))) as ApiListResponse<ProvinceOption>;
    provinces.value = (response.data || []).filter((item) => item?.uuid).map((item) => ({ uuid: item.uuid, name: item.name || 'Unnamed', country_uuid: item.country_uuid }));
  } catch (error) {
    notify(error as string, 'error');
  }
};

const loadAreas = async () => {
  loading.value = true;
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/all`)) as ApiListResponse<AreaRecord>;
    areas.value = (response.data || []).map((item) => ({
      ...item,
      country_name: item.country_uuid ? getCountryName(item.country_uuid) : getCountryName(item.province?.country_uuid || null),
      province_name: item.province_uuid ? getProvinceName(item.province_uuid) : item.province?.name || '—',
      total_warehouses: item.total_warehouses ?? 0,
      total_entry: item.total_entry ?? 0,
      total_exist: item.total_exist ?? 0,
      total_users: item.total_users ?? 0
    }));
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    loading.value = false;
  }
};

const submitArea = async () => {
  if (!form.value.name.trim()) {
    notify('Area name is required', 'error');
    return;
  }

  if (!form.value.country_uuid) {
    notify('Country is required', 'error');
    return;
  }

  if (!form.value.province_uuid) {
    notify('Province is required', 'error');
    return;
  }

  submitting.value = true;

  try {
    const payload = {
      name: form.value.name.trim(),
      province_uuid: form.value.province_uuid
    };

    if (editingArea.value) {
      await fetchWrapper.put(`${apiBaseUrl}/update/${editingArea.value.uuid}`, payload);
      notify('Area updated successfully', 'success');
    } else {
      await fetchWrapper.post(`${apiBaseUrl}/create`, payload);
      notify('Area created successfully', 'success');
    }

    closeDialog();
    await loadAreas();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    submitting.value = false;
  }
};

const deleteArea = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;

  try {
    await fetchWrapper.delete(`${apiBaseUrl}/delete/${itemToDelete.value.uuid}`);
    notify('Area deleted successfully', 'success');
    closeDeleteDialog();
    await loadAreas();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  loadCountries();
  loadProvinces();
  loadAreas();
});

const pageTitle = computed<string>(() => String(route.meta?.title || page.value.title));
</script>

<template>
  <BaseBreadcrumb :title="pageTitle" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard :title="pageTitle">
        <div class="d-flex justify-end mb-4">
          <v-btn color="primary" @click="openCreateDialog">Add Area</v-btn>
        </div>

        <v-alert v-if="alertMessage" class="mb-4" :type="alertType" variant="tonal" closable @click:close="alertMessage = ''">
          {{ alertMessage }}
        </v-alert>

        <v-data-table :headers="headers" :items="areas" :loading="loading" class="elevation-0" density="comfortable">
          <template #item.country_name="{ item }">
            <span>{{ item.country_name || '—' }}</span>
          </template>

          <template #item.province_name="{ item }">
            <span>{{ item.province_name || '—' }}</span>
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
        <v-btn color="error" :loading="deleting" @click="deleteArea">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" max-width="520">
    <v-card>
      <v-card-title class="px-6 pt-6">
        {{ editingArea ? 'Edit Area' : 'Create Area' }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-text-field v-model="form.name" label="Area Name" required />
          </v-col>
          <v-col cols="12">
            <v-select v-model="form.country_uuid" :items="countries" item-title="name" item-value="uuid" label="Country" clearable @update:model-value="handleCountryChange" />
          </v-col>
          <v-col cols="12">
            <v-select v-model="form.province_uuid" :items="filteredProvinces" item-title="name" item-value="uuid" label="Province" clearable :disabled="!form.country_uuid" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" @click="submitArea">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
