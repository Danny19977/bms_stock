<template>
  <v-app>
    <RouterView></RouterView>

    <Teleport to="body">
      <div class="notification-stack">
        <TransitionGroup name="notification-fade">
          <div v-for="item in notifications" :key="item.id" class="notification-item">
            <v-alert
              :color="item.color"
              :icon="item.icon"
              variant="tonal"
              density="comfortable"
              closable
              prominent
              class="notification-card"
              @click:close="notificationStore.dismiss(item.id)"
            >
              {{ item.message }}
            </v-alert>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterView } from 'vue-router';
import { useNotificationStore } from '@/stores/notificationStore';

const notificationStore = useNotificationStore() as any;
const notifications = computed(() => notificationStore.notifications as Array<{ id: number; message: string; color: string; icon: string; timeout: number }>);
</script>

<style scoped>
.notification-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: min(360px, calc(100vw - 24px));
}

.notification-item {
  width: 100%;
}

.notification-card {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
}

.notification-fade-enter-active,
.notification-fade-leave-active {
  transition: all 0.25s ease;
}

.notification-fade-enter-from,
.notification-fade-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
