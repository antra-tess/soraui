<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-auto-fix</v-icon>
        Remix Video
      </v-card-title>

      <v-card-text v-if="video">
        <v-alert type="info" variant="tonal" class="mb-4">
          Remixing: <strong>{{ video.prompt }}</strong>
        </v-alert>

        <v-textarea
          v-model="remixPrompt"
          label="Remix Prompt"
          placeholder="Describe the change you want to make..."
          rows="3"
          :disabled="loading"
          hint="Make a single, well-defined change for best results"
          persistent-hint
          counter
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="$emit('update:modelValue', false)"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="handleRemix"
          :loading="loading"
          :disabled="!remixPrompt.trim()"
        >
          <v-icon start>mdi-auto-fix</v-icon>
          Remix
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Video } from '@/types'

const props = defineProps<{
  modelValue: boolean
  video: Video | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'remix': [prompt: string]
}>()

const remixPrompt = ref('')
const loading = ref(false)

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    remixPrompt.value = ''
    loading.value = false
  }
})

function handleRemix() {
  if (!remixPrompt.value.trim()) return
  
  loading.value = true
  emit('remix', remixPrompt.value)
  
  // Reset after a delay to allow the parent to handle the remix
  setTimeout(() => {
    loading.value = false
  }, 500)
}
</script>

