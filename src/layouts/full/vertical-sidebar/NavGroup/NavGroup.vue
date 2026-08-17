<script setup>
import { useI18n } from 'vue-i18n';

const props = defineProps({ item: Object });
const { t } = useI18n();
</script>

<template>
  <v-list-subheader color="darkText" class="smallCap">{{ t(props.item.header) }}</v-list-subheader>
</template>
