import { mdiAlertCircleOutline, mdiAlertOutline, mdiBellOutline, mdiCheckCircleOutline, mdiInformationOutline } from '@mdi/js';
import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    show: false,
    message: '',
    color: 'success',
    icon: mdiCheckCircleOutline,
    timeout: 4000,
    notifications: []
  }),
  actions: {
    notify({ message, color = 'success', timeout = 4000 }) {
      const icons = {
        success: mdiCheckCircleOutline,
        error: mdiAlertCircleOutline,
        warning: mdiAlertOutline,
        info: mdiInformationOutline
      };

      const notification = {
        id: Date.now() + Math.random(),
        message,
        color,
        icon: icons[color] || mdiBellOutline,
        timeout
      };

      this.notifications.push(notification);
      this.message = message;
      this.color = color;
      this.icon = notification.icon;
      this.timeout = timeout;
      this.show = true;

      if (timeout > 0) {
        globalThis.setTimeout(() => {
          this.dismiss(notification.id);
        }, timeout);
      }
    },
    success(msg) {
      this.notify({ message: msg, color: 'success' });
    },
    error(msg) {
      this.notify({ message: msg, color: 'error', timeout: 6000 });
    },
    warning(msg) {
      this.notify({ message: msg, color: 'warning' });
    },
    info(msg) {
      this.notify({ message: msg, color: 'info' });
    },
    dismiss(id) {
      this.notifications = this.notifications.filter((item) => item.id !== id);
      if (this.notifications.length === 0) {
        this.show = false;
      }
    },
    hide() {
      this.show = false;
      this.notifications = [];
    }
  }
});
