<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useAuthStore } from '@/stores/auth';
import { PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { useNotification } from '@/composables/useNotification';

const route = useRoute();
const authStore = useAuthStore();
const page = ref({ title: 'Entries' });
const breadcrumbs = ref([
  { title: 'Register', disabled: false, href: '#' },
  { title: 'Entries', disabled: true, href: '#' }
]);

interface EntryRecord {
  uuid: string;
  clients?: string;
  client?: string;
  bl?: string;
  nature_marchandise?: string;
  no_chassis?: string;
  marque?: string;
  navire?: string;
  nombre?: string;
  poids?: string;
  brand_model?: string;
  vehicle_plate?: string;
  vin?: string;
  color?: string;
  driver_name?: string;
  vehicle_type?: string;
  entry_time?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  container_uuid?: string | null;
  country_uuid?: string | null;
  province_uuid?: string | null;
  warehouse_uuid?: string | null;
  user_uuid?: string | null;
  signature?: string;
  container_number?: string;
  container_type?: string;
  container?: { number?: string; type?: string; numero?: string };
  containers?: Array<{ number?: string; type?: string; numero?: string }>;
  number?: string;
  type?: string;
  numero?: string;
}

interface ContainerRecord {
  uuid: string;
  number?: string;
  type?: string;
  entry_uuid?: string | null;
  user_uuid?: string | null;
  country_uuid?: string | null;
  province_uuid?: string | null;
}

interface ApiListResponse<T> {
  status?: string;
  message?: string;
  data?: T[];
  pagination?: Record<string, unknown>;
}

interface ExitRecord {
  uuid: string;
  container_uuid?: string | null;
  entry_uuid?: string | null;
}

interface VehicleEntryRecord extends EntryRecord {}

type ActiveTab = 'conteneurs' | 'voitures';

const entries = ref<EntryRecord[]>([]);
const containers = ref<ContainerRecord[]>([]);
const exits = ref<ExitRecord[]>([]);
const vehicleEntries = ref<VehicleEntryRecord[]>([]);
const activeTab = ref<ActiveTab>('conteneurs');
const loading = ref(false);
const submitting = ref(false);
const dialog = ref(false);
const editingEntry = ref<EntryRecord | null>(null);
const editingVehicle = ref<VehicleEntryRecord | null>(null);
const toLocalDateTimeValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};
const containerForm = ref({
  clients: '',
  bl: '',
  nature_marchandise: '',
  container_number: '',
  container_type: '',
  entry_date: toLocalDateTimeValue()
});
const vehicleForm = ref({
  no_chassis: '',
  marque: '',
  bl: '',
  navire: '',
  nombre: '',
  poids: '',
  client: '',
  brand_model: '',
  vehicle_plate: '',
  vin: '',
  color: '',
  driver_name: '',
  vehicle_type: '',
  entry_time: toLocalDateTimeValue()
});
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const deleteDialog = ref(false);
const itemToDelete = ref<EntryRecord | null>(null);

const apiBaseUrl = `${import.meta.env.VITE_API_URL}/entries`;
const vehicleApiBaseUrl = `${import.meta.env.VITE_API_URL}/v1/entryv`;
const containerApiBaseUrl = `${import.meta.env.VITE_API_URL}/containers`;

type TableHeader = {
  title: string;
  key: string;
  sortable?: boolean;
  align?: 'start' | 'end' | 'center';
  children?: Array<{ title: string; key: string; sortable?: boolean }>;
};

const containerHeaders: TableHeader[] = [
  { title: 'DATES', key: 'created_at', sortable: false },
  { title: 'CLIENTS', key: 'clients', sortable: false },
  {
    title: 'CONTENEURS',
    key: 'container_group',
    sortable: false,
    align: 'center',
    children: [
      { title: 'NUMERO', key: 'container_number', sortable: false },
      { title: 'TYPE', key: 'container_type', sortable: false }
    ]
  },
  { title: 'B/L', key: 'bl', sortable: false },
  { title: 'NATURE MARCHANDISES', key: 'nature_marchandise', sortable: false },
  { title: 'ACTIONS', key: 'actions', align: 'end', sortable: false }
];

