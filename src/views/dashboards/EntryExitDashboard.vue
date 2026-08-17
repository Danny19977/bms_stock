<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import DashboardColumnPicker from '@/components/shared/DashboardColumnPicker.vue';
import { exportDashboard, type ExportColumn } from '@/utils/helpers/dashboard-export';

interface DashboardRow {
  entry_date?: string | null;
  entry_client?: string;
  container_number?: string;
  container_type?: string;
  entry_bl?: string;
  entry_nature?: string;
  exit_date?: string | null;
  exit_client?: string;
  exit_bl?: string;
  exit_nature?: string;
  declaration?: string;
  liquidation?: string;
  quittance?: string;
  status?: string;
  dwell_time_days?: number;
  country?: string;
  province?: string;
  warehouse?: string;
  exit_container_number?: string;
}

interface StatsPayload {
  total_containers_treated?: number;
  containers_in_yard?: number;
  containers_exited?: number;
  average_dwell_days?: number;
}

interface ApiResponse<T> {
  data?: T[];
  status?: string;
  message?: string;
}

const route = useRoute();
const loading = ref(false);
const exporting = ref(false);
const rows = ref<DashboardRow[]>([]);
const stats = ref<StatsPayload>({});
const filters = ref({
  country: '',
  province: '',
  warehouse: '',
  status: 'all',
  search: '',
  container_type: '',
  container_number: '',
  entry_from: '',
  entry_to: '',
  overdue_only: false
});
const showFilters = ref(true);
const apiBaseUrl = `${import.meta.env.VITE_API_URL}/dashboard`;

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR') : '—');
const allColumns: ExportColumn<DashboardRow>[] = [
  { key: 'number', label: 'N°', section: 'entry', value: (_row, index) => index + 1 },
  { key: 'entry_date', label: 'DATE ENTRÉE', section: 'entry', value: (row) => formatDate(row.entry_date) },
  { key: 'entry_client', label: 'CLIENT', section: 'entry', value: (row) => row.entry_client || '—' },
  { key: 'container_number', label: 'N° CONTENEUR', section: 'entry', value: (row) => row.container_number || '—' },
  { key: 'container_type', label: 'TYPE', section: 'entry', value: (row) => row.container_type || '—' },
  { key: 'entry_bl', label: 'B/L', section: 'entry', value: (row) => row.entry_bl || '—' },
  { key: 'entry_nature', label: 'NATURE ENTRÉE', section: 'entry', value: (row) => row.entry_nature || '—' },
  { key: 'exit_client', label: 'CLIENT SORTIE', section: 'exit', value: (row) => row.exit_client || '—' },
  { key: 'exit_container_number', label: 'N° CONTENEUR SORTIE', section: 'exit', value: (row) => row.exit_container_number || row.container_number || '—' },
  { key: 'exit_bl', label: 'B/L SORTIE', section: 'exit', value: (row) => row.exit_bl || '—' },
  { key: 'exit_nature', label: 'NATURE SORTIE', section: 'exit', value: (row) => row.exit_nature || '—' },
  { key: 'declaration', label: 'DÉCL. (E) / LIQ. (L)', section: 'exit', value: (row) => row.declaration || row.liquidation || '—' },
  { key: 'exit_date', label: 'DATE SORTIE', section: 'exit', value: (row) => formatDate(row.exit_date) },
  { key: 'status', label: 'STATUT', section: 'exit', value: (row) => row.status === 'IN_YARD' ? 'En Dépôt' : 'Sorti' },
  { key: 'dwell_time_days', label: 'SÉJOUR', section: 'exit', value: (row) => `${row.dwell_time_days ?? 0} j` }
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

const statusOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'En Dépôt', value: 'in_yard' },
  { label: 'Sorti', value: 'exited' }
];

const countryOptions = computed(() => Array.from(new Set(rows.value.map((row) => row.country).filter(Boolean))).sort());
const provinceOptions = computed(() => Array.from(new Set(rows.value.map((row) => row.province).filter(Boolean))).sort());
const warehouseOptions = computed(() => Array.from(new Set(rows.value.map((row) => row.warehouse).filter(Boolean))).sort());

const kpis = computed(() => [
  { title: 'Total Conteneurs Traités', value: stats.value.total_containers_treated ?? rows.value.length },
  { title: 'Conteneurs Actuellement en Dépôt', value: stats.value.containers_in_yard ?? 0 },
  { title: 'Conteneurs Sortis', value: stats.value.containers_exited ?? 0 },
  { title: 'Total En Stagnation / En Dépôt', value: stats.value.containers_in_yard ?? 0 },
  { title: 'Durée Moyenne de Séjour (Jours)', value: `${(stats.value.average_dwell_days ?? 0).toFixed(1)} j` }
]);

const buildQuery = () => {
  const params = new URLSearchParams();
  Object.entries(filters.value).forEach(([key, value]) => {
    if (value === '' || value === false) return;
    if (typeof value === 'boolean') {
      params.set(key, value ? 'true' : 'false');
    } else {
      params.set(key, String(value));
    }
  });
  return params.toString();
};

const loadRows = async () => {
  loading.value = true;
  try {
    const query = buildQuery();
    const response = (await fetchWrapper.get(`${apiBaseUrl}/entry-exit${query ? `?${query}` : ''}`)) as ApiResponse<DashboardRow>;
    rows.value = response.data || [];
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = (await fetchWrapper.get(`${apiBaseUrl}/stats${buildQuery() ? `?${buildQuery()}` : ''}`)) as { data?: StatsPayload };
    stats.value = response.data || {};
  } catch (error) {
    console.error(error);
  }
};

const exportFile = (type: 'excel' | 'pdf') => {
  exporting.value = true;
  try {
    exportDashboard(type, 'conteneurs-entry-exit', rows.value, selectedColumns.value);
  } catch (error) {
    console.error(error);
  } finally {
    exporting.value = false;
  }
};

