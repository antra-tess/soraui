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
          :placeholder="promptPlaceholder"
          rows="3"
          :disabled="loading"
          :error-messages="errors.prompt"
          counter
          :hint="promptHint"
          persistent-hint
        />

        <v-textarea
          v-if="isVeoModel"
          v-model="negativePrompt"
          label="Negative Prompt (Optional)"
          placeholder="What to avoid in the video..."
          rows="2"
          :disabled="loading"
          hint="Describe what you DON'T want (e.g., 'cartoon, low quality, blurry')"
          persistent-hint
          class="mt-4"
        />

        <v-switch
          v-if="isVeoModel"
          v-model="generateAudio"
          label="Generate Audio"
          :disabled="loading"
          color="primary"
          hint="Include synchronized speech, sound effects, and ambient audio (50% cost savings if disabled)"
          persistent-hint
          class="mt-2"
        />

        <v-row class="mt-2">
          <v-col cols="12">
            <v-select
              v-model="model"
              label="Model"
              :items="modelOptions"
              item-title="title"
              item-value="value"
              :disabled="loading"
              :hint="modelHint"
              persistent-hint
            >
              <template v-slot:item="{ props, item }">
                <v-list-item
                  v-if="item.raw.type === 'header'"
                  :title="item.raw.title"
                  disabled
                  class="font-weight-bold text-caption text-grey"
                />
                <v-list-item
                  v-else
                  v-bind="props"
                />
              </template>
            </v-select>
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

        <!-- Veo Image Mode Selector -->
        <v-select
          v-if="isVeoModel"
          v-model="veoImageMode"
          label="Image Mode (Optional)"
          :items="veoImageModeOptions"
          :disabled="loading"
          class="mt-4"
        />

        <!-- Image-to-Video: Single image animated -->
        <v-file-input
          v-if="isVeoModel && veoImageMode === 'image-to-video'"
          v-model="inputReference"
          label="Image to Animate"
          accept="image/jpeg,image/png,image/webp"
          prepend-icon="mdi-play-circle"
          :disabled="loading"
          hint="This image will be animated as the first frame of the video"
          persistent-hint
          clearable
          show-size
        />

        <!-- Reference Images: Style guidance (up to 3) -->
        <v-file-input
          v-if="isVeoModel && veoImageMode === 'reference-images'"
          v-model="referenceImages"
          label="Reference Images (1-3)"
          accept="image/jpeg,image/png,image/webp"
          prepend-icon="mdi-palette"
          :disabled="loading"
          hint="Guide style and content - preserves subject appearance (person/character/product)"
          persistent-hint
          clearable
          show-size
          multiple
          chips
        />

        <!-- Interpolation: First + Last frame -->
        <div v-if="isVeoModel && veoImageMode === 'interpolation'">
          <v-file-input
            v-model="firstFrame"
            label="First Frame"
            accept="image/jpeg,image/png,image/webp"
            prepend-icon="mdi-image-filter-frames"
            :disabled="loading"
            hint="Starting frame of the video"
            persistent-hint
            clearable
            show-size
            class="mb-2"
          />
          <v-file-input
            v-model="lastFrame"
            label="Last Frame"
            accept="image/jpeg,image/png,image/webp"
            prepend-icon="mdi-image-filter-frames"
            :disabled="loading"
            hint="Ending frame - Veo will create smooth transition between frames"
            persistent-hint
            clearable
            show-size
          />
        </div>

        <!-- Sora: Simple input reference -->
        <v-file-input
          v-if="!isVeoModel"
          v-model="inputReference"
          label="Input Image to Animate (Optional)"
          accept="image/jpeg,image/png,image/webp"
          prepend-icon="mdi-image"
          :disabled="loading"
          hint="Image to animate as first frame. Will be automatically resized and padded."
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
import { ref, computed } from 'vue'
import { useVideosStore } from '@/stores/videos'
import type { VideoModel, Video } from '@/types'

const emit = defineEmits<{
  videoCreated: []
}>()

const videosStore = useVideosStore()

