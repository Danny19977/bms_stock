<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useTheme } from 'vuetify';
import { CameraIcon, LockIcon, ShieldCheckIcon, UserIcon } from 'vue-tabler-icons';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useAuthStore } from '@/stores/auth';
import { useNotification } from '@/composables/useNotification';
import defaultAvatar from '@/assets/images/profile/user-round.svg';

interface TerritoryRef {
  uuid: string;
  name: string;
}

interface ProfileUser {
  uuid: string;
  fullname: string;
  email: string;
  phone: string;
  title?: string;
  role?: string;
  permission?: string;
  profile_image?: string;
  status?: boolean;
  country?: TerritoryRef | null;
  province?: TerritoryRef | null;
  area?: TerritoryRef | null;
  warehouse?: TerritoryRef | null;
  created_at?: string;
}

const authStore = useAuthStore();
const theme = useTheme();
const { showError, showSuccess, showInfo } = useNotification();
const profile = ref<ProfileUser | null>(null);
const loading = ref(false);
const savingInfo = ref(false);
const savingPassword = ref(false);
const selectedImage = ref<File | null>(null);
const previewUrl = ref('');
const activityCount = ref(0);
const infoForm = ref({ fullname: '', email: '', phone: '' });
const passwordForm = ref({ current: '', password: '', confirm: '' });
const darkMode = computed({
  get: () => theme.global.name.value === 'DarkTheme',
  set: (enabled: boolean) => {
    const name = enabled ? 'DarkTheme' : 'PurpleTheme';
    theme.global.name.value = name;
    localStorage.setItem('theme', name);
  }
});

const avatarUrl = computed(() => previewUrl.value || profile.value?.profile_image || defaultAvatar);
const roleLabel = computed(() => profile.value?.title || profile.value?.role || 'User');
const securityLabel = computed(() => profile.value?.status === false ? 'Account inactive' : 'Account active & password protected');

const syncAuthUser = (user: ProfileUser) => {
  const token = authStore.user?.token;
  authStore.user = { ...user, token } as typeof authStore.user;
  localStorage.setItem('user', JSON.stringify(authStore.user));
};

const loadProfile = async () => {
  loading.value = true;
  try {
    const user = (await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/auth/user`)) as unknown as ProfileUser;
    profile.value = user;
    infoForm.value = { fullname: user.fullname || '', email: user.email || '', phone: user.phone || '' };
    syncAuthUser(user);
    const activity = (await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/users-logs/all/paginate/${user.uuid}?page=1&limit=1`)) as { pagination?: { total_records?: number } };
    activityCount.value = Number(activity.pagination?.total_records || 0);
  } catch (error) {
    showError(String(error));
  } finally {
    loading.value = false;
  }
};

const selectImage = (files: File | File[] | null) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showError('Profile image must be smaller than 5 MB');
    return;
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  selectedImage.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

const saveProfile = async () => {
  if (!infoForm.value.fullname.trim() || !infoForm.value.email.trim()) {
    showError('Full name and email are required');
    return;
  }
  savingInfo.value = true;
  try {
    const body = new FormData();
    body.append('fullname', infoForm.value.fullname.trim());
    body.append('email', infoForm.value.email.trim());
    body.append('phone', infoForm.value.phone.trim());
    if (selectedImage.value) body.append('profile_image_file', selectedImage.value);
    await fetchWrapper.put(`${import.meta.env.VITE_API_URL}/auth/profil/info`, body);
    await loadProfile();
    selectedImage.value = null;
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
    showSuccess('Profile updated successfully');
  } catch (error) {
    showError(String(error));
  } finally {
    savingInfo.value = false;
  }
};

const changePassword = async () => {
  if (!passwordForm.value.current) {
    showError('Current password is required');
    return;
  }
  if (passwordForm.value.password.length < 8) {
    showError('New password must contain at least 8 characters');
    return;
  }
  if (passwordForm.value.password !== passwordForm.value.confirm) {
    showError('New password and confirmation do not match');
    return;
  }
  savingPassword.value = true;
  try {
    const response = (await fetchWrapper.put(`${import.meta.env.VITE_API_URL}/auth/change-password`, {
      old_password: passwordForm.value.current,
      password: passwordForm.value.password,
      password_confirm: passwordForm.value.confirm
    })) as { message?: string };
    passwordForm.value = { current: '', password: '', confirm: '' };
    showInfo(response.message || 'Password change request submitted');
  } catch (error) {
    showError(String(error));
  } finally {
    savingPassword.value = false;
  }
};

onMounted(loadProfile);
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

<template>
  <v-container fluid class="pa-0">
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />
    <v-row>
      <v-col cols="12" lg="4">
        <v-card variant="outlined" class="profile-summary pa-5 text-center">
          <v-avatar size="124" class="profile-avatar mb-3">
            <v-img :src="avatarUrl" cover />
          </v-avatar>
          <div class="text-h5 font-weight-bold">{{ profile?.fullname || '—' }}</div>
          <div class="text-body-2 text-medium-emphasis mb-4">{{ roleLabel }}</div>
          <v-file-input
            label="Profile picture" accept="image/*" prepend-icon="" :prepend-inner-icon="CameraIcon"
            density="compact" variant="outlined" hide-details class="mb-4" @update:model-value="selectImage"
          />
          <div class="d-flex flex-wrap justify-center ga-2 mb-4">
            <v-chip color="primary" variant="tonal"><UserIcon size="16" class="mr-1" />{{ activityCount }} activities</v-chip>
            <v-chip :color="profile?.status === false ? 'error' : 'success'" variant="tonal"><ShieldCheckIcon size="16" class="mr-1" />{{ securityLabel }}</v-chip>
          </div>
          <v-divider class="mb-3" />
          <v-switch v-model="darkMode" color="primary" label="Dark theme" hide-details inset />
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">User information</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="6"><v-text-field v-model="infoForm.fullname" label="Full Name" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="infoForm.email" label="Email" type="email" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="infoForm.phone" label="Phone" /></v-col>
              <v-col cols="12" md="6"><v-text-field :model-value="roleLabel" label="Role / Title" readonly /></v-col>
              <v-col cols="12" md="6"><v-text-field :model-value="profile?.country?.name || '—'" label="Country" readonly /></v-col>
              <v-col cols="12" md="6"><v-text-field :model-value="profile?.province?.name || '—'" label="Province" readonly /></v-col>
              <v-col cols="12" md="6"><v-text-field :model-value="profile?.area?.name || '—'" label="Delta / Area" readonly /></v-col>
              <v-col cols="12" md="6"><v-text-field :model-value="profile?.warehouse?.name || '—'" label="Warehouse" readonly /></v-col>
            </v-row>
          </v-card-text>
          <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn color="primary" :loading="savingInfo" @click="saveProfile">Save profile</v-btn></v-card-actions>
        </v-card>

        <v-card variant="outlined">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold"><LockIcon size="20" class="mr-2" />Change password</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12"><v-text-field v-model="passwordForm.current" label="Current Password" type="password" autocomplete="current-password" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="passwordForm.password" label="New Password" type="password" autocomplete="new-password" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="passwordForm.confirm" label="Confirm Password" type="password" autocomplete="new-password" /></v-col>
            </v-row>
            <v-alert type="info" variant="tonal" density="compact">Password changes require support approval.</v-alert>
          </v-card-text>
          <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn color="primary" variant="outlined" :loading="savingPassword" @click="changePassword">Request password change</v-btn></v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.profile-summary { position: sticky; top: 88px; }
.profile-avatar { border: 3px solid rgb(var(--v-theme-primary)); }
@media (max-width: 1279px) { .profile-summary { position: static; } }
</style>
