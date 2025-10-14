import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type { Video } from '@/types'

export const useVideosStore = defineStore('videos', () => {
  const videos = ref<Video[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchVideos() {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.getVideos()
      videos.value = response.videos
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch videos'
      console.error('Error fetching videos:', err)
    } finally {
      loading.value = false
    }
  }

  async function createVideo(formData: FormData) {
    try {
      const video = await apiClient.createVideo(formData)
      videos.value.unshift(video)
      return video
    } catch (err: any) {
      error.value = err.message || 'Failed to create video'
      console.error('Error creating video:', err)
      throw err
    }
  }

  async function deleteVideo(videoId: string) {
    try {
      await apiClient.deleteVideo(videoId)
      videos.value = videos.value.filter(v => v.id !== videoId)
    } catch (err: any) {
      error.value = err.message || 'Failed to delete video'
      console.error('Error deleting video:', err)
      throw err
    }
  }

  async function remixVideo(videoId: string, prompt: string) {
    try {
      const video = await apiClient.remixVideo(videoId, prompt)
      videos.value.unshift(video)
      return video
    } catch (err: any) {
      error.value = err.message || 'Failed to remix video'
      console.error('Error remixing video:', err)
      throw err
    }
  }

  async function continueFromVideo(videoId: string, data: { prompt: string; model?: string; seconds?: string }) {
    try {
      const video = await apiClient.continueFromVideo(videoId, data)
      videos.value.unshift(video)
      return video
    } catch (err: any) {
      error.value = err.message || 'Failed to continue from video'
      console.error('Error continuing from video:', err)
      throw err
    }
  }

  function updateVideo(videoId: string, updates: Partial<Video>) {
    const index = videos.value.findIndex(v => v.id === videoId)
    if (index !== -1) {
      videos.value[index] = { ...videos.value[index], ...updates }
    }
  }

  function setFullVideo(video: Video) {
    const index = videos.value.findIndex(v => v.id === video.id)
    if (index !== -1) {
      videos.value[index] = video
    } else {
      videos.value.unshift(video)
    }
  }

  return {
    videos,
    loading,
    error,
    fetchVideos,
    createVideo,
    deleteVideo,
    remixVideo,
    continueFromVideo,
    updateVideo,
    setFullVideo
  }
})

