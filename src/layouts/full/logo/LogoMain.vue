<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="logo">
    <RouterLink to="/" class="logo-link">
      <img src="/assets/logo.png" alt="BMS_STOCK" class="logo-image" />
    </RouterLink>
  </div>
</template>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.logo-link {
  display: inline-flex;
  align-items: center;
}

.logo-image {
  display: block;
  width: 180px;
  max-width: 100%;
  height: 48px;
  object-fit: contain;
  object-position: left center;
}
</style>
