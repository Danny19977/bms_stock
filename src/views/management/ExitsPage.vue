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
const page = ref({ title: 'Exits' });
const breadcrumbs = ref([
  { title: 'Register', disabled: false, href: '#' },
  { title: 'Exits', disabled: true, href: '#' }
]);

interface ExitRecord {
  uuid: string;
  no_chassis?: string;
  marque?: string;
  navire?: string;
  nombre?: string;
  poids?: string;
  client?: string;
  brand_model?: string;
  vehicle_plate?: string;
  vin?: string;
  color?: string;
  driver_name?: string;
  vehicle_type?: string;
  exit_time?: string | null;
  entryv_uuid?: string | null;
  bl?: string;
  nature_marchandise?: string;
  declaration?: string;
  liquidation?: string;
  quitance?: string;
  created_at?: string | null;
  updated_at?: string | null;
  container_uuid?: string | null;
  entry_uuid?: string | null;
  container?: { uuid?: string; number?: string; type?: string };
  entry?: { uuid?: string; clients?: string; bl?: string; nature_marchandise?: string };
  container_number?: string;
  container_type?: string;
}

interface VehicleEntryRecord {
  uuid: string;
  no_chassis?: string;
  marque?: string;
  bl?: string;
  navire?: string;
  nombre?: string;
  poids?: string;
  client?: string;
  brand_model?: string;
  vehicle_plate?: string;
  vin?: string;
  color?: string;
  driver_name?: string;
  vehicle_type?: string;
  entry_time?: string | null;
}

interface VehicleExitRecord extends ExitRecord {}
type ActiveTab = 'conteneurs' | 'voitures';

interface ContainerRecord {
  uuid: string;
  number?: string;
  type?: string;
  entry_uuid?: string | null;
}

interface EntryRecord {
  uuid: string;
  clients?: string;
  bl?: string;
  nature_marchandise?: string;
}

interface ApiListResponse<T> {
  status?: string;
  message?: string;
  data?: T[];
  pagination?: Record<string, unknown>;
}

const exits = ref<ExitRecord[]>([]);
const vehicleExits = ref<VehicleExitRecord[]>([]);
const vehicleEntries = ref<VehicleEntryRecord[]>([]);
const activeTab = ref<ActiveTab>('conteneurs');
const containers = ref<ContainerRecord[]>([]);
const entries = ref<EntryRecord[]>([]);
const loading = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const dialog = ref(false);
const editingExit = ref<ExitRecord | null>(null);
const editingVehicleExit = ref<VehicleExitRecord | null>(null);
const toLocalDateTimeValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};
const containerForm = ref({
  client: '',
  bl_number: '',
  nature_marchandises: '',
  declaration: '',
  liquidation: '',
  quittance: '',
  container_uuid: '',
  entry_uuid: '',
  container_number: '',
  container_type: '',
  exit_date: toLocalDateTimeValue()
});
const vehicleForm = ref({
  entryv_uuid: '',
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
  exit_time: toLocalDateTimeValue()
});
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const deleteDialog = ref(false);
const itemToDelete = ref<ExitRecord | null>(null);

const apiBaseUrl = `${import.meta.env.VITE_API_URL}/exists`;
const vehicleApiBaseUrl = `${import.meta.env.VITE_API_URL}/v1/existv`;
const vehicleEntryApiBaseUrl = `${import.meta.env.VITE_API_URL}/v1/entryv`;
const containerApiBaseUrl = `${import.meta.env.VITE_API_URL}/containers`;
const entryApiBaseUrl = `${import.meta.env.VITE_API_URL}/entries`;

type TableHeader = {
  title: string;
  key: string;
  sortable?: boolean;
  align?: 'start' | 'end' | 'center';
  children?: Array<{ title: string; key: string; sortable?: boolean }>;
};

const containerHeaders: TableHeader[] = [
  { title: 'DATES', key: 'created_at', sortable: false, align: 'start' },
  { title: 'CLIENTS', key: 'client', sortable: false },
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
  { title: 'E: Déclaration', key: 'declaration', sortable: false },
  { title: 'L: Liquidation', key: 'liquidation', sortable: false },
  { title: 'Q: Quittance', key: 'quitance', sortable: false },
  { title: 'ACTIONS', key: 'actions', align: 'end', sortable: false }
];

