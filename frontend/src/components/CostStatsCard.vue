<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-currency-usd</v-icon>
      Cost Tracker
    </v-card-title>

    <v-card-text v-if="!loading">
      <v-row>
        <v-col cols="12" md="6">
          <v-card variant="tonal" color="primary">
            <v-card-text>
              <div class="text-h6 mb-1">Your Spending</div>
              <div class="text-h3 font-weight-bold">${{ stats?.user_total.toFixed(2) }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ stats?.user_count }} video{{ stats?.user_count === 1 ? '' : 's' }} generated
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="tonal" color="secondary">
            <v-card-text>
              <div class="text-h6 mb-1">Platform Total</div>
              <div class="text-h3 font-weight-bold">${{ stats?.platform_total.toFixed(2) }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ stats?.platform_count }} total video{{ stats?.platform_count === 1 ? '' : 's' }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <v-expansion-panels variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2">mdi-information-outline</v-icon>
            Pricing Information
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="font-weight-medium">Sora 2</v-list-item-title>
                <v-list-item-subtitle>$0.10 per second (720p) | $0.15 per second (1080p)</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-medium">Sora 2 Pro</v-list-item-title>
                <v-list-item-subtitle>$0.20 per second (720p) | $0.30 per second (1080p)</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              Costs are calculated when videos are created and charged only for completed generations.
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <v-card-text v-else class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'
import type { CostStats } from '@/types'

const stats = ref<CostStats | null>(null)
const loading = ref(true)

onMounted(async () => {
  await fetchStats()
  
  // Listen for video completion events to auto-refresh
  window.addEventListener('video-completed', handleVideoCompleted)
})

onUnmounted(() => {
  window.removeEventListener('video-completed', handleVideoCompleted)
})

async function fetchStats() {
  loading.value = true
  try {
    stats.value = await apiClient.getCostStats()
  } catch (error) {
    console.error('Error fetching cost stats:', error)
  } finally {
    loading.value = false
  }
}

function handleVideoCompleted() {
  // Refresh stats when a video completes
  fetchStats()
}

defineExpose({
  refresh: fetchStats
})
</script>