const vehicleHeaders: TableHeader[] = [
  { title: "DATE D'ENTRÉE", key: 'entry_time', sortable: false },
  { title: 'CLIENT', key: 'client', sortable: false },
  { title: 'NO CHASSIS', key: 'no_chassis', sortable: false },
  { title: 'MARQUE', key: 'marque', sortable: false },
  { title: 'B/L', key: 'bl', sortable: false },
  { title: 'NAVIRE', key: 'navire', sortable: false },
  { title: 'NOMBRE', key: 'nombre', sortable: false },
  { title: 'POIDS', key: 'poids', sortable: false },
  { title: 'MARQUE ET MODÈLE', key: 'brand_model', sortable: false },
  { title: "PLAQUE D'IMMATRICULATION", key: 'vehicle_plate', sortable: false },
  { title: 'VIN', key: 'vin', sortable: false },
  { title: 'COULEUR', key: 'color', sortable: false },
  { title: 'NOM DU CHAUFFEUR / TRANSITAIRE', key: 'driver_name', sortable: false },
  { title: 'TYPE DE VÉHICULE', key: 'vehicle_type', sortable: false },
  { title: 'ACTIONS', key: 'actions', align: 'end', sortable: false }
];

const tableHeaders = computed(() => activeTab.value === 'conteneurs' ? containerHeaders : vehicleHeaders);
const tableItems = computed(() => activeTab.value === 'conteneurs' ? entries.value : vehicleEntries.value);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
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

const resetForm = () => {
  containerForm.value = {
    clients: '',
    bl: '',
    nature_marchandise: '',
    container_number: '',
    container_type: '',
    entry_date: toLocalDateTimeValue()
  };
  vehicleForm.value = {
    no_chassis: '',
    marque: '',
    bl: '',
    navire: '',
    nombre: '',
    poids: '',
    client: '',
    brand_model: '',
    vehicle_plate: '',
    vin: '',
    color: '',
    driver_name: '',
    vehicle_type: '',
    entry_time: toLocalDateTimeValue()
  };
};

const openCreateDialog = () => {
  editingEntry.value = null;
  editingVehicle.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (record: EntryRecord | VehicleEntryRecord) => {
  resetForm();
  if (activeTab.value === 'voitures') {
    const vehicle = record as VehicleEntryRecord;
    editingVehicle.value = vehicle;
    editingEntry.value = null;
    vehicleForm.value = {
      no_chassis: vehicle.no_chassis || '',
      marque: vehicle.marque || '',
      bl: vehicle.bl || '',
      navire: vehicle.navire || '',
      nombre: vehicle.nombre || '',
      poids: vehicle.poids || '',
      client: vehicle.client || '',
      brand_model: vehicle.brand_model || '',
      vehicle_plate: vehicle.vehicle_plate || '',
      vin: vehicle.vin || '',
      color: vehicle.color || '',
      driver_name: vehicle.driver_name || '',
      vehicle_type: vehicle.vehicle_type || '',
      entry_time: vehicle.entry_time ? toLocalDateTimeValue(new Date(vehicle.entry_time)) : toLocalDateTimeValue()
    };
  } else {
    const entry = record as EntryRecord;
    editingEntry.value = entry;
    editingVehicle.value = null;
    containerForm.value = {
      clients: entry.clients || '',
      bl: entry.bl || '',
      nature_marchandise: entry.nature_marchandise || '',
      container_number: entry.container_number || '',
      container_type: entry.container_type || '',
      entry_date: entry.created_at ? toLocalDateTimeValue(new Date(entry.created_at)) : toLocalDateTimeValue()
    };
  }
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingEntry.value = null;
  editingVehicle.value = null;
};

const openDeleteDialog = (entry: EntryRecord) => {
  itemToDelete.value = entry;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  itemToDelete.value = null;
};

const loadEntries = async () => {
  loading.value = true;
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/all`)) as ApiListResponse<EntryRecord>;
    const rows = (response.data || []).map((item) => ({
      ...item,
      client_name: item.clients || '—',
      bl_number: item.bl || '—',
      container_number: item.containers && item.containers.length > 0 ? item.containers[0].number || '—' : item.container?.number || '—',
      container_type: item.containers && item.containers.length > 0 ? item.containers[0].type || '—' : item.container?.type || '—',
      nature_marchandises: item.nature_marchandise || '—'
    }));

    entries.value = rows;
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    loading.value = false;
  }
};

const loadVehicleEntries = async () => {
  try {
    const response = (await fetchWrapper.get(`${vehicleApiBaseUrl}/?limit=1000`)) as ApiListResponse<VehicleEntryRecord>;
    vehicleEntries.value = response.data || [];
  } catch (error) {
    notify(error as string, 'error');
  }
};

const loadContainers = async () => {
  try {
    const response = (await fetchWrapper.get(`${containerApiBaseUrl}/all`)) as ApiListResponse<ContainerRecord>;
    containers.value = response.data || [];
  } catch (error) {
    notify(error as string, 'error');
  }
};

const loadExits = async () => {
  try {
    const response = (await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/exists/all`)) as ApiListResponse<ExitRecord>;
    exits.value = response.data || [];
  } catch (error) {
    notify(error as string, 'error');
  }
};