watch(filters, () => {
  loadRows();
  loadStats();
}, { deep: true });

onMounted(() => {
  loadRows();
  loadStats();
});

const pageTitle = computed(() => String(route.meta?.title || 'Entry / Exit Dashboard'));
</script>

<template>
  <v-container fluid class="pa-0">
    <v-card elevation="1" class="rounded-lg overflow-hidden">
      <v-card-title class="pa-4 border-b">
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-2">
          <div>
            <div class="text-h6 font-weight-bold">{{ pageTitle }}</div>
            <div class="text-body-2 text-medium-emphasis">Suivi des entrées, sorties et séjours des conteneurs</div>
          </div>
          <div class="d-flex flex-wrap ga-3">
            <v-btn size="small" variant="outlined" @click="showFilters = !showFilters">
              {{ showFilters ? 'Masquer filtres' : 'Afficher filtres' }}
            </v-btn>
            <v-btn size="small" color="primary" @click="exportFile('excel')" :loading="exporting">Exporter Excel</v-btn>
            <v-btn size="small" color="error" @click="exportFile('pdf')" :loading="exporting">Exporter PDF</v-btn>
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row class="mb-4">
          <v-col cols="12" sm="6" md="4" lg="auto" class="flex-grow-1" v-for="(kpi, i) in kpis" :key="i">
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
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-select v-model="filters.country" label="Pays" :items="countryOptions" clearable />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-select v-model="filters.province" label="Province" :items="provinceOptions" clearable />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-select v-model="filters.warehouse" label="Dépôt" :items="warehouseOptions" clearable />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-select v-model="filters.status" label="Statut" :items="statusOptions" item-title="label" item-value="value" />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-text-field v-model="filters.search" label="Recherche" placeholder="Client / B/L" clearable />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-text-field v-model="filters.container_type" label="Type de conteneur" placeholder="20', 40'" clearable />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-text-field v-model="filters.container_number" label="N° conteneur" clearable />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-text-field v-model="filters.entry_from" label="Entrée de" type="date" />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-text-field v-model="filters.entry_to" label="Entrée à" type="date" />
              </v-col>
              <v-col cols="12" sm="6" md="4" lg="2">
                <v-checkbox v-model="filters.overdue_only" label="Conteneurs en retard" hide-details />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <div class="d-flex justify-end mb-3">
          <DashboardColumnPicker
            :columns="allColumns"
            :visible-columns="visibleColumns"
            @toggle="toggleColumn"
          />
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
                  <th v-if="isVisible('entry_date')">DATE ENTRÉE</th>
                  <th v-if="isVisible('entry_client')">CLIENT</th>
                  <th v-if="isVisible('container_number')">N° CONTENEUR</th>
                  <th v-if="isVisible('container_type')">TYPE</th>
                  <th v-if="isVisible('entry_bl')">B/L</th>
                  <th v-if="isVisible('entry_nature')" class="border-section-end">NATURE ENTRÉE</th>
                  <th v-if="isVisible('exit_client')">CLIENT SORTIE</th>
                  <th v-if="isVisible('exit_container_number')">N° CONTENEUR SORTIE</th>
                  <th v-if="isVisible('exit_bl')">B/L SORTIE</th>
                  <th v-if="isVisible('exit_nature')">NATURE SORTIE</th>
                  <th v-if="isVisible('declaration')">DÉCL. (E) / LIQ. (L)</th>
                  <th v-if="isVisible('exit_date')">DATE SORTIE</th>
                  <th v-if="isVisible('status')">STATUT</th>
                  <th v-if="isVisible('dwell_time_days')">SÉJOUR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in rows" :key="index" class="table-row">
                  <td v-if="isVisible('number')" class="text-center">{{ index + 1 }}</td>
                  <td v-if="isVisible('entry_date')">{{ formatDate(row.entry_date) }}</td>
                  <td v-if="isVisible('entry_client')" class="font-weight-medium">{{ row.entry_client || '—' }}</td>
                  <td v-if="isVisible('container_number')" class="font-weight-bold text-primary">{{ row.container_number || '—' }}</td>
                  <td v-if="isVisible('container_type')" class="text-center">{{ row.container_type || '—' }}</td>
                  <td v-if="isVisible('entry_bl')">{{ row.entry_bl || '—' }}</td>
                  <td v-if="isVisible('entry_nature')" class="border-section-end">{{ row.entry_nature || '—' }}</td>
                  <td v-if="isVisible('exit_client')" class="font-weight-medium">{{ row.exit_client || '—' }}</td>
                  <td v-if="isVisible('exit_container_number')" class="font-weight-bold text-warning">{{ row.exit_container_number || row.container_number || '—' }}</td>
                  <td v-if="isVisible('exit_bl')">{{ row.exit_bl || '—' }}</td>
                  <td v-if="isVisible('exit_nature')">{{ row.exit_nature || '—' }}</td>
                  <td v-if="isVisible('declaration')">{{ row.declaration || row.liquidation || '—' }}</td>
                  <td v-if="isVisible('exit_date')">{{ formatDate(row.exit_date) }}</td>
                  <td v-if="isVisible('status')" class="text-center">
                    <span :class="row.status === 'IN_YARD' ? 'badge-in-yard' : 'badge-exited'">
                      {{ row.status === 'IN_YARD' ? 'En Dépôt' : 'Sorti' }}
                    </span>
                  </td>
                  <td v-if="isVisible('dwell_time_days')" class="text-center font-weight-bold" :class="(row.dwell_time_days ?? 0) > 30 ? 'text-danger' : ''">
                    {{ row.dwell_time_days ?? 0 }} j
                  </td>
                </tr>
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