const vehicleHeaders: TableHeader[] = [
  { title: 'DATE DE SORTIE', key: 'exit_time', sortable: false },
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
const tableItems = computed(() => activeTab.value === 'conteneurs' ? exits.value : vehicleExits.value);

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
    client: '',
    bl_number: '',
    nature_marchandises: '',
    declaration: '',
    liquidation: '',
    quittance: '',
    container_uuid: '',
    entry_uuid: '',
    container_number: '',
    container_type: '',
    exit_date: toLocalDateTimeValue()
  };
  vehicleForm.value = {
    entryv_uuid: '',
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
    exit_time: toLocalDateTimeValue()
  };
};

const openCreateDialog = () => {
  editingExit.value = null;
  editingVehicleExit.value = null;
  resetForm();
  dialog.value = true;
};

const openEditDialog = (exit: ExitRecord) => {
  resetForm();
  if (activeTab.value === 'voitures') {
    editingVehicleExit.value = exit;
    editingExit.value = null;
    vehicleForm.value = {
      entryv_uuid: exit.entryv_uuid || '',
      no_chassis: exit.no_chassis || '',
      marque: exit.marque || '',
      bl: exit.bl || '',
      navire: exit.navire || '',
      nombre: exit.nombre || '',
      poids: exit.poids || '',
      client: exit.client || '',
      brand_model: exit.brand_model || '',
      vehicle_plate: exit.vehicle_plate || '',
      vin: exit.vin || '',
      color: exit.color || '',
      driver_name: exit.driver_name || '',
      vehicle_type: exit.vehicle_type || '',
      exit_time: exit.exit_time ? toLocalDateTimeValue(new Date(exit.exit_time)) : toLocalDateTimeValue()
    };
  } else {
    editingExit.value = exit;
    editingVehicleExit.value = null;
    containerForm.value = {
      client: exit.client || '',
      bl_number: exit.bl || '',
      nature_marchandises: exit.nature_marchandise || '',
      declaration: exit.declaration || '',
      liquidation: exit.liquidation || '',
      quittance: exit.quitance || '',
      container_uuid: exit.container_uuid || '',
      entry_uuid: exit.entry_uuid || '',
      container_number: exit.container?.number || '',
      container_type: exit.container?.type || exit.container_type || '',
      exit_date: exit.created_at ? toLocalDateTimeValue(new Date(exit.created_at)) : toLocalDateTimeValue()
    };
  }
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingExit.value = null;
  editingVehicleExit.value = null;
};

const openDeleteDialog = (exit: ExitRecord) => {
  itemToDelete.value = exit;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  itemToDelete.value = null;
};

