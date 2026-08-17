<script setup lang="ts">
import { ColumnsIcon } from 'vue-tabler-icons';

export interface DashboardColumn {
  key: string;
  label: string;
}

const props = defineProps<{
  columns: DashboardColumn[];
  visibleColumns: string[];
}>();

const emit = defineEmits<{
  toggle: [key: string];
}>();
</script>

<template>
  <v-menu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: menuProps }">
      <v-btn v-bind="menuProps" size="small" variant="outlined" :prepend-icon="ColumnsIcon">
        Colonnes
      </v-btn>
    </template>
    <v-list density="compact" min-width="260">
      <v-list-item v-for="column in props.columns" :key="column.key" @click="emit('toggle', column.key)">
        <template #prepend>
          <v-checkbox-btn :model-value="props.visibleColumns.includes(column.key)" @click.stop="emit('toggle', column.key)" />
        </template>
        <v-list-item-title>{{ column.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
