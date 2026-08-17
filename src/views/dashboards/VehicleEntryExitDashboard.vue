<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import DashboardColumnPicker from '@/components/shared/DashboardColumnPicker.vue';
import { exportDashboard, type ExportColumn } from '@/utils/helpers/dashboard-export';

interface VehicleMovement {
  uuid: string;
  entryv_uuid?: string | null;
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
  exit_time?: string | null;
  country_uuid?: string | null;
  province_uuid?: string | null;
  warehouse_uuid?: string | null;
}

interface ApiResponse<T> {
  data?: T[];
}

interface VehicleDashboardRow extends VehicleMovement {
  exit?: VehicleMovement;
  status: 'IN_YARD' | 'EXITED';
  dwell_time_days: number;
}

const route = useRoute();
const loading = ref(false);
const exporting = ref(false);
const entries = ref<VehicleMovement[]>([]);
const exits = ref<VehicleMovement[]>([]);
const showFilters = ref(true);
const filters = ref({
  country_uuid: '',
  province_uuid: '',
  warehouse_uuid: '',
  status: 'all',
  search: '',
  start_date: '',
  end_date: ''
});

const vehicleEntryUrl = `${import.meta.env.VITE_API_URL}/v1/entryv`;
const vehicleExitUrl = `${import.meta.env.VITE_API_URL}/v1/existv`;
const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'En Dépôt', value: 'in_yard' },
  { label: 'Sorti', value: 'exited' }
];

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('fr-FR') : '—';
const daysBetween = (start?: string | null, end?: string | null) => {
  if (!start) return 0;
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((to - from) / 86_400_000));
};

const rows = computed<VehicleDashboardRow[]>(() => entries.value.map((entry) => {
  const exit = exits.value.find((item) => item.entryv_uuid === entry.uuid);
  return {
    ...entry,
    exit,
    status: exit ? 'EXITED' : 'IN_YARD',
    dwell_time_days: daysBetween(entry.entry_time, exit?.exit_time)
  };
}));

const filteredRows = computed(() => rows.value.filter((row) => {
  const search = filters.value.search.trim().toLowerCase();
  if (filters.value.status === 'in_yard' && row.status !== 'IN_YARD') return false;
  if (filters.value.status === 'exited' && row.status !== 'EXITED') return false;
  if (filters.value.country_uuid && row.country_uuid !== filters.value.country_uuid) return false;
  if (filters.value.province_uuid && row.province_uuid !== filters.value.province_uuid) return false;
  if (filters.value.warehouse_uuid && row.warehouse_uuid !== filters.value.warehouse_uuid) return false;
  if (filters.value.start_date && (!row.entry_time || row.entry_time < filters.value.start_date)) return false;
  if (filters.value.end_date && (!row.entry_time || row.entry_time.slice(0, 10) > filters.value.end_date)) return false;
  if (!search) return true;
  return [row.no_chassis, row.marque, row.bl, row.client, row.vehicle_plate, row.vin, row.driver_name]
    .some((value) => value?.toLowerCase().includes(search));
}));

const uniqueOptions = (key: 'country_uuid' | 'province_uuid' | 'warehouse_uuid') =>
  computed(() => Array.from(new Set(rows.value.map((row) => row[key]).filter((value): value is string => Boolean(value)))).sort());
const countryOptions = uniqueOptions('country_uuid');
const provinceOptions = uniqueOptions('province_uuid');
const warehouseOptions = uniqueOptions('warehouse_uuid');

const kpis = computed(() => {
  const exited = filteredRows.value.filter((row) => row.status === 'EXITED');
  const average = filteredRows.value.length
    ? filteredRows.value.reduce((total, row) => total + row.dwell_time_days, 0) / filteredRows.value.length
    : 0;
  return [
    { title: 'Total Voitures Traitées', value: filteredRows.value.length },
    { title: 'Voitures Actuellement en Dépôt', value: filteredRows.value.length - exited.length },
    { title: 'Voitures Sorties', value: exited.length },
    { title: 'Total En Stagnation / En Dépôt', value: filteredRows.value.length - exited.length },
    { title: 'Durée Moyenne de Séjour (Jours)', value: `${average.toFixed(1)} j` }
  ];
});

