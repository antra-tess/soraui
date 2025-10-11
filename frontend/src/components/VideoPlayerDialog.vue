<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="1200">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>{{ video?.prompt }}</span>
        <v-btn icon variant="text" @click="$emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text v-if="video" class="pa-0">
        <video
          ref="videoPlayer"
          :src="videoUrl"
          controls
          autoplay
          style="width: 100%; max-height: 70vh;"
          @error="handleError"
        >
          Your browser does not support the video tag.
        </video>
      </v-card-text>

      <v-card-text v-if="error">
        <v-alert type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-chip size="small" :color="modelColor">
          {{ video?.model }}
        </v-chip>
        <v-chip size="small">
          {{ video?.size }}
        </v-chip>
        <v-chip size="small">
          {{ video?.seconds }}s
        </v-chip>
        
        <v-spacer />
        
        <v-btn
          color="primary"
          variant="tonal"
          :href="downloadUrl"
          download
        >
          <v-icon start>mdi-download</v-icon>
          Download
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Video } from '@/types'
import { apiClient } from '@/api/client'

const props = defineProps<{
  modelValue: boolean
  video: Video | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const error = ref<string | null>(null)
const videoPlayer = ref<HTMLVideoElement | null>(null)

const videoUrl = computed(() => {
  if (!props.video) return ''
  return apiClient.getVideoUrl(props.video.id, 'video')
})

const downloadUrl = computed(() => {
  if (!props.video) return ''
  return apiClient.getDownloadUrl(props.video.id)
})

const modelColor = computed(() => {
  return props.video?.model === 'sora-2-pro' ? 'purple' : 'primary'
})

function handleError(event: Event) {
  console.error('Video playback error:', event)
  error.value = 'Failed to load video. Please try downloading instead.'
}
</script>

