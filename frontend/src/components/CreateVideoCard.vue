<template>
  <v-card>
    <v-card-title>
      <v-icon class="mr-2">mdi-video-plus</v-icon>
      Create New Video
    </v-card-title>

    <v-card-text>
      <v-form @submit.prevent="handleSubmit">
        <v-textarea
          v-model="prompt"
          label="Prompt"
          placeholder="Describe the video you want to create..."
          rows="3"
          :disabled="loading"
          :error-messages="errors.prompt"
          counter
          hint="Be specific: describe shot type, subject, action, setting, and lighting"
        />

        <v-row class="mt-2">
          <v-col cols="12" md="4">
            <v-select
              v-model="model"
              label="Model"
              :items="modelOptions"
              :disabled="loading"
              hint="sora-2 is faster, sora-2-pro is higher quality"
              persistent-hint
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="size"
              label="Size"
              :items="sizeOptions"
              :disabled="loading"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="seconds"
              label="Duration"
              :items="durationOptions"
              :disabled="loading"
            />
          </v-col>
        </v-row>

        <v-file-input
          v-model="inputReference"
          label="Input Reference (Optional)"
          accept="image/jpeg,image/png,image/webp"
          prepend-icon="mdi-image"
          :disabled="loading"
          :error-messages="errors.file"
          hint="Image to use as first frame. Will be automatically resized and padded to match video resolution."
          persistent-hint
          clearable
          show-size
        />

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="loading"
          class="mt-4"
        >
          <v-icon start>mdi-video-plus</v-icon>
          Generate Video
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVideosStore } from '@/stores/videos'

const emit = defineEmits<{
  videoCreated: []
}>()

const videosStore = useVideosStore()

const prompt = ref('')
const model = ref<'sora-2' | 'sora-2-pro'>('sora-2')
const size = ref('1280x720')
const seconds = ref('8')
const inputReference = ref<File | File[] | null>(null)
const loading = ref(false)
const errors = ref<{ prompt?: string; file?: string }>({})

const modelOptions = [
  { title: 'Sora 2 (Fast)', value: 'sora-2' },
  { title: 'Sora 2 Pro (High Quality)', value: 'sora-2-pro' }
]

const sizeOptions = [
  { title: '1280x720 (HD)', value: '1280x720' },
  { title: '1920x1080 (Full HD)', value: '1920x1080' },
  { title: '720x1280 (Portrait)', value: '720x1280' },
  { title: '1080x1920 (Portrait Full HD)', value: '1080x1920' }
]

const durationOptions = [
  { title: '4 seconds', value: '4' },
  { title: '8 seconds', value: '8' },
  { title: '12 seconds', value: '12' }
]

async function handleSubmit() {
  errors.value = {}

  if (!prompt.value.trim()) {
    errors.value.prompt = 'Prompt is required'
    return
  }

  loading.value = true

  try {
    console.log('Input reference value:', inputReference.value)
    console.log('Is array?', Array.isArray(inputReference.value))
    console.log('Type:', typeof inputReference.value)
    
    const formData = new FormData()
    formData.append('prompt', prompt.value)
    formData.append('model', model.value)
    formData.append('size', size.value)
    formData.append('seconds', seconds.value)

    // Handle both single File and array of Files
    if (inputReference.value) {
      const file = Array.isArray(inputReference.value) 
        ? inputReference.value[0] 
        : inputReference.value
      
      if (file) {
        console.log('Adding file to FormData:', file.name, file.size)
        formData.append('input_reference', file)
      }
    } else {
      console.log('No file to add')
    }

    await videosStore.createVideo(formData)

    // Reset form
    prompt.value = ''
    inputReference.value = null
    
    emit('videoCreated')
  } catch (err: any) {
    console.error('Error creating video:', err)
    errors.value.prompt = err.response?.data?.error || 'Failed to create video'
  } finally {
    loading.value = false
  }
}
</script>