const loadEntries = async () => {
  try {
    const response = (await fetchWrapper.get(`${entryApiBaseUrl}/all`)) as ApiListResponse<EntryRecord>;
    entries.value = response.data || [];
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
  loading.value = true;
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/all`)) as ApiListResponse<ExitRecord>;
    exits.value = (response.data || []).map((item) => ({
      ...item,
      container_number: item.container?.number || '—',
      container_type: item.container?.type || '—'
    }));
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    loading.value = false;
  }
};

const loadVehicleData = async () => {
  try {
    const [entryResponse, exitResponse] = await Promise.all([
      fetchWrapper.get(`${vehicleEntryApiBaseUrl}/?limit=1000`) as Promise<ApiListResponse<VehicleEntryRecord>>,
      fetchWrapper.get(`${vehicleApiBaseUrl}/?limit=1000`) as Promise<ApiListResponse<VehicleExitRecord>>
    ]);
    vehicleEntries.value = entryResponse.data || [];
    vehicleExits.value = exitResponse.data || [];
  } catch (error) {
    notify(error as string, 'error');
  }
};

const activeContainers = computed(() => {
  return containers.value.filter((container) => {
    const hasExit = exits.value.some((exit) => exit.container_uuid === container.uuid);
    return !hasExit;
  });
});

const activeVehicleEntries = computed(() => vehicleEntries.value.filter((entry) =>
  !vehicleExits.value.some((exit) => exit.entryv_uuid === entry.uuid)
  || editingVehicleExit.value?.entryv_uuid === entry.uuid
));

const selectContainer = (containerUUID: string) => {
  const container = containers.value.find((item) => item.uuid === containerUUID);
  if (!container) return;

  const entry = entries.value.find((item) => item.uuid === container.entry_uuid);
  containerForm.value.container_uuid = container.uuid;
  containerForm.value.entry_uuid = container.entry_uuid || '';
  containerForm.value.container_number = container.number || '';
  containerForm.value.container_type = container.type || '';
  containerForm.value.client = entry?.clients || '';
  containerForm.value.bl_number = entry?.bl || '';
  containerForm.value.nature_marchandises = entry?.nature_marchandise || '';
};

const selectVehicleEntry = (entryUUID: string) => {
  const entry = vehicleEntries.value.find((item) => item.uuid === entryUUID);
  if (!entry) return;
  vehicleForm.value = {
    ...vehicleForm.value,
    entryv_uuid: entry.uuid,
    no_chassis: entry.no_chassis || '',
    marque: entry.marque || '',
    bl: entry.bl || '',
    navire: entry.navire || '',
    nombre: entry.nombre || '',
    poids: entry.poids || '',
    client: entry.client || '',
    brand_model: entry.brand_model || '',
    vehicle_plate: entry.vehicle_plate || '',
    vin: entry.vin || '',
    color: entry.color || '',
    driver_name: entry.driver_name || '',
    vehicle_type: entry.vehicle_type || ''
  };
};

const submitExit = async () => {
  if (activeTab.value === 'voitures') {
    await submitVehicleExit();
    return;
  }

  if (!containerForm.value.container_uuid) {
    notify('Please select a container', 'error');
    return;
  }

  submitting.value = true;

  try {
    const payload: Record<string, string> = {
      client: containerForm.value.client.trim(),
      bl: containerForm.value.bl_number.trim(),
      nature_marchandise: containerForm.value.nature_marchandises.trim(),
      created_at: new Date(containerForm.value.exit_date || Date.now()).toISOString(),
      declaration: containerForm.value.declaration.trim(),
      liquidation: containerForm.value.liquidation.trim(),
      quitance: containerForm.value.quittance.trim(),
      container_uuid: containerForm.value.container_uuid,
      entry_uuid: containerForm.value.entry_uuid,
      signature: authStore.user?.fullname || authStore.user?.email || ''
    };

    if (editingExit.value?.uuid) {
      await fetchWrapper.put(`${apiBaseUrl}/update/${editingExit.value.uuid}`, payload);
      notify('Exit updated successfully', 'success');
    } else {
      await fetchWrapper.post(`${apiBaseUrl}/create`, payload);
      notify('Exit created successfully', 'success');
    }

    closeDialog();
    await loadExits();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    submitting.value = false;
  }
};

const submitVehicleExit = async () => {
  submitting.value = true;
  try {
    const payload = {
      uuid: editingVehicleExit.value?.uuid,
      entryv_uuid: vehicleForm.value.entryv_uuid,
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
      exit_time: new Date(vehicleForm.value.exit_time || Date.now()).toISOString(),
      signature: authStore.user?.fullname || authStore.user?.email || ''
    };

    if (editingVehicleExit.value?.uuid) {
      await fetchWrapper.put(`${vehicleApiBaseUrl}/${editingVehicleExit.value.uuid}`, payload);
      notify('Sortie véhicule mise à jour avec succès', 'success');
    } else {
      await fetchWrapper.post(`${vehicleApiBaseUrl}/`, payload);
      notify('Sortie véhicule enregistrée avec succès', 'success');
    }
    closeDialog();
    await loadVehicleData();
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Unable to save vehicle exit', 'error');
  } finally {
    submitting.value = false;
  }
};

const deleteExit = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;

  try {
    if (activeTab.value === 'voitures') {
      await fetchWrapper.delete(`${vehicleApiBaseUrl}/${itemToDelete.value.uuid}`);
      notify('Sortie véhicule supprimée avec succès', 'success');
      await loadVehicleData();
    } else {
      await fetchWrapper.delete(`${apiBaseUrl}/delete/${itemToDelete.value.uuid}`);
      notify('Sortie conteneur supprimée avec succès', 'success');
      await loadExits();
    }
    closeDeleteDialog();
  } catch (error) {
    notify(error as string, 'error');
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  loadEntries();
  loadContainers();
  loadExits();
  loadVehicleData();
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
          <v-btn color="primary" @click="openCreateDialog">Create Exit</v-btn>
        </div>

        <v-alert v-if="alertMessage" class="mb-4" :type="alertType" variant="tonal" closable @click:close="alertMessage = ''">
          {{ alertMessage }}
        </v-alert>

        <v-data-table :headers="tableHeaders" :items="tableItems" :loading="loading" class="elevation-0" density="comfortable">
          <template #item.created_at="{ item }">
            <span>{{ item.created_at ? new Date(item.created_at).toLocaleString() : '—' }}</span>
          </template>

          <template #item.client="{ item }">
            <span>{{ item.client || '—' }}</span>
          </template>

          <template #item.bl="{ item }">
            <span>{{ item.bl || '—' }}</span>
          </template>

          <template #item.nature_marchandise="{ item }">
            <span>{{ item.nature_marchandise || '—' }}</span>
          </template>

          <template #item.declaration="{ item }">
            <span>{{ item.declaration || '—' }}</span>
          </template>

          <template #item.liquidation="{ item }">
            <span>{{ item.liquidation || '—' }}</span>
          </template>

          <template #item.quitance="{ item }">
            <span>{{ item.quitance || '—' }}</span>
          </template>

          <template #item.container_number="{ item }">
            <span>{{ item.container?.number || item.container_number || '—' }}</span>
          </template>

          <template #item.container_type="{ item }">
            <span>{{ item.container?.type || item.container_type || '—' }}</span>
          </template>

          <template #item.exit_time="{ item }">
            <span>{{ formatDate(item.exit_time) }}</span>
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
        <v-btn color="error" :loading="deleting" @click="deleteExit">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="dialog" max-width="680">
    <v-card>
      <v-card-title class="px-6 pt-6">
        {{ editingExit || editingVehicleExit ? 'Modifier' : 'Créer' }} une sortie {{ activeTab === 'conteneurs' ? 'conteneur' : 'véhicule' }}
      </v-card-title>
      <v-card-text>
        <v-row v-if="activeTab === 'conteneurs'">
          <v-col cols="12">
            <v-select
              v-model="containerForm.container_uuid"
              label="Numéro Conteneur"
              :items="activeContainers"
              item-title="number"
              item-value="uuid"
              @update:model-value="selectContainer"
            />
          </v-col>

          <v-col cols="12">
            <div class="text-subtitle-1 font-weight-medium mb-3 text-center">CONTENEURS</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="containerForm.client" label="Client / Consignataire" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="containerForm.container_number" label="Numéro Conteneur" readonly />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="containerForm.container_type" label="Type / Taille" readonly />
              </v-col>
            </v-row>
            <v-divider class="mt-2" />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field v-model="containerForm.bl_number" label="Numéro B/L" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="containerForm.nature_marchandises" label="Nature des Marchandises" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="containerForm.declaration" label="E: Déclaration" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="containerForm.liquidation" label="L: Liquidation" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="containerForm.quittance" label="Q: Quittance" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="containerForm.exit_date" label="Date de Sortie" type="datetime-local" />
          </v-col>
        </v-row>

        <v-row v-else>
          <v-col cols="12">
            <v-select
              v-model="vehicleForm.entryv_uuid"
              label="Véhicule en dépôt"
              :items="activeVehicleEntries"
              item-title="vehicle_plate"
              item-value="uuid"
              @update:model-value="selectVehicleEntry"
            />
          </v-col>
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
            <v-text-field v-model="vehicleForm.exit_time" label="DATE DE SORTIE" type="datetime-local" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" :loading="submitting" @click="submitExit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
