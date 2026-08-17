import {
  DashboardIcon,
  WorldIcon,
  MapPinIcon,
  BuildingWarehouseIcon,
  FileTextIcon,
  UserIcon,
  BellIcon,
  HistoryIcon
} from 'vue-tabler-icons';

export interface menu {
  header?: string;
  title?: string;
  icon?: object;
  to?: string;
  divider?: boolean;
  chip?: string;
  chipColor?: string;
  chipVariant?: string;
  chipIcon?: string;
  children?: menu[];
  disabled?: boolean;
  type?: string;
  subCaption?: string;
}

const sidebarItem: menu[] = [
  { header: 'navigation.dashboard' },
  {
    title: 'navigation.containerMovements',
    icon: DashboardIcon,
    to: '/dashboard/conteneurs'
  },
  {
    title: 'navigation.vehicleMovements',
    icon: DashboardIcon,
    to: '/dashboard/voitures'
  },
  {
    title: 'navigation.kpi',
    icon: DashboardIcon,
    to: '/dashboard/default'
  },
  { divider: true },
  { header: 'navigation.territories' },
  {
    title: 'navigation.country',
    icon: WorldIcon,
    to: '/territories/country'
  },
  {
    title: 'navigation.province',
    icon: MapPinIcon,
    to: '/territories/province'
  },
  {
    title: 'navigation.area',
    icon: MapPinIcon,
    to: '/territories/area'
  },
  {
    title: 'navigation.warehouse',
    icon: BuildingWarehouseIcon,
    to: '/territories/warehouse'
  },
  { divider: true },
  { header: 'navigation.register' },
  {
    title: 'navigation.entry',
    icon: FileTextIcon,
    to: '/register/entry'
  },
  {
    title: 'navigation.exit',
    icon: FileTextIcon,
    to: '/register/exist'
  },
  { divider: true },
  { header: 'navigation.management' },
  {
    title: 'navigation.users',
    icon: UserIcon,
    to: '/management/users'
  },
  {
    title: 'navigation.notifications',
    icon: BellIcon,
    to: '/management/notifications'
  },
  {
    title: 'navigation.userLogs',
    icon: HistoryIcon,
    to: '/management/user-logs'
  }
];

export default sidebarItem;
