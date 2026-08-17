<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

type EntityTab = 'containers' | 'vehicles';

interface KPISummary {
  total_entries: number;
  total_exits: number;
  remaining: number;
  stagnant: number;
  average_dwell_days: number;
  exit_rate: number;
}

interface KPITrend {
  date: string;
  entries: number;
  exits: number;
}

interface KPIBucket {
  label: string;
  count: number;
}

interface KPIDwellItem {
  label: string;
  client: string;
  status: string;
  dwell_days: number;
  entry_date: string;
  exit_date?: string;
}

interface KPIData {
  summary: KPISummary;
  trend: KPITrend[];
  age_buckets: KPIBucket[];
  top_dwell: KPIDwellItem[];
}

interface TerritoryOption {
  uuid: string;
  name: string;
  country_uuid?: string;
  province_uuid?: string;
  area_uuid?: string;
}

interface TerritoryData {
  countries: TerritoryOption[];
  provinces: TerritoryOption[];
  areas: TerritoryOption[];
  warehouses: TerritoryOption[];
  scope: {
    country_uuid: string;
    province_uuid: string;
    area_uuid: string;
    warehouse_uuid: string;
  };
}

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const formatInputDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const activeTab = ref<EntityTab>('containers');
const loading = ref(false);
const errorMessage = ref('');
const filters = ref({
  country_uuid: '',
  province_uuid: '',
  area_uuid: '',
  warehouse_uuid: '',
  start_date: formatInputDate(monthStart),
  end_date: formatInputDate(today)
});
const territoryData = ref<TerritoryData>({
  countries: [], provinces: [], areas: [], warehouses: [],
  scope: { country_uuid: '', province_uuid: '', area_uuid: '', warehouse_uuid: '' }
});
const data = ref<KPIData>({
  summary: { total_entries: 0, total_exits: 0, remaining: 0, stagnant: 0, average_dwell_days: 0, exit_rate: 0 },
  trend: [],
  age_buckets: [],
  top_dwell: []
});

const entityName = computed(() => activeTab.value === 'containers' ? 'Conteneurs' : 'Voitures');
const filteredProvinces = computed(() => territoryData.value.provinces.filter((province) =>
  !filters.value.country_uuid || province.country_uuid === filters.value.country_uuid
));
const filteredAreas = computed(() => territoryData.value.areas.filter((area) =>
  (!filters.value.country_uuid || area.country_uuid === filters.value.country_uuid)
  && (!filters.value.province_uuid || area.province_uuid === filters.value.province_uuid)
));
const filteredWarehouses = computed(() => territoryData.value.warehouses.filter((warehouse) =>
  (!filters.value.country_uuid || warehouse.country_uuid === filters.value.country_uuid)
  && (!filters.value.province_uuid || warehouse.province_uuid === filters.value.province_uuid)
  && (!filters.value.area_uuid || warehouse.area_uuid === filters.value.area_uuid)
));
const isScopeLocked = (key: keyof TerritoryData['scope']) => Boolean(territoryData.value.scope[key]);
const summaryCards = computed(() => [
  { label: `${entityName.value} enregistrés`, value: data.value.summary.total_entries },
  { label: `${entityName.value} sortis`, value: data.value.summary.total_exits },
  { label: 'En dépôt', value: data.value.summary.remaining },
  { label: 'En stagnation (+30 j)', value: data.value.summary.stagnant },
  { label: 'Séjour moyen', value: `${data.value.summary.average_dwell_days.toFixed(1)} j` },
  { label: 'Taux de sortie', value: `${data.value.summary.exit_rate.toFixed(1)} %` }
]);

const trendSeries = computed(() => [
  { name: 'Entrées', data: data.value.trend.map((point) => point.entries) },
  { name: 'Sorties', data: data.value.trend.map((point) => point.exits) }
]);
const trendOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#2563eb', '#ea580c'],
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  xaxis: { categories: data.value.trend.map((point) => new Date(point.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })) },
  grid: { borderColor: '#e2e8f0' },
  legend: { position: 'top' }
}));

const ageSeries = computed(() => [{ name: 'Enregistrements', data: data.value.age_buckets.map((bucket) => bucket.count) }]);
const ageOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#0f766e'],
  plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
  dataLabels: { enabled: false },
  xaxis: { categories: data.value.age_buckets.map((bucket) => bucket.label) },
  grid: { borderColor: '#e2e8f0' }
}));

const loadKPI = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const params = new URLSearchParams({ entity: activeTab.value, ...filters.value });
    const response = (await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/dashboard/kpi/movements?${params}`)) as { data?: KPIData };
    if (response.data) data.value = response.data;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les indicateurs';
  } finally {
    loading.value = false;
  }
};

const loadTerritories = async () => {
  try {
    const response = (await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/dashboard/territories`)) as { data?: TerritoryData };
    if (!response.data) return;
    territoryData.value = response.data;
    filters.value.country_uuid = response.data.scope.country_uuid || '';
    filters.value.province_uuid = response.data.scope.province_uuid || '';
    filters.value.area_uuid = response.data.scope.area_uuid || '';
    filters.value.warehouse_uuid = response.data.scope.warehouse_uuid || '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les territoires autorisés';
  }
};

