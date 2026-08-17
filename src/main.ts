import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueApexCharts from 'vue3-apexcharts';
import VueTablerIcons from 'vue-tabler-icons';
import { i18n } from '@/i18n';

import { fakeBackend } from '@/utils/helpers/fake-backend';
import { registerServiceWorker } from '@/registerServiceWorker';

// print
import print from 'vue3-print-nb';

const app = createApp(App);
fakeBackend();
registerServiceWorker();
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(createPinia());
app.use(i18n);
app.use(VueTablerIcons);
app.use(print);
app.use(VueApexCharts);
app.use(vuetify).mount('#app');
