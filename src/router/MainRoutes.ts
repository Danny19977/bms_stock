const MainRoutes = {
  path: '/main',
  meta: {
    requiresAuth: true
  },
  redirect: '/main/dashboard/default',
  component: () => import('@/layouts/full/FullLayout.vue'),
  children: [
    {
      name: 'LandingPage',
      path: '/',
      component: () => import('@/views/dashboards/default/DefaultDashboard.vue')
    },
    {
      name: 'Default',
      path: '/dashboard/default',
      component: () => import('@/views/dashboards/default/DefaultDashboard.vue')
    },
    {
      path: '/dashboard/entry-exit',
      redirect: '/dashboard/conteneurs'
    },
    {
      name: 'ContainerEntryExitDashboard',
      path: '/dashboard/conteneurs',
      meta: { title: 'Conteneurs Entry / Exit' },
      component: () => import('@/views/dashboards/EntryExitDashboard.vue')
    },
    {
      name: 'VehicleEntryExitDashboard',
      path: '/dashboard/voitures',
      meta: { title: 'Voiture Entry / Exit' },
      component: () => import('@/views/dashboards/VehicleEntryExitDashboard.vue')
    },
    {
      name: 'Starter',
      path: '/starter',
      component: () => import('@/views/StarterPage.vue')
    },
    {
      name: 'Tabler Icons',
      path: '/icons/tabler',
      component: () => import('@/views/utilities/icons/TablerIcons.vue')
    },
    {
      name: 'Material Icons',
      path: '/icons/material',
      component: () => import('@/views/utilities/icons/MaterialIcons.vue')
    },
    {
      name: 'Typography',
      path: '/utils/typography',
      component: () => import('@/views/utilities/typography/TypographyPage.vue')
    },
    {
      name: 'Shadows',
      path: '/utils/shadows',
      component: () => import('@/views/utilities/shadows/ShadowPage.vue')
    },
    {
      name: 'Colors',
      path: '/utils/colors',
      component: () => import('@/views/utilities/colors/ColorPage.vue')
    },
    {
      name: 'UsersPage',
      path: '/management/users',
      meta: { title: 'Users' },
      component: () => import('@/views/management/UsersPage.vue')
    },
    {
      name: 'ProfilePage',
      path: '/profile',
      meta: { title: 'Profile' },
      component: () => import('@/views/pages/ProfilePage.vue')
    },
    {
      name: 'CountriesPage',
      path: '/territories/country',
      meta: { title: 'Countries' },
      component: () => import('@/views/management/CountriesPage.vue')
    },
    {
      name: 'ProvincesPage',
      path: '/territories/province',
      meta: { title: 'Provinces' },
      component: () => import('@/views/management/ProvincesPage.vue')
    },
    {
      name: 'AreasPage',
      path: '/territories/area',
      meta: { title: 'Areas' },
      component: () => import('@/views/management/AreasPage.vue')
    },
    {
      name: 'WarehousesPage',
      path: '/territories/warehouse',
      meta: { title: 'Warehouses' },
      component: () => import('@/views/management/WarehousesPage.vue')
    },
    {
      name: 'EntriesPage',
      path: '/register/entry',
      meta: { title: 'Entries' },
      component: () => import('@/views/management/EntriesPage.vue')
    },
    {
      name: 'ExitsPage',
      path: '/register/exist',
      meta: { title: 'Exits' },
      component: () => import('@/views/management/ExitsPage.vue')
    }
  ]
};

export default MainRoutes;
