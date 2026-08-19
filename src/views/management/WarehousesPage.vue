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
const page = ref({ title: 'Warehouses' });
const breadcrumbs = ref([
  { title: 'Territories', disabled: false, href: '#' },
  { title: 'Warehouses', disabled: true, href: '#' }
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

interface AreaOption {
  uuid: string;
  name: string;
  province_uuid?: string | null;
}

interface WarehouseRecord {
  uuid: string;
  name: string;
  country_uuid?: string | null;
  province_uuid?: string | null;
  area_uuid?: string | null;
  province?: {
    uuid?: string;
    name?: string;
  };
  signature?: string;
  country_name?: string;
  province_name?: string;
  area_name?: string;
  users?: Array<Record<string, unknown>>;
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

const warehouses = ref<WarehouseRecord[]>([]);
const countries = ref<CountryOption[]>([]);
const provinces = ref<ProvinceOption[]>([]);
const areas = ref<AreaOption[]>([]);
const loading = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const dialog = ref(false);
const editingWarehouse = ref<WarehouseRecord | null>(null);
const form = ref({
  name: '',
  country_uuid: '',
  province_uuid: '',
  area_uuid: ''
});
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const deleteDialog = ref(false);
const itemToDelete = ref<WarehouseRecord | null>(null);

const apiBaseUrl = apiUrl('warehouses');
const headers = [
  { title: 'Country', key: 'country_name' },
  { title: 'Province', key: 'province_name' },
  { title: 'Area', key: 'area_name' },
  { title: 'Name', key: 'name' },
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

const getCountryName = (countryUuid: string) => {
  const found = countries.value.find((item) => item.uuid === countryUuid);
  return found ? found.name : countryUuid || '—';
};

const getProvinceName = (provinceUuid?: string | null) => {
  if (!provinceUuid) {
    return '—';
  }

  const found = provinces.value.find((item) => item.uuid === provinceUuid);
  return found ? found.name : provinceUuid;
};

const resetForm = () => {
  form.value = {
    name: '',
    country_uuid: '',
    province_uuid: '',
    area_uuid: ''
  };
};

const openCreateDialog = () => {
  editingWarehouse.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (warehouse: WarehouseRecord) => {
  editingWarehouse.value = warehouse;
  form.value = {
    name: warehouse.name || '',
    country_uuid: warehouse.country_uuid || '',
    province_uuid: warehouse.province_uuid || '',
    area_uuid: warehouse.area_uuid || ''
  };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingWarehouse.value = null;
};

const filteredProvinces = computed<ProvinceOption[]>(() => {
  if (!form.value.country_uuid) {
    return provinces.value;
  }

  return provinces.value.filter((item) => item.country_uuid === form.value.country_uuid);
});

const filteredAreas = computed<AreaOption[]>(() => {
  if (!form.value.province_uuid) {
    return areas.value;
  }

  return areas.value.filter((item) => item.province_uuid === form.value.province_uuid);
});

const handleCountryChange = (value: string | null) => {
  form.value.country_uuid = value || '';
  form.value.province_uuid = '';
  form.value.area_uuid = '';
};

const handleProvinceChange = (value: string | null) => {
  form.value.province_uuid = value || '';
  form.value.area_uuid = '';
};

const openDeleteDialog = (warehouse: WarehouseRecord) => {
  itemToDelete.value = warehouse;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  itemToDelete.value = null;
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
  try {
    const response = (await fetchWrapper.get(apiUrl('areas/all'))) as ApiListResponse<AreaOption>;
    areas.value = (response.data || []).filter((item) => item?.uuid).map((item) => ({ uuid: item.uuid, name: item.name || 'Unnamed', province_uuid: item.province_uuid }));
  } catch (error) {
    notify(error as string, 'error');
  }
};

const loadWarehouses = async () => {
  loading.value = true;
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/all`)) as ApiListResponse<WarehouseRecord>;
    warehouses.value = (response.data || []).map((item) => ({
      ...item,
      country_name: item.country_uuid ? getCountryName(item.country_uuid) : '—',
      province_name: item.province_uuid ? getProvinceName(item.province_uuid) : '—',
      area_name: item.area_name || '—',
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

const submitWarehouse = async () => {
  if (!form.value.name.trim()) {
    notify('Warehouse name is required', 'error');
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
      country_uuid: form.value.country_uuid,
      province_uuid: form.value.province_uuid,
      area_uuid: form.value.area_uuid || null,
      signature: authStore.user?.fullname || authStore.user?.email || ''
    };

    if (editingWarehouse.value) {
      await fetchWrapper.put(`${apiBaseUrl}/update/${editingWarehouse.value.uuid}`, payload);
      notify('Warehouse updated successfully', 'success');
    } else {
      await fetchWrapper.post(`${apiBaseUrl}/create`, payload);
      notify('Warehouse created successfully', 'success');
    }

    closeDialog();
    await loadWarehouses();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    submitting.value = false;
  }
};

const deleteWarehouse = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;

  try {
    await fetchWrapper.delete(`${apiBaseUrl}/delete/${itemToDelete.value.uuid}`);
    notify('Warehouse deleted successfully', 'success');
    closeDeleteDialog();
    await loadWarehouses();
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
  loadWarehouses();
});

const pageTitle = computed<string>(() => String(route.meta?.title || page.value.title));
</script>

<template>
  <BaseBreadcrumb :title="pageTitle" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard :title="pageTitle">
        <div class="d-flex justify-end mb-4">
          <v-btn color="primary" @click="openCreateDialog">Add Warehouse</v-btn>
        </div>

        <v-alert v-if="alertMessage" class="mb-4" :type="alertType" variant="tonal" closable @click:close="alertMessage = ''">
          {{ alertMessage }}
        </v-alert>

        <v-data-table :headers="headers" :items="warehouses" :loading="loading" class="elevation-0" density="comfortable">
          <template #item.country_name="{ item }">
            <span>{{ item.country_name || '—' }}</span>
          </template>

          <template #item.province_name="{ item }">
            <span>{{ item.province?.name || getProvinceName(item.province_uuid) || item.province_name || '—' }}</span>
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
        <v-btn color="error" :loading="deleting" @click="deleteWarehouse">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" max-width="560">
    <v-card>
      <v-card-title class="px-6 pt-6">
        {{ editingWarehouse ? 'Edit Warehouse' : 'Create Warehouse' }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-text-field v-model="form.name" label="Warehouse Name" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.country_uuid" :items="countries" item-title="name" item-value="uuid" label="Country" clearable @update:model-value="handleCountryChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.province_uuid" :items="filteredProvinces" item-title="name" item-value="uuid" label="Province" clearable :disabled="!form.country_uuid" @update:model-value="handleProvinceChange" />
          </v-col>
          <v-col cols="12">
            <v-select v-model="form.area_uuid" :items="filteredAreas" item-title="name" item-value="uuid" label="Area" clearable :disabled="!form.province_uuid" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" @click="submitWarehouse">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
