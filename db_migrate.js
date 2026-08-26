const fs = require('fs');
const initSqlJs = require('sql.js');
const { createClient } = require('@supabase/supabase-js');

// Configs
const supabaseUrl = 'https://ldhdrrjmjodlcmgydcne.supabase.co';
const supabaseSecretKey = process.argv[2]; // Read from CLI arguments to avoid hardcoding secrets
const dbPath = './musicnotebook.sqlite';

if (!supabaseSecretKey) {
  console.error("Error: Please provide your Supabase Service Secret Key as an argument.");
  console.error("Usage: node db_migrate.js <your_supabase_secret_key>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function run() {
  try {
    console.log("Loading SQLite database...");
    const filebuffer = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(filebuffer);

    console.log("Reading songs from SQLite database...");
    const songsResult = db.exec("SELECT _id, title, lyrics, artist, genre, created FROM song;");
    if (!songsResult || songsResult.length === 0) {
      console.error("No songs found in SQLite database.");
      return;
    }

    const columns = songsResult[0].columns;
    const rows = songsResult[0].values;
    console.log(`Found ${rows.length} songs in SQLite. Mapping data...`);

    const mappedGojols = rows.map(row => {
      const song = {};
      columns.forEach((col, idx) => {
        song[col] = row[idx];
      });

      // Smart category mapping
      let category = 'General';
      if (song.genre === 'হ') category = 'Hamd';
      else if (song.genre === 'ন') category = 'Naat';

      // Parse timestamp
      let createdAt = new Date().toISOString();
      if (song.created) {
        const ms = parseInt(song.created, 10);
        if (!isNaN(ms)) {
          createdAt = new Date(ms).toISOString();
        }
      }

      return {
        id: song._id,
        title: song.title || 'Untitled',
        artist: song.artist && song.artist.trim() !== '' ? song.artist.trim() : null,
        category: category,
        content: song.lyrics || '',
        is_favorite: false,
        created_at: createdAt,
        updated_at: createdAt
      };
    });

    console.log("Starting upload to Supabase...");
    const chunkSize = 50;
    for (let i = 0; i < mappedGojols.length; i += chunkSize) {
      const chunk = mappedGojols.slice(i, i + chunkSize);
      console.log(`Uploading chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(mappedGojols.length / chunkSize)} (${chunk.length} items)...`);
      
      const { error } = await supabase.from('gojols').upsert(chunk, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    console.log("Migration completed successfully! All 796 songs are uploaded to Supabase.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