const handleCountryChange = () => {
  if (!isScopeLocked('province_uuid')) filters.value.province_uuid = '';
  if (!isScopeLocked('area_uuid')) filters.value.area_uuid = '';
  if (!isScopeLocked('warehouse_uuid')) filters.value.warehouse_uuid = '';
};
const handleProvinceChange = () => {
  if (!isScopeLocked('area_uuid')) filters.value.area_uuid = '';
  if (!isScopeLocked('warehouse_uuid')) filters.value.warehouse_uuid = '';
};
const handleAreaChange = () => {
  if (!isScopeLocked('warehouse_uuid')) filters.value.warehouse_uuid = '';
};

watch([activeTab, filters], loadKPI, { deep: true });
onMounted(async () => {
  await loadTerritories();
  await loadKPI();
});
</script>

<template>
  <v-container fluid class="pa-0">
    <v-card elevation="1" class="rounded-lg overflow-hidden">
      <v-card-title class="px-4 pt-4 pb-0 border-b">
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3">
          <div>
            <div class="text-h6 font-weight-bold">KPI Stock & Mouvements</div>
            <div class="text-body-2 text-medium-emphasis">Vue synthétique des flux, stocks restants et durées de séjour</div>
          </div>
        </div>
        <v-tabs v-model="activeTab" color="primary" density="compact">
          <v-tab value="containers">Conteneurs</v-tab>
          <v-tab value="vehicles">Voitures</v-tab>
        </v-tabs>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{ errorMessage }}</v-alert>
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <v-card variant="outlined" class="mb-4">
          <v-card-text class="pa-3">
            <div class="d-flex flex-wrap ga-3 align-center territory-filter-bar">
              <v-select
                v-model="filters.country_uuid" label="Pays" :items="territoryData.countries" item-title="name" item-value="uuid"
                density="compact" hide-details clearable :disabled="isScopeLocked('country_uuid')" @update:model-value="handleCountryChange"
              />
              <v-select
                v-model="filters.province_uuid" label="Province" :items="filteredProvinces" item-title="name" item-value="uuid"
                density="compact" hide-details clearable :disabled="isScopeLocked('province_uuid') || !filters.country_uuid" @update:model-value="handleProvinceChange"
              />
              <v-select
                v-model="filters.area_uuid" label="Delta / Area" :items="filteredAreas" item-title="name" item-value="uuid"
                density="compact" hide-details clearable :disabled="isScopeLocked('area_uuid') || !filters.province_uuid" @update:model-value="handleAreaChange"
              />
              <v-select
                v-model="filters.warehouse_uuid" label="Dépôt / Warehouse" :items="filteredWarehouses" item-title="name" item-value="uuid"
                density="compact" hide-details clearable :disabled="isScopeLocked('warehouse_uuid') || !filters.area_uuid"
              />
              <v-text-field v-model="filters.start_date" label="Du" type="date" density="compact" hide-details />
              <v-text-field v-model="filters.end_date" label="Au" type="date" density="compact" hide-details />
            </div>
          </v-card-text>
        </v-card>

        <v-row dense class="mb-2">
          <v-col v-for="card in summaryCards" :key="card.label" cols="6" md="4" lg="2">
            <v-card variant="outlined" class="kpi-summary-card pa-3">
              <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
              <div class="text-h5 font-weight-bold mt-1">{{ card.value }}</div>
            </v-card>
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="12" lg="8">
            <v-card variant="outlined" class="analytics-panel pa-3">
              <div class="text-subtitle-2 font-weight-bold mb-1">Tendance des mouvements</div>
              <apexchart type="area" height="270" :options="trendOptions" :series="trendSeries" />
            </v-card>
          </v-col>
          <v-col cols="12" lg="4">
            <v-card variant="outlined" class="analytics-panel pa-3">
              <div class="text-subtitle-2 font-weight-bold mb-1">Répartition par durée de séjour</div>
              <apexchart type="bar" height="270" :options="ageOptions" :series="ageSeries" />
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-card variant="outlined" class="overflow-hidden">
              <div class="text-subtitle-2 font-weight-bold px-4 pt-3">Séjours les plus longs</div>
              <v-table density="compact" fixed-header height="250">
                <thead>
                  <tr><th>Référence</th><th>Client</th><th>Entrée</th><th>Sortie</th><th>Statut</th><th class="text-right">Séjour</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in data.top_dwell" :key="`${item.label}-${item.entry_date}`">
                    <td class="font-weight-medium">{{ item.label || '—' }}</td><td>{{ item.client || '—' }}</td>
                    <td>{{ item.entry_date }}</td><td>{{ item.exit_date || '—' }}</td>
                    <td>{{ item.status === 'IN_YARD' ? 'En dépôt' : 'Sorti' }}</td><td class="text-right font-weight-bold">{{ item.dwell_days }} j</td>
                  </tr>
                  <tr v-if="!loading && data.top_dwell.length === 0"><td colspan="6" class="text-center py-6">Aucune donnée sur cette période</td></tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.kpi-summary-card { min-height: 82px; }
.analytics-panel { min-height: 320px; }
.territory-filter-bar > * { flex: 1 1 175px; min-width: 0; }
</style>
