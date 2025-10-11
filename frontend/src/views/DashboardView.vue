<template>
  <div>
    <v-app-bar color="primary" prominent>
      <v-app-bar-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-video-vintage</v-icon>
        Sora2 Video Platform
      </v-app-bar-title>

      <template v-slot:append>
        <v-chip class="mr-4" prepend-icon="mdi-circle" :color="wsConnected ? 'success' : 'grey'">
          {{ wsConnected ? 'Connected' : 'Disconnected' }}
        </v-chip>
        
        <v-chip class="mr-4" prepend-icon="mdi-account">
          {{ authStore.user?.username }}
        </v-chip>

        <v-btn icon @click="settingsDialog = true" class="mr-2">
          <v-icon>mdi-cog</v-icon>
        </v-btn>

        <v-btn icon @click="handleLogout">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="8">
            <CreateVideoCard @video-created="handleVideoCreated" />
          </v-col>
          <v-col cols="12" md="4">
            <CostStatsCard ref="costStatsCard" />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Video Library</span>
                <v-btn
                  icon
                  @click="refreshVideos"
                  :loading="videosStore.loading"
                >
                  <v-icon>mdi-refresh</v-icon>
                </v-btn>
              </v-card-title>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-if="videosStore.loading && videosStore.videos.length === 0">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary" size="64" />
          </v-col>
        </v-row>

        <v-row v-else-if="videosStore.videos.length === 0">
          <v-col cols="12">
            <v-alert type="info" variant="tonal">
              No videos yet. Create your first video above!
            </v-alert>
          </v-col>
        </v-row>

        <v-row v-else>
          <v-col
            v-for="video in videosStore.videos"
            :key="video.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <VideoCard :video="video" @delete="handleDelete" @remix="handleRemix" @play="handlePlay" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <RemixDialog
      v-model="remixDialog"
      :video="remixVideo"
      @remix="handleRemixSubmit"
    />

    <VideoPlayerDialog
      v-model="playerDialog"
      :video="playingVideo"
    />

    <SettingsDialog
      v-model="settingsDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVideosStore } from '@/stores/videos'
import { useWebSocketStore } from '@/stores/websocket'
import CreateVideoCard from '@/components/CreateVideoCard.vue'
import VideoCard from '@/components/VideoCard.vue'
import RemixDialog from '@/components/RemixDialog.vue'
import VideoPlayerDialog from '@/components/VideoPlayerDialog.vue'
import CostStatsCard from '@/components/CostStatsCard.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import type { Video } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const videosStore = useVideosStore()
const wsStore = useWebSocketStore()

const remixDialog = ref(false)
const remixVideo = ref<Video | null>(null)
const playerDialog = ref(false)
const playingVideo = ref<Video | null>(null)
const costStatsCard = ref<any>(null)
const settingsDialog = ref(false)

const wsConnected = computed(() => wsStore.connected)

onMounted(() => {
  refreshVideos()
})

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}

async function refreshVideos() {
  await videosStore.fetchVideos()
}

function handleVideoCreated() {
  // Video already added to store by CreateVideoCard
  // Note: Cost stats will auto-refresh when video completes via WebSocket
}

async function handleDelete(video: Video) {
  if (confirm(`Delete video "${video.prompt}"?`)) {
    try {
      await videosStore.deleteVideo(video.id)
    } catch (err) {
      console.error('Error deleting video:', err)
    }
  }
}

function handleRemix(video: Video) {
  remixVideo.value = video
  remixDialog.value = true
}

async function handleRemixSubmit(prompt: string) {
  if (!remixVideo.value) return

  try {
    await videosStore.remixVideo(remixVideo.value.id, prompt)
    remixDialog.value = false
    remixVideo.value = null
  } catch (err) {
    console.error('Error remixing video:', err)
  }
}

function handlePlay(video: Video) {
  playingVideo.value = video
  playerDialog.value = true
}
</script>

