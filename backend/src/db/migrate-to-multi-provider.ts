import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const isProduction = process.env.NODE_ENV === 'production';
const storageBase = isProduction ? '/app/storage' : './storage';
const DATABASE_PATH = process.env.DATABASE_PATH || `${storageBase}/data/sora.db`;

console.log('🔄 Starting multi-provider database migration...');
console.log(`📂 Database path: ${DATABASE_PATH}`);

if (!existsSync(DATABASE_PATH)) {
  console.error('❌ Database file not found!');
  process.exit(1);
}

async function migrate() {
  const SQL = await initSqlJs();
  const dbBuffer = readFileSync(DATABASE_PATH);
  const db = new SQL.Database(dbBuffer);

  try {
    // Start transaction
    db.run('BEGIN TRANSACTION');

    console.log('\n1️⃣ Checking current schema...');
    const tableInfo = db.exec("PRAGMA table_info(videos)")[0];
    const columnNames = tableInfo?.values.map((row: any) => row[1]) || [];
    
    console.log('Current columns:', columnNames);

    const hasProvider = columnNames.includes('provider');
    const hasProviderVideoId = columnNames.includes('provider_video_id');

    if (hasProvider && hasProviderVideoId) {
      console.log('✅ Schema already migrated!');
      db.run('ROLLBACK');
      return;
    }

    console.log('\n2️⃣ Creating new table with provider support...');
    
    // Create new table with updated schema
    db.run(`
      CREATE TABLE videos_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'sora',
        provider_video_id TEXT NOT NULL,
        openai_video_id TEXT,
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
        remix_of TEXT,
        cost REAL DEFAULT 0,
        FOREIGN KEY (remix_of) REFERENCES videos_new(id)
      )
    `);
    console.log('✅ Created new table with provider support');

    console.log('\n3️⃣ Migrating existing data...');
    
    // Copy all data from old table to new table
    db.run(`
      INSERT INTO videos_new (
        id, user_id, provider, provider_video_id, openai_video_id,
        prompt, model, size, seconds, status, progress,
        created_at, completed_at, file_path, thumbnail_path,
        error_message, has_input_reference, has_audio, reference_image_paths, remix_of, cost
      )
      SELECT 
        id, user_id, 'sora', openai_video_id, openai_video_id,
        prompt, model, size, seconds, status, progress,
        created_at, completed_at, file_path, thumbnail_path,
        error_message, has_input_reference, 0, NULL, remix_of, cost
      FROM videos
    `);

    console.log(`✅ Migrated all videos to new table`);

    console.log('\n4️⃣ Swapping tables...');
    
    // Drop old table
    db.run('DROP TABLE videos');
    console.log('✅ Dropped old table');
    
    // Rename new table
    db.run('ALTER TABLE videos_new RENAME TO videos');
    console.log('✅ Renamed new table');

    // Recreate indexes
    db.run('CREATE INDEX idx_videos_user_id ON videos(user_id)');
    db.run('CREATE INDEX idx_videos_status ON videos(status)');
    db.run('CREATE INDEX idx_videos_created_at ON videos(created_at)');
    console.log('✅ Recreated indexes');

    console.log('\n5️⃣ Verifying migration...');
    
    const sampleResult = db.exec(`
      SELECT id, provider, provider_video_id, openai_video_id, model 
      FROM videos 
      LIMIT 3
    `)[0];

    if (sampleResult) {
      console.log('Sample migrated videos:');
      console.table(sampleResult.values.map((row: any) => ({
        id: row[0],
        provider: row[1],
        provider_video_id: row[2],
        openai_video_id: row[3],
        model: row[4]
      })));
    }

    // Commit transaction
    db.run('COMMIT');
    
    // Save the database
    const data = db.export();
    writeFileSync(DATABASE_PATH, data);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Final statistics:');
    
    const statsResult = db.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN provider = 'sora' THEN 1 ELSE 0 END) as sora_count,
        SUM(CASE WHEN provider = 'veo' THEN 1 ELSE 0 END) as veo_count
      FROM videos
    `)[0];

    if (statsResult) {
      console.table([{
        total: statsResult.values[0][0],
        sora_count: statsResult.values[0][1],
        veo_count: statsResult.values[0][2]
      }]);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('Rolling back changes...');
    db.run('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

// Run the migration
migrate().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});