const allColumns: ExportColumn<VehicleDashboardRow>[] = [
  { key: 'number', label: 'N°', section: 'entry', value: (_row, index) => index + 1 },
  { key: 'entry_time', label: 'DATE ENTRÉE', section: 'entry', value: (row) => formatDate(row.entry_time) },
  { key: 'client', label: 'CLIENT', section: 'entry', value: (row) => row.client || '—' },
  { key: 'brand_model', label: 'MARQUE / MODÈLE', section: 'entry', value: (row) => row.brand_model || row.marque || '—' },
  { key: 'no_chassis', label: 'N° CHASSIS', section: 'entry', value: (row) => row.no_chassis || row.vin || '—' },
  { key: 'bl', label: 'B/L', section: 'entry', value: (row) => row.bl || '—' },
  { key: 'entry_nature', label: 'NATURE ENTRÉE', section: 'entry', value: (row) => row.vehicle_type || '—' },
  { key: 'exit_client', label: 'CLIENT SORTIE', section: 'exit', value: (row) => row.exit?.client || '—' },
  { key: 'exit_brand_model', label: 'MARQUE / MODÈLE SORTIE', section: 'exit', value: (row) => row.exit?.brand_model || row.exit?.marque || '—' },
  { key: 'exit_no_chassis', label: 'N° CHASSIS SORTIE', section: 'exit', value: (row) => row.exit?.no_chassis || row.exit?.vin || '—' },
  { key: 'exit_bl', label: 'B/L SORTIE', section: 'exit', value: (row) => row.exit?.bl || '—' },
  { key: 'exit_nature', label: 'NATURE SORTIE', section: 'exit', value: (row) => row.exit?.vehicle_type || '—' },
  { key: 'declaration', label: 'DÉCL. (E) / LIQ. (L)', section: 'exit', value: () => '—' },
  { key: 'exit_time', label: 'DATE SORTIE', section: 'exit', value: (row) => formatDate(row.exit?.exit_time) },
  { key: 'status', label: 'STATUT', section: 'exit', value: (row) => row.status === 'IN_YARD' ? 'En Dépôt' : 'Sorti' },
  { key: 'dwell_time_days', label: 'SÉJOUR', section: 'exit', value: (row) => `${row.dwell_time_days} j` }
];
const visibleColumns = ref(allColumns.map((column) => column.key));
const selectedColumns = computed(() => allColumns.filter((column) => visibleColumns.value.includes(column.key)));
const entryVisibleCount = computed(() => selectedColumns.value.filter((column) => column.section === 'entry').length);
const exitVisibleCount = computed(() => selectedColumns.value.filter((column) => column.section === 'exit').length);
const isVisible = (key: string) => visibleColumns.value.includes(key);
const toggleColumn = (key: string) => {
  if (visibleColumns.value.includes(key)) {
    if (visibleColumns.value.length > 1) visibleColumns.value = visibleColumns.value.filter((column) => column !== key);
  } else {
    visibleColumns.value = [...visibleColumns.value, key];
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [entryResponse, exitResponse] = await Promise.all([
      fetchWrapper.get(`${vehicleEntryUrl}/?limit=10000`) as Promise<ApiResponse<VehicleMovement>>,
      fetchWrapper.get(`${vehicleExitUrl}/?limit=10000`) as Promise<ApiResponse<VehicleMovement>>
    ]);
    entries.value = entryResponse.data || [];
    exits.value = exitResponse.data || [];
  } finally {
    loading.value = false;
  }
};

const exportFile = (type: 'excel' | 'pdf') => {
  exporting.value = true;
  try {
    exportDashboard(type, 'voitures-entry-exit', filteredRows.value, selectedColumns.value);
  } finally {
    exporting.value = false;
  }
};

