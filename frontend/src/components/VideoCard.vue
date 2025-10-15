<template>
  <v-card>
    <v-img
      v-if="video.status === 'completed' && video.thumbnail_path"
      :src="thumbnailUrl"
      height="200"
      cover
    >
      <template v-slot:placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="grey-lighten-5" />
        </v-row>
      </template>
    </v-img>
    
    <v-img
      v-else
      height="200"
      :color="statusColor"
      class="d-flex align-center justify-center"
    >
      <v-icon size="64" color="white">{{ statusIcon }}</v-icon>
    </v-img>

    <v-card-title class="text-wrap">
      <div class="prompt-text">
        <div :class="{ 'prompt-collapsed': !promptExpanded && isLongPrompt }">
          {{ video.prompt }}
        </div>
        <v-btn
          v-if="isLongPrompt"
          size="x-small"
          variant="text"
          @click="promptExpanded = !promptExpanded"
          class="mt-1"
        >
          {{ promptExpanded ? 'Show Less' : 'Show More' }}
        </v-btn>
      </div>
    </v-card-title>

  <v-card-subtitle>
    <v-chip size="small" :color="modelColor" class="mr-1">
      {{ video.model }}
    </v-chip>
    <v-chip size="small" class="mr-1">
      {{ video.size }}
    </v-chip>
    <v-chip size="small" class="mr-1">
      {{ video.seconds }}s
    </v-chip>
    <v-chip v-if="video.cost" size="small" color="green" variant="tonal">
      ${{ video.cost.toFixed(2) }}
    </v-chip>
  </v-card-subtitle>

    <v-card-text>
      <div class="d-flex align-center justify-space-between mb-2">
        <v-chip :color="statusColor" variant="flat" size="small">
          <v-icon start>{{ statusIcon }}</v-icon>
          {{ statusText }}
        </v-chip>
        <span class="text-caption">{{ formattedDate }}</span>
      </div>

      <v-progress-linear
        v-if="video.status === 'in_progress' || video.status === 'queued'"
        :model-value="video.progress"
        :color="statusColor"
        height="8"
        rounded
      >
        <template v-slot:default="{ value }">
          <strong class="text-caption">{{ Math.ceil(value) }}%</strong>
        </template>
      </v-progress-linear>

      <v-alert
        v-if="video.status === 'failed'"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-2"
      >
        {{ video.error_message || 'Generation failed' }}
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn
        v-if="video.status === 'completed'"
        color="primary"
        variant="flat"
        @click="$emit('play', video)"
      >
        <v-icon start>mdi-play</v-icon>
        Play
      </v-btn>

      <v-btn
        v-if="video.status === 'completed'"
        color="primary"
        variant="tonal"
        :href="videoUrl"
        download
      >
        <v-icon start>mdi-download</v-icon>
        Download
      </v-btn>

      <v-spacer />

      <!-- Three dot menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-dots-vertical"
            variant="text"
            v-bind="props"
          />
        </template>

        <v-list>
          <!-- Force Check Status - for stuck videos -->
          <v-list-item
            v-if="video.status === 'in_progress' || video.status === 'queued'"
            @click="handleForceCheck"
            :disabled="checkingStatus"
          >
            <template v-slot:prepend>
              <v-icon :class="{ 'mdi-spin': checkingStatus }">
                {{ checkingStatus ? 'mdi-loading' : 'mdi-refresh' }}
              </v-icon>
            </template>
            <v-list-item-title>
              {{ checkingStatus ? 'Checking...' : 'Force Check Status' }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="video.progress >= 90">
              Stuck at {{ video.progress }}%?
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider v-if="video.status === 'completed' || video.status === 'in_progress' || video.status === 'queued'" />

          <!-- Remix -->
          <v-list-item
            v-if="video.status === 'completed'"
            @click="$emit('remix', video)"
          >
            <template v-slot:prepend>
              <v-icon>mdi-auto-fix</v-icon>
            </template>
            <v-list-item-title>Remix</v-list-item-title>
            <v-list-item-subtitle>Modify this video</v-list-item-subtitle>
          </v-list-item>

          <!-- Continue -->
          <v-list-item
            v-if="video.status === 'completed'"
            @click="$emit('continue', video)"
          >
            <template v-slot:prepend>
              <v-icon>mdi-video-plus-outline</v-icon>
            </template>
            <v-list-item-title>Continue</v-list-item-title>
            <v-list-item-subtitle>Extend this video</v-list-item-subtitle>
          </v-list-item>

          <v-divider v-if="video.status === 'completed'" />

          <!-- Delete -->
          <v-list-item
            @click="$emit('delete', video)"
            class="text-error"
          >
            <template v-slot:prepend>
              <v-icon color="error">mdi-delete</v-icon>
            </template>
            <v-list-item-title>Delete</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Video } from '@/types'
import { apiClient } from '@/api/client'

const props = defineProps<{
  video: Video
}>()

const emit = defineEmits<{
  delete: [video: Video]
  remix: [video: Video]
  play: [video: Video]
  continue: [video: Video]
  statusUpdated: [video: Video]
}>()

const promptExpanded = ref(false)
const checkingStatus = ref(false)

const handleForceCheck = async () => {
  try {
    checkingStatus.value = true
    const result = await apiClient.forceCheckStatus(props.video.id)
    
    // Emit event to notify parent to refresh the video
    emit('statusUpdated', result.video)
    
    // Show a success message
    console.log('Status check triggered:', result.message)
  } catch (error) {
    console.error('Failed to force check status:', error)
  } finally {
    checkingStatus.value = false
  }
}

const isLongPrompt = computed(() => {
  return props.video.prompt.length > 80
})

const statusColor = computed(() => {
  switch (props.video.status) {
    case 'completed': return 'success'
    case 'in_progress': return 'info'
    case 'queued': return 'warning'
    case 'failed': return 'error'
    default: return 'grey'
  }
})

const statusIcon = computed(() => {
  switch (props.video.status) {
    case 'completed': return 'mdi-check-circle'
    case 'in_progress': return 'mdi-loading mdi-spin'
    case 'queued': return 'mdi-clock-outline'
    case 'failed': return 'mdi-alert-circle'
    default: return 'mdi-help-circle'
  }
})

const statusText = computed(() => {
  switch (props.video.status) {
    case 'completed': return 'Completed'
    case 'in_progress': return 'Processing'
    case 'queued': return 'Queued'
    case 'failed': return 'Failed'
    default: return 'Unknown'
  }
})

const modelColor = computed(() => {
  return props.video.model === 'sora-2-pro' ? 'purple' : 'primary'
})

const formattedDate = computed(() => {
  const date = new Date(props.video.created_at * 1000)
  return date.toLocaleString()
})

const videoUrl = computed(() => {
  return apiClient.getVideoUrl(props.video.id, 'video')
})

const thumbnailUrl = computed(() => {
  return apiClient.getThumbnailUrl(props.video.id)
})
</script>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.mdi-spin {
  animation: spin 1s linear infinite;
}

.prompt-text {
  font-size: 0.95rem;
  line-height: 1.4;
}

.prompt-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-card-title .prompt-text {
  font-size: 0.9rem;
  font-weight: 500;
}
</style>

