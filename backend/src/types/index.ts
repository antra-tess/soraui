export interface User {
  id: string;
  username: string;
  password: string; // bcrypt hash
}

export interface Video {
  id: string;
  user_id: string;
  openai_video_id: string;
  prompt: string;
  model: string;
  size: string;
  seconds: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  completed_at?: number;
  file_path?: string;
  thumbnail_path?: string;
  error_message?: string;
  has_input_reference?: boolean;
  remix_of?: string;
  cost?: number;
}

export interface CostStats {
  user_total: number;
  user_count: number;
  platform_total: number;
  platform_count: number;
}

export interface VideoCreateRequest {
  prompt: string;
  model: 'sora-2' | 'sora-2-pro';
  size?: string;
  seconds?: string;
  input_reference?: Express.Multer.File;
}

export interface VideoRemixRequest {
  prompt: string;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}