const prompt = ref('')
const model = ref<VideoModel>('sora-2')
const size = ref('1280x720')
const seconds = ref('8')
const negativePrompt = ref('')
const generateAudio = ref(true)
const veoImageMode = ref<'none' | 'image-to-video' | 'reference-images' | 'interpolation'>('none')
const inputReference = ref<File | File[] | null>(null)
const referenceImages = ref<File[]>([])
const firstFrame = ref<File | null>(null)
const lastFrame = ref<File | null>(null)
const loading = ref(false)
const errors = ref<{ prompt?: string; file?: string }>({})

const modelOptions = [
  { title: '━━━ OpenAI Sora ━━━', value: '', disabled: true, type: 'header' },
  { title: 'Sora 2 (Fast)', value: 'sora-2', type: 'model' },
  { title: 'Sora 2 Pro (High Quality)', value: 'sora-2-pro', type: 'model' },
  { title: '━━━ Google Veo ━━━', value: '', disabled: true, type: 'header' },
  { title: 'Veo 3.1 (Latest, with Audio)', value: 'veo-3.1-generate-preview', type: 'model' },
  { title: 'Veo 3.1 Fast (Quick, with Audio)', value: 'veo-3.1-fast-generate-preview', type: 'model' },
  { title: 'Veo 3 (Standard)', value: 'veo-3-generate-preview', type: 'model' },
  { title: 'Veo 3 Fast (Quick)', value: 'veo-3-fast-generate-preview', type: 'model' },
]

const isVeoModel = computed(() => model.value.startsWith('veo-'))

const veoImageModeOptions = [
  { title: 'No Images (Text-to-Video)', value: 'none' },
  { title: 'Image-to-Video (Animate 1 Image)', value: 'image-to-video' },
  { title: 'Reference Images (Style Guidance, 1-3)', value: 'reference-images' },
  { title: 'Interpolation (First + Last Frame)', value: 'interpolation' },
]

const promptPlaceholder = computed(() => {
  return isVeoModel.value 
    ? 'Describe the video... Include audio cues in quotes for dialogue!' 
    : 'Describe the video you want to create...'
})

const promptHint = computed(() => {
  return isVeoModel.value
    ? 'Veo supports audio! Use quotes for dialogue, describe SFX and ambient noise'
    : 'Be specific: describe shot type, subject, action, setting, and lighting'
})

const modelHint = computed(() => {
  return isVeoModel.value 
    ? 'Veo models support native audio generation!' 
    : 'Sora 2 Pro offers higher quality, Sora 2 is faster'
})

const sizeOptions = computed(() => {
  if (isVeoModel.value) {
    // Veo uses aspect ratios and resolutions
    return [
      { title: '720p 16:9 (HD)', value: '1280x720' },
      { title: '1080p 16:9 (Full HD)', value: '1920x1080' },
      { title: '720p 9:16 (Portrait)', value: '720x1280' },
      { title: '1080p 9:16 (Portrait Full HD)', value: '1080x1920' },
    ]
  } else {
    // Sora sizes
    return [
      { title: '1280x720 (HD)', value: '1280x720' },
      { title: '1920x1080 (Full HD)', value: '1920x1080' },
      { title: '720x1280 (Portrait)', value: '720x1280' },
      { title: '1080x1920 (Portrait Full HD)', value: '1080x1920' }
    ]
  }
})

