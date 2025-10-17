import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from './auth'
import { useVideosStore } from './videos'
import type { VideoUpdateEvent } from '@/types'

export const useWebSocketStore = defineStore('websocket', () => {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)

  function connect() {
    const authStore = useAuthStore()
    
    if (!authStore.token) {
      console.warn('Cannot connect WebSocket: no auth token')
      return
    }

    if (socket.value?.connected) {
      console.log('WebSocket already connected')
      return
    }

    // In development, connect to backend on port 3000
    // In production, connect to same origin
    const wsUrl = import.meta.env.VITE_WS_URL || 
                  (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)
    
    console.log('Connecting to WebSocket:', wsUrl)
    
    socket.value = io(wsUrl, {
      auth: {
        token: authStore.token
      }
    })

    socket.value.on('connect', () => {
      console.log('WebSocket connected')
      connected.value = true
    })

    socket.value.on('disconnect', () => {
      console.log('WebSocket disconnected')
      connected.value = false
    })

    socket.value.on('video_update', (data: VideoUpdateEvent) => {
      console.log('Video update received:', data)
      const videosStore = useVideosStore()
      
      if (data.video) {
        videosStore.setFullVideo(data.video)
      } else if (data.updates) {
        videosStore.updateVideo(data.video_id, data.updates)
      }

      // Emit event for cost stats refresh if video completed
      if (data.video?.status === 'completed' || data.updates?.status === 'completed') {
        window.dispatchEvent(new CustomEvent('video-completed'))
      }
    })

    socket.value.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      connected.value = false
    }
  }

  function requestVideoStatus(videoId: string) {
    if (socket.value?.connected) {
      socket.value.emit('request_video_status', { video_id: videoId })
    }
  }

  // Auto-connect when authenticated
  const authStore = useAuthStore()
  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) {
      connect()
    } else {
      disconnect()
    }
  }, { immediate: true })

  return {
    socket,
    connected,
    connect,
    disconnect,
    requestVideoStatus
  }
})

