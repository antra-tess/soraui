<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-video-plus-outline</v-icon>
        {{ isVeoVideo ? 'Extend Video' : 'Continue from Last Frame' }}
      </v-card-title>

      <v-card-text v-if="video">
        <v-alert type="info" variant="tonal" class="mb-4">
          <div v-if="isVeoVideo">
            <v-icon start color="purple">mdi-video-plus</v-icon>
            <strong>Native Video Extension (Veo)</strong>
            <br>Extending the original video by {{ seconds || video.seconds }} seconds
            <br>Original: <strong>{{ video.prompt }}</strong>
          </div>
          <div v-else>
            Creating a new video starting from the last frame of:
            <br><strong>{{ video.prompt }}</strong>
          </div>
        </v-alert>

        <v-textarea
          v-model="continuePrompt"
          label="What happens next?"
          placeholder="Describe what happens after the previous video..."
          rows="3"
          :disabled="loading"
          :hint="isVeoVideo ? 'Veo will seamlessly extend the original video' : 'The last frame will be used as the first frame of the new video'"
          persistent-hint
          counter
        />

        <v-row class="mt-2">
          <v-col cols="12" md="6">
            <v-select
              v-model="model"
              label="Model (Optional)"
              :items="modelOptions"
              :disabled="loading"
              hint="Leave as original or change"
              persistent-hint
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-select
              v-model="seconds"
              label="Duration (Optional)"
              :items="durationOptions"
              :disabled="loading"
              hint="Leave as original or change"
              persistent-hint
            />
          </v-col>
        </v-row>
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
          @click="handleContinue"
          :loading="loading"
          :disabled="!continuePrompt.trim()"
        >
          <v-icon start>mdi-video-plus-outline</v-icon>
          {{ isVeoVideo ? 'Extend Video' : 'Continue Video' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Video } from '@/types'

const props = defineProps<{
  modelValue: boolean
  video: Video | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'continue': [data: { prompt: string; model?: string; seconds?: string }]
}>()

const continuePrompt = ref('')
const model = ref<string>('')
const seconds = ref<string>('')
const loading = ref(false)

const isVeoVideo = computed(() => props.video?.provider === 'veo')

const modelOptions = computed(() => {
  if (isVeoVideo.value) {
    return [
      { title: 'Same as Original', value: '' },
      { title: 'Veo 3.1', value: 'veo-3.1-generate-preview' },
      { title: 'Veo 3.1 Fast', value: 'veo-3.1-fast-generate-preview' }
    ]
  } else {
    return [
      { title: 'Same as Original', value: '' },
      { title: 'Sora 2', value: 'sora-2' },
      { title: 'Sora 2 Pro', value: 'sora-2-pro' }
    ]
  }
})

const durationOptions = computed(() => {
  if (isVeoVideo.value) {
    // Veo extensions support 4, 6, 8 seconds (must be 8s for extensions per docs, but let's allow flexibility)
    return [
      { title: 'Same as Original', value: '' },
      { title: '4 seconds', value: '4' },
      { title: '6 seconds', value: '6' },
      { title: '8 seconds', value: '8' }
    ]
  } else {
    return [
      { title: 'Same as Original', value: '' },
      { title: '4 seconds', value: '4' },
      { title: '8 seconds', value: '8' },
      { title: '12 seconds', value: '12' }
    ]
  }
})

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    continuePrompt.value = ''
    model.value = ''
    seconds.value = ''
    loading.value = false
  }
})

function handleContinue() {
  if (!continuePrompt.value.trim()) return
  
  loading.value = true
  
  const data: { prompt: string; model?: string; seconds?: string } = {
    prompt: continuePrompt.value
  }
  
  if (model.value) data.model = model.value
  if (seconds.value) data.seconds = seconds.value
  
  emit('continue', data)
  
  setTimeout(() => {
    loading.value = false
  }, 500)
}
</script>