onMounted(loadData);
const pageTitle = computed(() => String(route.meta?.title || 'Voiture Entry / Exit'));
</script>

<template>
  <v-container fluid class="pa-0">
    <v-card elevation="1" class="rounded-lg overflow-hidden">
      <v-card-title class="pa-4 border-b">
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-2">
          <div>
            <div class="text-h6 font-weight-bold">{{ pageTitle }}</div>
            <div class="text-body-2 text-medium-emphasis">Suivi des entrées, sorties et séjours des voitures</div>
          </div>
          <div class="d-flex flex-wrap ga-3">
            <v-btn size="small" variant="outlined" @click="showFilters = !showFilters">
              {{ showFilters ? 'Masquer filtres' : 'Afficher filtres' }}
            </v-btn>
            <v-btn size="small" color="primary" :loading="exporting" @click="exportFile('excel')">Exporter Excel</v-btn>
            <v-btn size="small" color="error" :loading="exporting" @click="exportFile('pdf')">Exporter PDF</v-btn>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row class="mb-4">
          <v-col v-for="kpi in kpis" :key="kpi.title" cols="12" sm="6" md="4" lg="auto" class="flex-grow-1">
            <v-card elevation="1" class="pa-4 rounded-lg bg-surface">
              <div class="text-caption text-medium-emphasis mb-1">{{ kpi.title }}</div>
              <div class="text-h5 font-weight-bold text-high-emphasis">{{ kpi.value }}</div>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="outlined" class="mb-4 rounded-lg">
          <v-card-text>
            <div class="text-subtitle-2 font-weight-medium mb-3">Filtres</div>
            <v-row v-if="showFilters" dense>
              <v-col cols="12" sm="6" md="3"><v-select v-model="filters.country_uuid" label="Pays" :items="countryOptions" clearable /></v-col>
              <v-col cols="12" sm="6" md="3"><v-select v-model="filters.province_uuid" label="Province" :items="provinceOptions" clearable /></v-col>
              <v-col cols="12" sm="6" md="3"><v-select v-model="filters.warehouse_uuid" label="Dépôt" :items="warehouseOptions" clearable /></v-col>
              <v-col cols="12" sm="6" md="3"><v-select v-model="filters.status" label="Statut" :items="statusOptions" item-title="label" item-value="value" /></v-col>
              <v-col cols="12" sm="6" md="4"><v-text-field v-model="filters.search" label="Recherche" placeholder="Client / Châssis / Plaque" clearable /></v-col>
              <v-col cols="12" sm="6" md="4"><v-text-field v-model="filters.start_date" label="Entrée de" type="date" /></v-col>
              <v-col cols="12" sm="6" md="4"><v-text-field v-model="filters.end_date" label="Entrée à" type="date" /></v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <div class="d-flex justify-end mb-3">
          <DashboardColumnPicker :columns="allColumns" :visible-columns="visibleColumns" @toggle="toggleColumn" />
        </div>

        <div class="table-container shadow-sm rounded-lg border overflow-hidden">
          <div style="overflow-x: auto; width: 100%;">
            <table class="excel-dashboard-table">
              <thead>
                <tr>
                  <th v-if="entryVisibleCount" :colspan="entryVisibleCount" class="header-entree text-center font-weight-bold">ENTRÉE</th>
                  <th v-if="exitVisibleCount" :colspan="exitVisibleCount" class="header-sortie text-center font-weight-bold">SORTIE</th>
                </tr>
                <tr class="header-sub">
                  <th v-if="isVisible('number')">N°</th>
                  <th v-if="isVisible('entry_time')">DATE ENTRÉE</th>
                  <th v-if="isVisible('client')">CLIENT</th>
                  <th v-if="isVisible('brand_model')">MARQUE / MODÈLE</th>
                  <th v-if="isVisible('no_chassis')">N° CHASSIS</th>
                  <th v-if="isVisible('bl')">B/L</th>
                  <th v-if="isVisible('entry_nature')" class="border-section-end">NATURE ENTRÉE</th>
                  <th v-if="isVisible('exit_client')">CLIENT SORTIE</th>
                  <th v-if="isVisible('exit_brand_model')">MARQUE / MODÈLE SORTIE</th>
                  <th v-if="isVisible('exit_no_chassis')">N° CHASSIS SORTIE</th>
                  <th v-if="isVisible('exit_bl')">B/L SORTIE</th>
                  <th v-if="isVisible('exit_nature')">NATURE SORTIE</th>
                  <th v-if="isVisible('declaration')">DÉCL. (E) / LIQ. (L)</th>
                  <th v-if="isVisible('exit_time')">DATE SORTIE</th>
                  <th v-if="isVisible('status')">STATUT</th>
                  <th v-if="isVisible('dwell_time_days')">SÉJOUR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in filteredRows" :key="row.uuid" class="table-row">
                  <td v-if="isVisible('number')" class="text-center">{{ index + 1 }}</td>
                  <td v-if="isVisible('entry_time')">{{ formatDate(row.entry_time) }}</td>
                  <td v-if="isVisible('client')" class="font-weight-medium">{{ row.client || '—' }}</td>
                  <td v-if="isVisible('brand_model')" class="font-weight-bold text-primary">{{ row.brand_model || row.marque || '—' }}</td>
                  <td v-if="isVisible('no_chassis')" class="text-center">{{ row.no_chassis || row.vin || '—' }}</td>
                  <td v-if="isVisible('bl')">{{ row.bl || '—' }}</td>
                  <td v-if="isVisible('entry_nature')" class="border-section-end">{{ row.vehicle_type || '—' }}</td>
                  <td v-if="isVisible('exit_client')" class="font-weight-medium">{{ row.exit?.client || '—' }}</td>
                  <td v-if="isVisible('exit_brand_model')" class="font-weight-bold text-warning">{{ row.exit?.brand_model || row.exit?.marque || '—' }}</td>
                  <td v-if="isVisible('exit_no_chassis')" class="text-center">{{ row.exit?.no_chassis || row.exit?.vin || '—' }}</td>
                  <td v-if="isVisible('exit_bl')">{{ row.exit?.bl || '—' }}</td>
                  <td v-if="isVisible('exit_nature')">{{ row.exit?.vehicle_type || '—' }}</td>
                  <td v-if="isVisible('declaration')">—</td>
                  <td v-if="isVisible('exit_time')">{{ formatDate(row.exit?.exit_time) }}</td>
                  <td v-if="isVisible('status')" class="text-center">
                    <span :class="row.status === 'IN_YARD' ? 'badge-in-yard' : 'badge-exited'">
                      {{ row.status === 'IN_YARD' ? 'En Dépôt' : 'Sorti' }}
                    </span>
                  </td>
                  <td v-if="isVisible('dwell_time_days')" class="text-center font-weight-bold" :class="row.dwell_time_days > 30 ? 'text-danger' : ''">
                    {{ row.dwell_time_days }} j
                  </td>
                </tr>
                <tr v-if="!loading && filteredRows.length === 0"><td :colspan="selectedColumns.length" class="text-center pa-6">Aucune donnée</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.excel-dashboard-table {
  width: 100%;
  min-width: 1700px;
  border-collapse: collapse;
  font-size: 0.825rem;
}

.excel-dashboard-table th,
.excel-dashboard-table td {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
}

.header-entree {
  background-color: #dbeafe !important;
  color: #1e40af !important;
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.header-sortie {
  background-color: #ffedd5 !important;
  color: #9a3412 !important;
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.header-statut {
  background-color: #f3f4f6 !important;
  color: #374151 !important;
  font-size: 0.95rem;
}

.header-sub th {
  background-color: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.border-section-end {
  border-right: 3px solid #64748b !important;
}

.badge-in-yard {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
}

.badge-exited {
  background-color: #dcfce7;
  color: #15803d;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
}

.table-row:hover {
  background-color: #f8fafc;
}
</style>
