<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-cog</v-icon>
        Account Settings
      </v-card-title>

      <v-card-text>
        <v-tabs v-model="tab">
          <v-tab value="password">Change Password</v-tab>
          <v-tab value="users">Manage Users</v-tab>
        </v-tabs>

        <v-window v-model="tab" class="mt-4">
          <!-- Change Password Tab -->
          <v-window-item value="password">
            <v-form @submit.prevent="handleChangePassword">
              <v-text-field
                v-model="currentPassword"
                label="Current Password"
                type="password"
                :disabled="loading"
                :error-messages="error"
              />

              <v-text-field
                v-model="newPassword"
                label="New Password"
                type="password"
                :disabled="loading"
                :error-messages="error"
                hint="At least 6 characters"
              />

              <v-text-field
                v-model="confirmPassword"
                label="Confirm New Password"
                type="password"
                :disabled="loading"
                :error-messages="error"
              />

              <v-alert v-if="success" type="success" variant="tonal" class="mt-2">
                Password changed successfully!
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                block
                :loading="loading"
                :disabled="!canSubmitPassword"
                class="mt-4"
              >
                Change Password
              </v-btn>
            </v-form>
          </v-window-item>

          <!-- Manage Users Tab -->
          <v-window-item value="users">
            <v-form @submit.prevent="handleCreateUser">
              <div class="text-subtitle-1 mb-2">Create New User</div>
              
              <v-text-field
                v-model="newUsername"
                label="Username"
                :disabled="loading"
                :error-messages="error"
              />

              <v-text-field
                v-model="newUserPassword"
                label="Password"
                type="password"
                :disabled="loading"
                :error-messages="error"
                hint="At least 6 characters"
              />

              <v-btn
                type="submit"
                color="primary"
                block
                :loading="loading"
                :disabled="!canSubmitNewUser"
                class="mt-4"
              >
                <v-icon start>mdi-account-plus</v-icon>
                Create User
              </v-btn>

              <v-alert v-if="userCreated" type="success" variant="tonal" class="mt-4">
                User "{{ userCreated }}" created successfully!
              </v-alert>
            </v-form>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const authStore = useAuthStore()
const tab = ref('password')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const userCreated = ref('')

// Password change
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// New user
const newUsername = ref('')
const newUserPassword = ref('')

const canSubmitPassword = computed(() => {
  return currentPassword.value && 
         newPassword.value.length >= 6 && 
         newPassword.value === confirmPassword.value
})

const canSubmitNewUser = computed(() => {
  return newUsername.value && newUserPassword.value.length >= 6
})

async function handleChangePassword() {
  if (!canSubmitPassword.value) return

  loading.value = true
  error.value = ''
  success.value = false

  try {
    await axios.post('/api/admin/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    }, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    success.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to change password'
  } finally {
    loading.value = false
  }
}

async function handleCreateUser() {
  if (!canSubmitNewUser.value) return

  loading.value = true
  error.value = ''
  userCreated.value = ''

  try {
    await axios.post('/api/admin/users', {
      username: newUsername.value,
      password: newUserPassword.value
    }, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    userCreated.value = newUsername.value
    newUsername.value = ''
    newUserPassword.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to create user'
  } finally {
    loading.value = false
  }
}
</script>

