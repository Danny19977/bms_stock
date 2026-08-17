<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LANGUAGE_STORAGE_KEY } from '@/i18n';

const { locale, t } = useI18n();

function setLanguage(language: string) {
  if (language !== 'en' && language !== 'fr') return;

  locale.value = language;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
}
</script>

<template>
  <v-btn-toggle
    :model-value="locale"
    :aria-label="t('language.label')"
    color="secondary"
    density="compact"
    divided
    mandatory
    variant="outlined"
    @update:model-value="setLanguage"
  >
    <v-btn value="en" size="small" :title="t('language.english')">EN</v-btn>
    <v-btn value="fr" size="small" :title="t('language.french')">FR</v-btn>
  </v-btn-toggle>
</template>
