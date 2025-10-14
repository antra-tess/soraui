#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface Sora2Config {
  baseUrl: string;
  username: string;
  password: string;
}

class Sora2MCPServer {
  private server: Server;
  private client: AxiosInstance;
  private token: string | null = null;
  private config: Sora2Config;
  private tempDir: string;

  constructor(config: Sora2Config) {
    this.config = config;
    this.tempDir = join(tmpdir(), 'sora2-mcp');
    
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.server = new Server(
      {
        name: 'sora2-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async authenticate(): Promise<void> {
    if (this.token) return;

    try {
      const response = await this.client.post('/api/auth/login', {
        username: this.config.username,
        password: this.config.password
      });
      this.token = response.data.token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'create_video',
        description: 'Create a new video using Sora AI. Returns a video ID to monitor progress.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Detailed description of the video to create. Include shot type, subject, action, setting, and lighting for best results.'
            },
            model: {
              type: 'string',
              enum: ['sora-2', 'sora-2-pro'],
              description: 'Model to use. sora-2 is faster, sora-2-pro is higher quality.',
              default: 'sora-2'
            },
            size: {
              type: 'string',
              enum: ['1280x720', '1920x1080', '720x1280', '1080x1920'],
              description: 'Video resolution',
              default: '1280x720'
            },
            seconds: {
              type: 'string',
              enum: ['4', '8', '12'],
              description: 'Video duration in seconds',
              default: '8'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'get_video_status',
        description: 'Check the status and progress of a video generation job.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'The video ID returned from create_video'
            }
          },
          required: ['video_id']
        }
      },
      {
        name: 'list_videos',
        description: 'List all videos created by the authenticated user.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of videos to return',
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
              default: 0
            }
          }
        }
      },
      {
        name: 'get_video_screenshots',
        description: 'Extract screenshots from a completed video. Useful for agents to "see" the video content.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'The video ID to extract frames from'
            },
            count: {
              type: 'number',
              description: 'Number of screenshots to extract (1-10). Last screenshot will always be the final frame.',
              minimum: 1,
              maximum: 10,
              default: 3
            }
          },
          required: ['video_id']
        }
      },
      {
        name: 'remix_video',
        description: 'Remix an existing video with targeted changes while preserving composition.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video to remix'
            },
            prompt: {
              type: 'string',
              description: 'Description of the change to make. Keep it focused on a single adjustment.'
            }
          },
          required: ['video_id', 'prompt']
        }
      },
      {
        name: 'continue_from_video',
        description: 'Create a new video that continues from the last frame of an existing video.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'ID of the video to continue from'
            },
            prompt: {
              type: 'string',
              description: 'What happens next in the sequence'
            },
            model: {
              type: 'string',
              enum: ['sora-2', 'sora-2-pro'],
              description: 'Model for the continuation (defaults to original video\'s model)'
            },
            seconds: {
              type: 'string',
              enum: ['4', '8', '12'],
              description: 'Duration (defaults to original video\'s duration)'
            }
          },
          required: ['video_id', 'prompt']
        }
      },
      {
        name: 'get_cost_stats',
        description: 'Get cost statistics for the authenticated user and platform total.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  private async extractVideoFrames(videoPath: string, count: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const framePaths: string[] = [];
      const timestamps: string[] = [];
      
      // Calculate timestamps
      if (count === 1) {
        timestamps.push('99%'); // Last frame only
      } else {
        // Distribute evenly, ensure last one is final frame
        for (let i = 0; i < count - 1; i++) {
          const percent = (i / (count - 1)) * 100;
          timestamps.push(`${percent.toFixed(0)}%`);
        }
        timestamps.push('99%'); // Final frame
      }

      let processedCount = 0;

      timestamps.forEach((timestamp, index) => {
        const filename = `frame_${index}.jpg`;
        const outputPath = join(this.tempDir, filename);
        
        ffmpeg(videoPath)
          .screenshots({
            count: 1,
            filename,
            folder: this.tempDir,
            timestamps: [timestamp]
          })
          .on('end', () => {
            framePaths.push(outputPath);
            processedCount++;
            if (processedCount === timestamps.length) {
              resolve(framePaths.sort());
            }
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    });
  }

  private async downloadVideo(videoId: string): Promise<string> {
    const response = await this.client.get(`/api/videos/${videoId}/content?variant=video`, {
      responseType: 'stream'
    });

    const videoPath = join(this.tempDir, `${videoId}.mp4`);
    const writer = require('fs').createWriteStream(videoPath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', () => resolve(videoPath));
      writer.on('error', reject);
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      await this.authenticate();

      const { name, arguments: args } = request.params;
      
      if (!args) {
        throw new Error('No arguments provided');
      }

      try {
        switch (name) {
          case 'create_video': {
            const response = await this.client.post('/api/videos', {
              prompt: (args as any).prompt,
              model: (args as any).model || 'sora-2',
              size: (args as any).size || '1280x720',
              seconds: (args as any).seconds || '8'
            });

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  video_id: response.data.id,
                  openai_video_id: response.data.openai_video_id,
                  status: response.data.status,
                  cost: response.data.cost,
                  message: `Video generation started. Use get_video_status with video_id: ${response.data.id} to check progress.`
                }, null, 2)
              }]
            };
          }

          case 'get_video_status': {
            const response = await this.client.get(`/api/videos/${(args as any).video_id}`);
            const video = response.data;

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  video_id: video.id,
                  status: video.status,
                  progress: video.progress,
                  prompt: video.prompt,
                  model: video.model,
                  size: video.size,
                  seconds: video.seconds,
                  cost: video.cost,
                  completed: video.status === 'completed',
                  error: video.error_message
                }, null, 2)
              }]
            };
          }

          case 'list_videos': {
            const response = await this.client.get('/api/videos', {
              params: {
                limit: (args as any).limit || 20,
                offset: (args as any).offset || 0
              }
            });

            const videos = response.data.videos.map((v: any) => ({
              id: v.id,
              prompt: v.prompt,
              status: v.status,
              progress: v.progress,
              model: v.model,
              cost: v.cost,
              created_at: new Date(v.created_at * 1000).toISOString()
            }));

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  videos,
                  count: videos.length
                }, null, 2)
              }]
            };
          }

          case 'get_video_screenshots': {
            const videoResponse = await this.client.get(`/api/videos/${(args as any).video_id}`);
            const video = videoResponse.data;

            if (video.status !== 'completed') {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    error: `Video is not completed yet. Status: ${video.status}, Progress: ${video.progress}%`
                  }, null, 2)
                }]
              };
            }

            // Download video
            const videoPath = await this.downloadVideo((args as any).video_id);

            // Extract frames
            const count = Math.min(Math.max((args as any).count || 3, 1), 10);
            const framePaths = await this.extractVideoFrames(videoPath, count);

            // Read frames as base64
            const fs = await import('fs/promises');
            const frames = await Promise.all(
              framePaths.map(async (path, index) => {
                const data = await fs.readFile(path);
                return {
                  frame_number: index + 1,
                  is_final_frame: index === framePaths.length - 1,
                  data: data.toString('base64'),
                  mimeType: 'image/jpeg'
                };
              })
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    video_id: (args as any).video_id,
                    prompt: video.prompt,
                    frame_count: frames.length,
                    frames: frames.map(f => ({
                      frame_number: f.frame_number,
                      is_final_frame: f.is_final_frame
                    }))
                  }, null, 2)
                },
                ...frames.map(frame => ({
                  type: 'image' as const,
                  data: frame.data,
                  mimeType: frame.mimeType
                }))
              ]
            };
          }

          case 'remix_video': {
            const response = await this.client.post(`/api/videos/${(args as any).video_id}/remix`, {
              prompt: (args as any).prompt
            });

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  video_id: response.data.id,
                  original_video_id: (args as any).video_id,
                  status: response.data.status,
                  message: `Remix started. Use get_video_status with video_id: ${response.data.id}`
                }, null, 2)
              }]
            };
          }

          case 'continue_from_video': {
            const response = await this.client.post(`/api/videos/${(args as any).video_id}/continue`, {
              prompt: (args as any).prompt,
              model: (args as any).model,
              seconds: (args as any).seconds
            });

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  video_id: response.data.id,
                  continued_from: (args as any).video_id,
                  status: response.data.status,
                  message: `Continuation video started. Use get_video_status with video_id: ${response.data.id}`
                }, null, 2)
              }]
            };
          }

          case 'get_cost_stats': {
            const response = await this.client.get('/api/videos/stats/costs');
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  your_spending: `$${response.data.user_total.toFixed(2)}`,
                  your_video_count: response.data.user_count,
                  platform_total: `$${response.data.platform_total.toFixed(2)}`,
                  platform_video_count: response.data.platform_count
                }, null, 2)
              }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: error.message || 'Unknown error occurred',
              details: error.response?.data || error.toString()
            }, null, 2)
          }],
          isError: true
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Sora2 MCP Server running on stdio');
    console.error(`Connected to: ${this.config.baseUrl}`);
  }
}

// Configuration from environment variables
const config: Sora2Config = {
  baseUrl: process.env.SORA2_BASE_URL || 'http://localhost:3000',
  username: process.env.SORA2_USERNAME || 'admin',
  password: process.env.SORA2_PASSWORD || 'admin'
};

const server = new Sora2MCPServer(config);
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

