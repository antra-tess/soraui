import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY not found in .env');
  process.exit(1);
}

async function testVeoExtension() {
  const client = new GoogleGenAI({});

  console.log('🎬 Step 1: Creating initial video...');
  
  // Create a simple initial video
  let operation = await client.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: 'A red ball rolls slowly across a white table from left to right.',
    config: {
      aspectRatio: '16:9',
      durationSeconds: 4,
    },
  });

  console.log('Initial video operation:', operation.name);
  console.log('Waiting for initial video to complete...');

  // Poll until done
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    operation = await client.operations.getVideosOperation({ operation });
    console.log('  Status:', operation.done ? 'DONE' : 'IN PROGRESS');
  }

  if (!operation.response?.generatedVideos?.[0]?.video) {
    console.error('❌ No video in response');
    return;
  }

  const initialVideo = operation.response.generatedVideos[0].video;
  console.log('✅ Initial video complete:', initialVideo);

  // Download initial video to check
  const initialVideoData = await fetch(`${initialVideo.uri}?key=${GOOGLE_API_KEY}`).then(r => r.arrayBuffer());
  writeFileSync('test-initial.mp4', Buffer.from(initialVideoData));
  console.log(`✅ Initial video saved: test-initial.mp4 (${initialVideoData.byteLength} bytes)`);

  console.log('\n🎬 Step 2: Extending the video...');
  
  // Now extend using the Veo docs pattern
  const extensionOperation = await client.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    video: initialVideo, // Pass the video object directly from generation response
    prompt: 'The ball falls off the edge of the table.',
    config: {
      durationSeconds: 4,
    },
  } as any);

  console.log('Extension operation:', extensionOperation.name);
  console.log('Waiting for extension to complete...');

  // Poll extension
  let extOp = extensionOperation;
  while (!extOp.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    extOp = await client.operations.getVideosOperation({ operation: extOp });
    console.log('  Status:', extOp.done ? 'DONE' : 'IN PROGRESS');
  }

  if (!extOp.response?.generatedVideos?.[0]?.video) {
    console.error('❌ No extension video in response');
    return;
  }

  const extendedVideo = extOp.response.generatedVideos[0].video;
  console.log('✅ Extension complete:', extendedVideo);

  // Download extended video
  const extendedVideoData = await fetch(`${extendedVideo.uri}?key=${GOOGLE_API_KEY}`).then(r => r.arrayBuffer());
  writeFileSync('test-extended.mp4', Buffer.from(extendedVideoData));
  console.log(`✅ Extended video saved: test-extended.mp4 (${extendedVideoData.byteLength} bytes)`);

  console.log('\n📊 Results:');
  console.log(`Initial video: ${initialVideoData.byteLength} bytes`);
  console.log(`Extended video: ${extendedVideoData.byteLength} bytes`);
  console.log(`Expected if combined: ~${initialVideoData.byteLength * 2} bytes`);
  console.log(`\nIf extended video is ~2x initial, it's combined.`);
  console.log(`If extended video is similar size, it's just the new segment.`);
}

testVeoExtension().catch(console.error);