const submitEntry = async () => {
  if (activeTab.value === 'voitures') {
    await submitVehicleEntry();
    return;
  }

  if (!containerForm.value.clients.trim()) {
    notify('Client is required', 'error');
    return;
  }

  if (!containerForm.value.bl.trim()) {
    notify('B/L is required', 'error');
    return;
  }

  if (!containerForm.value.nature_marchandise.trim()) {
    notify('Nature Marchandise is required', 'error');
    return;
  }

  const trimmedContainerNumber = containerForm.value.container_number.trim();
  if (trimmedContainerNumber) {
    const duplicateExists = containers.value.some((container) =>
      container.number?.trim().toLowerCase() === trimmedContainerNumber.toLowerCase()
      && container.entry_uuid !== editingEntry.value?.uuid
    );
    if (duplicateExists) {
      notify('Ce numéro de conteneur existe déjà dans le système.', 'error');
      return;
    }
  }

  submitting.value = true;

  try {
    const payload: Record<string, unknown> = {
      uuid: editingEntry.value?.uuid,
      clients: containerForm.value.clients.trim(),
      bl: containerForm.value.bl.trim(),
      nature_marchandise: containerForm.value.nature_marchandise.trim(),
      created_at: new Date(containerForm.value.entry_date || Date.now()).toISOString(),
      container_number: trimmedContainerNumber,
      container_type: containerForm.value.container_type.trim(),
      signature: authStore.user?.fullname || authStore.user?.email || ''
    };

    const userCountryUuid = authStore.user?.country_uuid || authStore.user?.country?.uuid || '';
    const userProvinceUuid = authStore.user?.province_uuid || authStore.user?.province?.uuid || '';

    if (authStore.user?.uuid) payload.user_uuid = authStore.user.uuid;
    if (userCountryUuid) payload.country_uuid = userCountryUuid;
    if (userProvinceUuid) payload.province_uuid = userProvinceUuid;

    if (trimmedContainerNumber || containerForm.value.container_type.trim()) {
      payload.containers = [{
        number: trimmedContainerNumber,
        type: containerForm.value.container_type.trim()
      }];
    }

    if (editingEntry.value?.uuid) {
      await fetchWrapper.put(`${apiBaseUrl}/update/${editingEntry.value.uuid}`, payload);
      notify('Entrée conteneur mise à jour avec succès', 'success');
    } else {
      await fetchWrapper.post(`${apiBaseUrl}/create`, payload);
      notify('Entrée conteneur enregistrée avec succès', 'success');
    }
    closeDialog();
    await Promise.all([loadEntries(), loadContainers(), loadExits()]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create entry';
    notify(message, 'error');
  } finally {
    submitting.value = false;
  }
};

const submitVehicleEntry = async () => {
  submitting.value = true;
  try {
    const payload = {
      uuid: editingVehicle.value?.uuid,
      no_chassis: vehicleForm.value.no_chassis.trim(),
      marque: vehicleForm.value.marque.trim(),
      bl: vehicleForm.value.bl.trim(),
      navire: vehicleForm.value.navire.trim(),
      nombre: vehicleForm.value.nombre.trim(),
      poids: vehicleForm.value.poids.trim(),
      client: vehicleForm.value.client.trim(),
      brand_model: vehicleForm.value.brand_model.trim(),
      vehicle_plate: vehicleForm.value.vehicle_plate.trim(),
      vin: vehicleForm.value.vin.trim(),
      color: vehicleForm.value.color.trim(),
      driver_name: vehicleForm.value.driver_name.trim(),
      vehicle_type: vehicleForm.value.vehicle_type.trim(),
      entry_time: new Date(vehicleForm.value.entry_time || Date.now()).toISOString(),
      signature: authStore.user?.fullname || authStore.user?.email || ''
    };

    if (editingVehicle.value?.uuid) {
      await fetchWrapper.put(`${vehicleApiBaseUrl}/${editingVehicle.value.uuid}`, payload);
      notify('Entrée véhicule mise à jour avec succès', 'success');
    } else {
      await fetchWrapper.post(`${vehicleApiBaseUrl}/`, payload);
      notify('Entrée véhicule enregistrée avec succès', 'success');
    }
    closeDialog();
    await loadVehicleEntries();
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Unable to save vehicle entry', 'error');
  } finally {
    submitting.value = false;
  }
};

const deleteEntry = async () => {
  if (!itemToDelete.value) return;

  try {
    if (activeTab.value === 'voitures') {
      await fetchWrapper.delete(`${vehicleApiBaseUrl}/${itemToDelete.value.uuid}`);
      notify('Entrée véhicule supprimée avec succès', 'success');
      await loadVehicleEntries();
    } else {
      await fetchWrapper.delete(`${apiBaseUrl}/delete/${itemToDelete.value.uuid}`);
      notify('Entrée conteneur supprimée avec succès', 'success');
      await loadEntries();
    }
    closeDeleteDialog();
  } catch (error) {
    notify(error as string, 'error');
  }
};

onMounted(() => {
  loadEntries();
  loadContainers();
  loadExits();
  loadVehicleEntries();
});

watch(activeTab, () => {
  closeDialog();
  resetForm();
});

const pageTitle = computed<string>(() => String(route.meta?.title || page.value.title));
</script>

<template>
  <BaseBreadcrumb :title="pageTitle" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard :title="pageTitle">
        <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-4">
          <v-tabs v-model="activeTab" color="primary">
            <v-tab value="conteneurs">Conteneurs</v-tab>
            <v-tab value="voitures">Voitures</v-tab>
          </v-tabs>
          <v-btn color="primary" @click="openCreateDialog">Create Entry</v-btn>
        </div>

        <v-alert v-if="alertMessage" class="mb-4" :type="alertType" variant="tonal" closable @click:close="alertMessage = ''">
          {{ alertMessage }}
        </v-alert>

        <v-data-table :headers="tableHeaders" :items="tableItems" :loading="loading" class="elevation-0" density="comfortable">
          <template #item.created_at="{ item }">
            <span>{{ item.created_at ? new Date(item.created_at).toLocaleString() : '—' }}</span>
          </template>

          <template #item.clients="{ item }">
            <span>{{ item.clients || '—' }}</span>
          </template>

          <template #item.bl="{ item }">
            <span>{{ item.bl || '—' }}</span>
          </template>

          <template #item.nature_marchandise="{ item }">
            <span>{{ item.nature_marchandise || '—' }}</span>
          </template>

          <template #item.container_number="{ item }">
            <span>
              {{ item.containers && item.containers.length > 0 ? item.containers[0].number : (item.container?.number || '—') }}
            </span>
          </template>

          <template #item.container_type="{ item }">
            <span>
              {{ item.containers && item.containers.length > 0 ? item.containers[0].type : (item.container?.type || '—') }}
            </span>
          </template>

          <template #item.entry_time="{ item }">
            <span>{{ formatDate(item.entry_time) }}</span>
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
        <v-btn color="error" @click="deleteEntry">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" max-width="680">
    <v-card>
      <v-card-title class="px-6 pt-6">
        {{ editingEntry || editingVehicle ? 'Modifier' : 'Créer' }} une entrée {{ activeTab === 'conteneurs' ? 'conteneur' : 'véhicule' }}
      </v-card-title>
      <v-card-text>
        <v-row v-if="activeTab === 'conteneurs'">
          <v-col cols="12">
            <v-text-field v-model="containerForm.clients" label="Client / Consignataire" required />
          </v-col>

          <v-col cols="12">
            <div class="text-subtitle-1 font-weight-medium mb-3 text-center">CONTENEURS</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="containerForm.container_number" label="Numéro Conteneur" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="containerForm.container_type" label="Type / Taille (20', 40', HC...)" />
              </v-col>
            </v-row>
            <v-divider class="mt-2" />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="containerForm.bl" label="Numéro B/L" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="containerForm.nature_marchandise" label="Nature des Marchandises" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="containerForm.entry_date" label="Date d'Entrée" type="datetime-local" />
          </v-col>
        </v-row>

        <v-row v-else>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.no_chassis" label="NO CHASSIS" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.marque" label="MARQUE" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.bl" label="B/L" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.navire" label="NAVIRE" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.nombre" label="NOMBRE" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.poids" label="POIDS" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.client" label="CLIENT" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.brand_model" label="MARQUE ET MODÈLE" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.vehicle_plate" label="PLAQUE D'IMMATRICULATION" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.vin" label="VIN" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.color" label="COULEUR" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.driver_name" label="NOM DU CHAUFFEUR / TRANSITAIRE" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.vehicle_type" label="TYPE DE VÉHICULE" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="vehicleForm.entry_time" label="DATE D'ENTRÉE" type="datetime-local" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" @click="submitEntry">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