const durationOptions = computed(() => {
  if (isVeoModel.value) {
    // Veo supports 4, 6, 8 seconds
    return [
      { title: '4 seconds', value: '4' },
      { title: '6 seconds', value: '6' },
      { title: '8 seconds', value: '8' }
    ]
  } else {
    // Sora supports 4, 8, 12 seconds
    return [
      { title: '4 seconds', value: '4' },
      { title: '8 seconds', value: '8' },
      { title: '12 seconds', value: '12' }
    ]
  }
})

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

    // Add Veo-specific options
    if (isVeoModel.value) {
      if (negativePrompt.value) {
        formData.append('negativePrompt', negativePrompt.value)
      }
      formData.append('generateAudio', generateAudio.value.toString())
      formData.append('veoImageMode', veoImageMode.value)
      
      // Handle different Veo image modes
      if (veoImageMode.value === 'image-to-video' && inputReference.value) {
        console.log('Adding image-to-video image:', (inputReference.value as File).name)
        formData.append('input_reference', inputReference.value as File)
      } else if (veoImageMode.value === 'reference-images' && referenceImages.value.length > 0) {
        console.log(`Adding ${referenceImages.value.length} reference images for style`)
        referenceImages.value.forEach(file => {
          formData.append('reference_images', file)
        })
      } else if (veoImageMode.value === 'interpolation') {
        if (firstFrame.value) {
          console.log('Adding first frame:', firstFrame.value.name)
          formData.append('first_frame', firstFrame.value)
        }
        if (lastFrame.value) {
          console.log('Adding last frame:', lastFrame.value.name)
          formData.append('last_frame', lastFrame.value)
        }
      }
    } else {
      // Sora: Simple input reference
      if (inputReference.value) {
        console.log('Adding Sora input reference:', (inputReference.value as File).name)
        formData.append('input_reference', inputReference.value as File)
      }
    }

    await videosStore.createVideo(formData)

    // Reset form
    prompt.value = ''
    negativePrompt.value = ''
    generateAudio.value = true
    veoImageMode.value = 'none'
    inputReference.value = null
    referenceImages.value = []
    firstFrame.value = null
    lastFrame.value = null
    
    emit('videoCreated')
  } catch (err: any) {
    console.error('Error creating video:', err)
    errors.value.prompt = err.response?.data?.error || 'Failed to create video'
  } finally {
    loading.value = false
  }
}

async function loadTemplate(video: Video) {
  // Populate form with settings from an existing video
  prompt.value = video.prompt
  model.value = video.model
  size.value = video.size
  seconds.value = video.seconds
  generateAudio.value = video.has_audio !== false
  
  console.log('Template loaded from video:', video.id)
  
  // Reset all image inputs
  veoImageMode.value = 'none'
  inputReference.value = null
  referenceImages.value = []
  firstFrame.value = null
  lastFrame.value = null
  
  // Fetch and restore reference images if available
  if (video.has_input_reference) {
    try {
      const { apiClient } = await import('@/api/client')
      const response = await apiClient.getReferenceImages(video.id)
      
      if (response.images && response.images.length > 0) {
        // Convert base64 images back to File objects
        const files = await Promise.all(
          response.images.map(async (img: any) => {
            const blob = await fetch(`data:${img.mimeType};base64,${img.data}`).then(r => r.blob())
            return new File([blob], img.filename, { type: img.mimeType })
          })
        )
        
        // Determine the image mode based on filename patterns and count
        const hasFirst = files.some(f => f.name.includes('_first'))
        const hasLast = files.some(f => f.name.includes('_last'))
        const hasStyleRef = files.some(f => f.name.includes('_styleref'))
        
        if (isVeoModel.value) {
          if (hasFirst && hasLast) {
            // Interpolation mode
            veoImageMode.value = 'interpolation'
            firstFrame.value = files.find(f => f.name.includes('_first')) || files[0]
            lastFrame.value = files.find(f => f.name.includes('_last')) || files[1]
            console.log('Restored interpolation frames')
          } else if (hasStyleRef) {
            // Reference images mode
            veoImageMode.value = 'reference-images'
            referenceImages.value = files
            console.log(`Restored ${files.length} style reference images`)
          } else {
            // Image-to-video mode (single image)
            veoImageMode.value = 'image-to-video'
            inputReference.value = files[0]
            console.log('Restored image-to-video image')
          }
        } else {
          // Sora - simple input reference
          inputReference.value = files[0]
        }
      } else {
        console.log('No reference images found for this video')
      }
    } catch (error) {
      console.error('Error loading reference images:', error)
    }
  }
}

// Expose the loadTemplate method so parent can call it
defineExpose({
  loadTemplate
})
</script>

