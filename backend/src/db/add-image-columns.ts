import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const isProduction = process.env.NODE_ENV === 'production';
const storageBase = isProduction ? '/app/storage' : './storage';
const DATABASE_PATH = process.env.DATABASE_PATH || `${storageBase}/data/sora.db`;

console.log('🔄 Adding image columns to database...');
console.log(`📂 Database path: ${DATABASE_PATH}`);

if (!existsSync(DATABASE_PATH)) {
  console.error('❌ Database file not found!');
  process.exit(1);
}

async function addImageColumns() {
  const SQL = await initSqlJs();
  const dbBuffer = readFileSync(DATABASE_PATH);
  const db = new SQL.Database(dbBuffer);

  try {
    db.run('BEGIN TRANSACTION');

    console.log('\n1️⃣ Checking for image columns...');
    const tableInfo = db.exec("PRAGMA table_info(videos)")[0];
    const columnNames = tableInfo?.values.map((row: any) => row[1]) || [];
    
    console.log('Current columns:', columnNames);

    const hasAudio = columnNames.includes('has_audio');
    const hasRefImages = columnNames.includes('reference_image_paths');

    if (hasAudio && hasRefImages) {
      console.log('✅ Image columns already exist!');
      db.run('ROLLBACK');
      return;
    }

    console.log('\n2️⃣ Adding missing columns...');

    if (!hasAudio) {
      db.run('ALTER TABLE videos ADD COLUMN has_audio INTEGER DEFAULT 0');
      console.log('✅ Added has_audio column');
    }

    if (!hasRefImages) {
      db.run('ALTER TABLE videos ADD COLUMN reference_image_paths TEXT');
      console.log('✅ Added reference_image_paths column');
    }

    db.run('COMMIT');
    
    // Save the database
    const data = db.export();
    writeFileSync(DATABASE_PATH, data);
    
    console.log('\n✅ Image columns added successfully!');

  } catch (error) {
    console.error('\n❌ Failed to add columns:', error);
    db.run('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

addImageColumns().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

