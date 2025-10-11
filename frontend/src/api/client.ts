import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '@/stores/auth'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    // In production, use full URL if provided, otherwise use relative /api
    const baseURL = import.meta.env.PROD 
      ? (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api')
      : '/api'
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const authStore = useAuthStore()
      if (authStore.token) {
        config.headers.Authorization = `Bearer ${authStore.token}`
      }
      return config
    })

    // Handle 401 responses
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const authStore = useAuthStore()
          authStore.logout()
        }
        return Promise.reject(error)
      }
    )
  }

  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password })
    return response.data
  }

  async createVideo(data: FormData) {
    const response = await this.client.post('/videos', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  async getVideos(limit = 50, offset = 0) {
    const response = await this.client.get('/videos', {
      params: { limit, offset }
    })
    return response.data
  }

  async getVideo(videoId: string) {
    const response = await this.client.get(`/videos/${videoId}`)
    return response.data
  }

  async deleteVideo(videoId: string) {
    const response = await this.client.delete(`/videos/${videoId}`)
    return response.data
  }

  async remixVideo(videoId: string, prompt: string) {
    const response = await this.client.post(`/videos/${videoId}/remix`, { prompt })
    return response.data
  }

  getVideoUrl(videoId: string, variant: 'video' | 'thumbnail' = 'video') {
    const authStore = useAuthStore()
    return `/api/videos/${videoId}/content?variant=${variant}&token=${authStore.token}`
  }

  getDownloadUrl(videoId: string) {
    return this.getVideoUrl(videoId, 'video')
  }

  getThumbnailUrl(videoId: string) {
    return this.getVideoUrl(videoId, 'thumbnail')
  }

  async getCostStats() {
    const response = await this.client.get('/videos/stats/costs')
    return response.data
  }
}

export const apiClient = new ApiClient()

