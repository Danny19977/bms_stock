import { useNotificationStore } from '@/stores/notificationStore';

export function useNotification() {
  const notificationStore = useNotificationStore();

  return {
    showSuccess: (message: string) => notificationStore.success(message),
    showError: (message: string) => notificationStore.error(message),
    showInfo: (message: string) => notificationStore.info(message),
    showWarning: (message: string) => notificationStore.warning(message)
  };
}
