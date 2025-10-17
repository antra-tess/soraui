import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Video, CostStats } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class VideoDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize() {
    const SQL = await initSqlJs();
    
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schema);
    this.save();
  }

  private save() {
    if (!this.db) return;
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
  }

  createVideo(video: Video): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(`
      INSERT INTO videos (
        id, user_id, provider, provider_video_id, openai_video_id, 
        prompt, model, size, seconds, status, progress, created_at, 
        has_input_reference, has_audio, reference_image_paths, remix_of, cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      video.id,
      video.user_id,
      video.provider,
      video.provider_video_id,
      video.openai_video_id || video.provider_video_id, // Backwards compat
      video.prompt,
      video.model,
      video.size,
      video.seconds,
      video.status,
      video.progress,
      video.created_at,
      video.has_input_reference ? 1 : 0,
      video.has_audio ? 1 : 0,
      video.reference_image_paths || null,
      video.remix_of || null,
      video.cost || 0
    ]);
    
    this.save();
  }

  updateVideo(id: string, updates: Partial<Video>): void {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`);
    
    if (fields.length === 0) return;

    const values = Object.entries(updates)
      .filter(([k]) => k !== 'id')
      .map(([k, v]) => {
        if (k === 'has_input_reference') return v ? 1 : 0;
        return v ?? null;
      });

    this.db.run(`
      UPDATE videos SET ${fields.join(', ')} WHERE id = ?
    `, [...values, id] as any[]);
    
    this.save();
  }

  getVideo(id: string): Video | null {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.db.exec('SELECT * FROM videos WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    return this.mapRowToVideo(result[0].columns, result[0].values[0]);
  }

  getVideosByUser(userId: string, limit = 50, offset = 0): Video[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.db.exec(`
      SELECT * FROM videos 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
    
    if (result.length === 0) return [];
    return result[0].values.map(row => this.mapRowToVideo(result[0].columns, row));
  }

  deleteVideo(id: string): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run('DELETE FROM videos WHERE id = ?', [id]);
    this.save();
  }

  getVideoByOpenAIId(openaiVideoId: string): Video | null {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.db.exec('SELECT * FROM videos WHERE openai_video_id = ?', [openaiVideoId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    return this.mapRowToVideo(result[0].columns, result[0].values[0]);
  }

  getVideoByProviderVideoId(providerVideoId: string): Video | null {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = this.db.exec('SELECT * FROM videos WHERE provider_video_id = ?', [providerVideoId]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    
    return this.mapRowToVideo(result[0].columns, result[0].values[0]);
  }

  getCostStats(userId: string): CostStats {
    if (!this.db) throw new Error('Database not initialized');
    
    // Get user's total cost
    const userResult = this.db.exec(`
      SELECT COALESCE(SUM(cost), 0) as total, COUNT(*) as count
      FROM videos 
      WHERE user_id = ? AND status = 'completed'
    `, [userId]);
    
    // Get platform total cost
    const platformResult = this.db.exec(`
      SELECT COALESCE(SUM(cost), 0) as total, COUNT(*) as count
      FROM videos 
      WHERE status = 'completed'
    `);
    
    const userStats = userResult[0]?.values[0] || [0, 0];
    const platformStats = platformResult[0]?.values[0] || [0, 0];
    
    return {
      user_total: Number(userStats[0]) || 0,
      user_count: Number(userStats[1]) || 0,
      platform_total: Number(platformStats[0]) || 0,
      platform_count: Number(platformStats[1]) || 0
    };
  }

  private mapRowToVideo(columns: string[], values: any[]): Video {
    const row: any = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    
    return {
      id: row.id,
      user_id: row.user_id,
      provider: row.provider || 'sora', // Default for old records
      provider_video_id: row.provider_video_id || row.openai_video_id, // Fallback
      openai_video_id: row.openai_video_id, // Backwards compat
      prompt: row.prompt,
      model: row.model,
      size: row.size,
      seconds: row.seconds,
      status: row.status,
      progress: row.progress,
      created_at: row.created_at,
      completed_at: row.completed_at,
      file_path: row.file_path,
      thumbnail_path: row.thumbnail_path,
      error_message: row.error_message,
      has_input_reference: row.has_input_reference === 1,
      has_audio: row.has_audio === 1,
      reference_image_paths: row.reference_image_paths,
      remix_of: row.remix_of,
      cost: row.cost || 0
    };
  }

  close(): void {
    this.save();
    if (this.db) {
      this.db.close();
    }
  }
}

