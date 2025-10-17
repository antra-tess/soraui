CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sora',
  provider_video_id TEXT NOT NULL,
  openai_video_id TEXT,  -- Deprecated, kept for backwards compatibility
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  seconds TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  file_path TEXT,
  thumbnail_path TEXT,
  error_message TEXT,
  has_input_reference INTEGER DEFAULT 0,
  has_audio INTEGER DEFAULT 0,
  reference_image_paths TEXT,
  provider_metadata TEXT,
  remix_of TEXT,
  cost REAL DEFAULT 0,
  FOREIGN KEY (remix_of) REFERENCES videos(id)
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);

