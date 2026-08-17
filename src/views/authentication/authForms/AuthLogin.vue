<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { Form } from 'vee-validate';
import { useNotification } from '@/composables/useNotification';
import { useI18n } from 'vue-i18n';

const checkbox = ref(false);
const valid = ref(false);
const show1 = ref(false);
const isSubmittingForm = ref(false);
const password = ref('');
const identifier = ref('');
const { t } = useI18n();
const passwordRules = computed(() => [
  (value: string) => !!value || t('login.passwordRequired'),
  (value: string) => (value && value.length <= 50) || t('login.passwordTooLong')
]);
const emailRules = computed(() => [(value: string) => !!value || t('login.identifierRequired')]);

/* eslint-disable @typescript-eslint/no-explicit-any */
function validate(values: any, { setErrors }: any) {
  const authStore = useAuthStore();
  const { showError } = useNotification();
  isSubmittingForm.value = true;

  return authStore
    .login(identifier.value, password.value)
    .catch((error) => {
      const message = error instanceof Error ? error.message : t('login.authenticationFailed');
      setErrors({ apiError: message });
      showError(message);
    })
    .finally(() => {
      isSubmittingForm.value = false;
    });
}
</script>

<template>
  <Form @submit="validate" class="mt-7 loginForm" v-slot="{ errors, isSubmitting }">
    <v-text-field
      v-model="identifier"
      :rules="emailRules"
      :label="t('login.identifier')"
      class="mt-4 mb-8"
      required
      density="comfortable"
      hide-details="auto"
      variant="outlined"
      color="primary"
    ></v-text-field>
    <v-text-field
      v-model="password"
      :rules="passwordRules"
      :label="t('login.password')"
      required
      density="comfortable"
      variant="outlined"
      color="primary"
      hide-details="auto"
      :append-icon="show1 ? '$eye' : '$eyeOff'"
      :type="show1 ? 'text' : 'password'"
      @click:append="show1 = !show1"
      class="pwdInput"
    ></v-text-field>

    <div class="d-sm-flex align-center mt-2 mb-7 mb-sm-0">
      <v-checkbox
        v-model="checkbox"
        :rules="[(value: any) => !!value || t('login.agreementRequired')]"
        :label="t('login.remember')"
        required
        color="primary"
        class="ms-n2"
        hide-details
      ></v-checkbox>
      <div class="ml-auto">
        <a href="javascript:void(0)" class="text-primary text-decoration-none">{{ t('login.forgot') }}</a>
      </div>
    </div>
    <v-btn color="secondary" :loading="isSubmitting || isSubmittingForm" block class="mt-2" variant="flat" size="large" :disabled="valid" type="submit">
      {{ t('login.submit') }}</v-btn
    >
    <div v-if="errors.apiError" class="mt-2">
      <v-alert color="error">{{ errors.apiError }}</v-alert>
    </div>
  </Form>
  <div class="mt-5 text-right">
    <v-divider />
    <v-btn variant="plain" to="/register" class="mt-2 text-capitalize mr-n2">{{ t('login.noAccount') }}</v-btn>
  </div>
</template>
<style lang="scss">
.outlinedInput .v-field {
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: none;
}
.pwdInput {
  position: relative;
  .v-input__append {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
}
.loginForm {
  .v-text-field .v-field--active input {
    font-weight: 500;
  }
}
</style>
