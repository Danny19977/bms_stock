<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useAuthStore } from '@/stores/auth';
import { useNotification } from '@/composables/useNotification';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';

const route = useRoute();
const authStore = useAuthStore();
const page = ref({ title: 'Users' });
const breadcrumbs = ref([
  { title: 'Management', disabled: false, href: '#' },
  { title: 'Users', disabled: true, href: '#' }
]);

interface UserRecord {
  uuid: string;
  fullname: string;
  email: string;
  phone: string;
  title: string;
  role: string;
  permission: string;
  status: boolean;
  country_uuid?: string | null;
  province_uuid?: string | null;
  area_uuid?: string | null;
  warehouse_uuid?: string | null;
  country?: SelectOption | null;
  province?: SelectOption | null;
  area?: SelectOption | null;
  warehouse?: SelectOption | null;
  signature?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiListResponse<T> {
  status?: string;
  message?: string;
  data?: T[];
  pagination?: Record<string, unknown>;
}

interface SelectOption {
  uuid: string;
  name: string;
  country_uuid?: string;
  province_uuid?: string;
  area_uuid?: string;
}

interface PermissionOption {
  code: string;
  label: string;
}

const users = ref<UserRecord[]>([]);
const loading = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const dialog = ref(false);
const editingUser = ref<UserRecord | null>(null);
const form = ref({
  fullname: '',
  email: '',
  phone: '',
  title: '',
  role: '',
  permission: 'ALL',
  password: '',
  confirm_password: '',
  status: true,
  country_uuid: '',
  province_uuid: '',
  area_uuid: '',
  warehouse_uuid: '',
  signature: ''
});
const countries = ref<SelectOption[]>([]);
const provinces = ref<SelectOption[]>([]);
const areas = ref<SelectOption[]>([]);
const warehouses = ref<SelectOption[]>([]);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const deleteDialog = ref(false);
const itemToDelete = ref<UserRecord | null>(null);
const permissionOptions: PermissionOption[] = [
  { code: 'ALL', label: 'View Add Edit Delete' },
  { code: 'VED', label: 'View Edit Delete' },
  { code: 'VE', label: 'View Edit' },
  { code: 'VA', label: 'View Add' },
  { code: 'V', label: 'View' }
];

const apiBaseUrl = `${import.meta.env.VITE_API_URL}/users`;
const headers = [
  { title: 'Full Name', key: 'fullname' },
  { title: 'Email', key: 'email' },
  { title: 'Phone', key: 'phone' },
  { title: 'Role', key: 'role' },
  { title: 'Country', key: 'country_name' },
  { title: 'Province', key: 'province_name' },
  { title: 'Delta / Area', key: 'area_name' },
  { title: 'Warehouse', key: 'warehouse_name' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', align: 'end' as const, sortable: false }
];

const statusLabel = (value: boolean) => (value ? 'Active' : 'Inactive');
const currentUserName = computed(() => authStore.user?.fullname || '');
const filteredProvinces = computed(() => provinces.value.filter((item) => !form.value.country_uuid || item.country_uuid === form.value.country_uuid));
const filteredAreas = computed(() => areas.value.filter((item) => !form.value.province_uuid || item.province_uuid === form.value.province_uuid));
const filteredWarehouses = computed(() => warehouses.value.filter((item) =>
  (!form.value.country_uuid || item.country_uuid === form.value.country_uuid)
  && (!form.value.province_uuid || item.province_uuid === form.value.province_uuid)
  && (!form.value.area_uuid || item.area_uuid === form.value.area_uuid)
));

const handleCountryChange = () => {
  form.value.province_uuid = '';
  form.value.area_uuid = '';
  form.value.warehouse_uuid = '';
};
const handleProvinceChange = () => {
  form.value.area_uuid = '';
  form.value.warehouse_uuid = '';
};
const handleAreaChange = () => {
  form.value.warehouse_uuid = '';
};

watch(
  () => form.value.title,
  (value) => {
    form.value.role = (value || '').trim();
  }
);

const syncReferenceSelections = () => {
  if (form.value.country_uuid && !countries.value.some((item) => item.uuid === form.value.country_uuid)) {
    form.value.country_uuid = '';
  }

  if (form.value.province_uuid && !provinces.value.some((item) => item.uuid === form.value.province_uuid)) {
    form.value.province_uuid = '';
  }

  if (form.value.area_uuid && !areas.value.some((item) => item.uuid === form.value.area_uuid)) {
    form.value.area_uuid = '';
  }

  if (form.value.warehouse_uuid && !warehouses.value.some((item) => item.uuid === form.value.warehouse_uuid)) {
    form.value.warehouse_uuid = '';
  }
};

watch([countries, provinces, areas, warehouses], syncReferenceSelections, { deep: true });

const resetForm = () => {
  form.value = {
    fullname: '',
    email: '',
    phone: '',
    title: '',
    role: '',
    permission: 'ALL',
    password: '',
    confirm_password: '',
    status: true,
    country_uuid: '',
    province_uuid: '',
    area_uuid: '',
    warehouse_uuid: '',
    signature: ''
  };
};

const openCreateDialog = () => {
  editingUser.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (user: UserRecord) => {
  editingUser.value = user;
  form.value = {
    fullname: user.fullname || '',
    email: user.email || '',
    phone: user.phone || '',
    title: user.title || '',
    role: user.role || '',
    permission: user.permission || 'ALL',
    password: '',
    confirm_password: '',
    status: user.status ?? true,
    country_uuid: user.country_uuid || '',
    province_uuid: user.province_uuid || '',
    area_uuid: user.area_uuid || '',
    warehouse_uuid: user.warehouse_uuid || '',
    signature: user.signature || ''
  };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingUser.value = null;
  showPassword.value = false;
  showConfirmPassword.value = false;
};

const openDeleteDialog = (user: UserRecord) => {
  itemToDelete.value = user;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  itemToDelete.value = null;
};

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

const loadUsers = async () => {
  loading.value = true;
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/all`)) as ApiListResponse<UserRecord>;
    users.value = response.data || [];
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    loading.value = false;
  }
};

const loadReferenceData = async () => {
  try {
    const [countriesResponse, provincesResponse, areasResponse, warehousesResponse] = await Promise.all([
      fetchWrapper.get(`${import.meta.env.VITE_API_URL}/countries/all`) as Promise<ApiListResponse<SelectOption>>,
      fetchWrapper.get(`${import.meta.env.VITE_API_URL}/provinces/all`) as Promise<ApiListResponse<SelectOption>>,
      fetchWrapper.get(`${import.meta.env.VITE_API_URL}/areas/all`) as Promise<ApiListResponse<SelectOption>>,
      fetchWrapper.get(`${import.meta.env.VITE_API_URL}/warehouses/all`) as Promise<ApiListResponse<SelectOption>>
    ]);

    countries.value = (countriesResponse.data || []).filter((item) => item?.uuid).map((item) => ({ uuid: item.uuid, name: item.name || 'Unnamed' }));
    provinces.value = (provincesResponse.data || []).filter((item) => item?.uuid);
    areas.value = (areasResponse.data || []).filter((item) => item?.uuid);
    warehouses.value = (warehousesResponse.data || []).filter((item) => item?.uuid);
    syncReferenceSelections();
  } catch (error) {
    notify(error as string, 'error');
  }
};

const submitUser = async () => {
  if (!form.value.fullname.trim()) {
    notify('Full name is required', 'error');
    return;
  }

  if (!form.value.email.trim()) {
    notify('Email is required', 'error');
    return;
  }

  if (!editingUser.value && !form.value.password.trim()) {
    notify('Password is required for creating a user', 'error');
    return;
  }

  if (form.value.password && form.value.password !== form.value.confirm_password) {
    notify('Passwords do not match', 'error');
    return;
  }

  submitting.value = true;

  try {
    const payload = {
      fullname: form.value.fullname.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim(),
      title: form.value.title.trim(),
      role: form.value.title.trim(),
      permission: form.value.permission || 'ALL',
      password: form.value.password,
      confirm_password: form.value.confirm_password,
      status: form.value.status,
      country_uuid: form.value.country_uuid || null,
      province_uuid: form.value.province_uuid || null,
      area_uuid: form.value.area_uuid || null,
      warehouse_uuid: form.value.warehouse_uuid || null,
      signature: currentUserName.value || form.value.signature || form.value.fullname.trim()
    };

    if (editingUser.value) {
      await fetchWrapper.put(`${apiBaseUrl}/update/${editingUser.value.uuid}`, payload);
      notify('User updated successfully', 'success');
    } else {
      await fetchWrapper.post(`${apiBaseUrl}/create`, payload);
      notify('User created successfully', 'success');
    }

    closeDialog();
    await loadUsers();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    submitting.value = false;
  }
};

const deleteUser = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;

  try {
    await fetchWrapper.delete(`${apiBaseUrl}/delete/${itemToDelete.value.uuid}`);
    notify('User deleted successfully', 'success');
    closeDeleteDialog();
    await loadUsers();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  loadUsers();
  loadReferenceData();
});

const pageTitle = computed<string>(() => String(route.meta?.title || page.value.title));
</script>

<template>
  <BaseBreadcrumb :title="pageTitle" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard :title="pageTitle">
        <div class="d-flex justify-end mb-4 ga-2">
          <v-btn color="primary" @click="openCreateDialog">Add User</v-btn>
        </div>

        <v-alert v-if="alertMessage" class="mb-4" :type="alertType" variant="tonal" closable @click:close="alertMessage = ''">
          {{ alertMessage }}
        </v-alert>

        <v-data-table :headers="headers" :items="users" :loading="loading" class="elevation-0" density="comfortable">
          <template #item.status="{ item }">
            <v-chip :color="item.status ? 'success' : 'error'" size="small" variant="tonal">
              {{ statusLabel(item.status) }}
            </v-chip>
          </template>

          <template #item.country_name="{ item }">{{ item.country?.name || '—' }}</template>
          <template #item.province_name="{ item }">{{ item.province?.name || '—' }}</template>
          <template #item.area_name="{ item }">{{ item.area?.name || '—' }}</template>
          <template #item.warehouse_name="{ item }">{{ item.warehouse?.name || '—' }}</template>

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
        <v-btn color="error" :loading="deleting" @click="deleteUser">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" max-width="700">
    <v-card>
      <v-card-title class="px-6 pt-6">
        {{ editingUser ? 'Edit User' : 'Create User' }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.fullname" label="Full Name" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.email" label="Email" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.phone" label="Phone" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.title" label="Title" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.permission" :items="permissionOptions" item-title="label" item-value="code" label="Permission" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.password" label="Password" :type="showPassword ? 'text' : 'password'">
              <template #append-inner>
                <v-btn icon variant="text" size="small" @click="showPassword = !showPassword">
                  <v-icon>{{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.confirm_password" label="Confirm Password" :type="showConfirmPassword ? 'text' : 'password'">
              <template #append-inner>
                <v-btn icon variant="text" size="small" @click="showConfirmPassword = !showConfirmPassword">
                  <v-icon>{{ showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.country_uuid" :items="countries" item-title="name" item-value="uuid" label="Country" clearable @update:model-value="handleCountryChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.province_uuid" :items="filteredProvinces" item-title="name" item-value="uuid" label="Province" clearable :disabled="!form.country_uuid" @update:model-value="handleProvinceChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.area_uuid" :items="filteredAreas" item-title="name" item-value="uuid" label="Delta / Area" clearable :disabled="!form.province_uuid" @update:model-value="handleAreaChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.warehouse_uuid" :items="filteredWarehouses" item-title="name" item-value="uuid" label="Warehouse" clearable :disabled="!form.area_uuid" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.signature" label="Signature" :hint="`Auto-filled as ${currentUserName || 'the current user'}`" persistent-hint readonly />
          </v-col>
          <v-col cols="12">
            <v-switch v-model="form.status" label="Active" color="primary" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" @click="submitUser">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
