export interface User {
  id: string
  username: string
}

export interface Video {
  id: string
  user_id: string
  openai_video_id: string
  prompt: string
  model: 'sora-2' | 'sora-2-pro'
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
  remix_of?: string
  cost?: number
}

export interface VideoCreateRequest {
  prompt: string
  model: 'sora-2' | 'sora-2-pro'
  size?: string
  seconds?: string
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

