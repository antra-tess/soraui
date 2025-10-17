export interface User {
  id: string
  username: string
}

export type SoraModel = 'sora-2' | 'sora-2-pro'
export type VeoModel = 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview' | 'veo-3-generate-preview' | 'veo-3-fast-generate-preview'
export type VideoModel = SoraModel | VeoModel

export interface Video {
  id: string
  user_id: string
  provider: 'sora' | 'veo'
  provider_video_id: string
  openai_video_id?: string
  prompt: string
  model: VideoModel
  size: string
  seconds: string
  status: 'queued' | 'in_progress' | 'completed' | 'failed'
  progress: number
  created_at: number
  completed_at?: number
  file_path?: string
  thumbnail_path?: string
  error_message?: string
  has_input_reference?: boolean
  has_audio?: boolean
  reference_image_paths?: string
  remix_of?: string
  cost?: number
}

export interface VideoCreateRequest {
  prompt: string
  model: VideoModel
  size?: string
  seconds?: string
  resolution?: string
  negativePrompt?: string
  input_reference?: File
}

export interface VideoUpdateEvent {
  video_id: string
  updates: Partial<Video>
  video?: Video
}

export interface CostStats {
  user_total: number
  user_count: number
  platform_total: number
  platform_count: number
}

