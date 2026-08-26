import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { supabase } from './supabaseClient';
import { Gojol, GojolInput } from './types';

interface GojolContextType {
  refreshKey: number;
  refreshDb: () => void;
  getGojols: (search?: string, category?: string, favoritesOnly?: boolean, approvedOnly?: boolean) => Promise<Gojol[]>;
  getGojolById: (id: number) => Promise<Gojol | null>;
  addGojol: (gojol: GojolInput) => Promise<void>;
  updateGojol: (id: number, gojol: Partial<GojolInput>) => Promise<void>;
  deleteGojol: (id: number) => Promise<void>;
  toggleFavorite: (id: number, isFavorite: boolean) => Promise<void>;
  approveGojol: (id: number) => Promise<void>;
  isAdmin: boolean;
  authenticateAdmin: (passcode: string) => boolean;
  logoutAdmin: () => void;
  syncData: () => Promise<void>;
  exportDatabase: () => Promise<string>;
  importDatabase: (jsonString: string) => Promise<{ success: boolean; count: number }>;
}

const GojolContext = createContext<GojolContextType | null>(null);

// Helper to check connection to Supabase
async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
      }
    });
    return res.status === 200 || res.status === 401;
  } catch (e) {
    return false;
  }
}

export async function initializeDatabase(db: any) {
  // Create tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS gojols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Safe migration to add is_approved column if it doesn't exist in local SQLite
  try {
    await db.execAsync(`ALTER TABLE gojols ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 0;`);
    console.log("Migration: Added is_approved column to SQLite.");
  } catch (e) {
    // Ignore error if column already exists
  }

  // One-time migration to approve all existing local songs
  try {
    const migrationDone = await db.getFirstAsync(
      "SELECT value FROM sync_metadata WHERE key = 'approve_existing_migration'"
    );
    if (!migrationDone) {
      await db.runAsync('UPDATE gojols SET is_approved = 1');
      await db.runAsync(
        "INSERT INTO sync_metadata (key, value) VALUES ('approve_existing_migration', 'done')"
      );
      console.log("Migration: Approved all existing local songs.");
    }
  } catch (e) {
    console.error("Migration 'approve_existing_migration' failed:", e);
  }
}

function GojolProviderInner({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshDb = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const authenticateAdmin = useCallback((passcode: string): boolean => {
    const correctPasscode = process.env.EXPO_PUBLIC_ADMIN_PASSCODE || '@Admin123';
    console.log(`[Admin Auth] Entered: "${passcode}", Expected: "${correctPasscode}"`);
    if (passcode === correctPasscode) {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  // Background Sync Engine
  const syncData = useCallback(async () => {
    const online = await isOnline();
    if (!online) {
      console.log("App is offline, skipping sync.");
      return;
    }

    try {
      console.log("Starting database sync...");

      // 1. PUSH local changes to Supabase (where synced = 0)
      const unsynced = await db.getAllAsync<any>(
        'SELECT * FROM gojols WHERE synced = 0'
      );

      for (const row of unsynced) {
        if (row.deleted === 1) {
          // Soft deleted locally, hard delete on Supabase
          const { error } = await supabase.from('gojols').delete().eq('id', row.id);
          if (!error) {
            await db.runAsync('DELETE FROM gojols WHERE id = ?', [row.id]);
          } else {
            console.error(`Failed to push deletion of ID ${row.id}:`, error);
          }
        } else {
          // Inserted or updated locally, upsert to Supabase
          const { error } = await supabase.from('gojols').upsert({
            id: row.id,
            title: row.title,
            artist: row.artist,
            category: row.category,
            content: row.content,
            is_favorite: row.is_favorite === 1,
            is_approved: row.is_approved === 1,
            created_at: row.created_at,
            updated_at: row.updated_at
          });

          if (!error) {
            await db.runAsync(
              'UPDATE gojols SET synced = 1 WHERE id = ?',
              [row.id]
            );
          } else {
            console.error(`Failed to push upsert of ID ${row.id}:`, error);
          }
        }
      }

      // 2. PULL remote changes from Supabase (updated_at > last_sync_time)
      const syncMeta = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM sync_metadata WHERE key = 'last_sync_time'"
      );
      const lastSyncTime = syncMeta ? syncMeta.value : null;

      let query = supabase.from('gojols').select('*');
      if (lastSyncTime) {
        query = query.gt('updated_at', lastSyncTime);
      }

      const { data: remoteData, error: pullError } = await query;
      if (pullError) {
        throw pullError;
      }

      if (remoteData && remoteData.length > 0) {
        console.log(`Pulled ${remoteData.length} changes from Supabase.`);
        for (const item of remoteData) {
          // Check if item exists locally
          const localItem = await db.getFirstAsync<{ id: number; updated_at: string }>(
            'SELECT id, updated_at FROM gojols WHERE id = ?',
            [item.id]
          );

          const isFavoriteVal = item.is_favorite ? 1 : 0;
          const isApprovedVal = item.is_approved ? 1 : 0;

          if (!localItem) {
            // New record from server
            await db.runAsync(
              'INSERT INTO gojols (id, title, artist, category, content, is_favorite, is_approved, created_at, updated_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)',
              [item.id, item.title, item.artist || null, item.category, item.content, isFavoriteVal, isApprovedVal, item.created_at, item.updated_at]
            );
          } else {
            // Existing record, update if remote is newer
            const remoteTime = new Date(item.updated_at).getTime();
            const localTime = new Date(localItem.updated_at).getTime();

            if (remoteTime > localTime) {
              await db.runAsync(
                'UPDATE gojols SET title = ?, artist = ?, category = ?, content = ?, is_favorite = ?, is_approved = ?, created_at = ?, updated_at = ?, synced = 1, deleted = 0 WHERE id = ?',
                [item.title, item.artist || null, item.category, item.content, isFavoriteVal, isApprovedVal, item.created_at, item.updated_at, item.id]
              );
            }
          }
        }
      }

      // 3. Update last sync time
      const currentSyncTime = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO sync_metadata (key, value) VALUES ('last_sync_time', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [currentSyncTime]
      );

      console.log("Database sync completed.");
      refreshDb();
    } catch (e) {
      console.error("Sync error:", e);
    }
  }, [db, refreshDb]);

  // Trigger sync on startup
  useEffect(() => {
    syncData();
  }, [syncData]);

  const getGojols = useCallback(async (search = '', category = 'All', favoritesOnly = false, approvedOnly = true): Promise<Gojol[]> => {
    let query = 'SELECT * FROM gojols WHERE deleted = 0';
    const params: any[] = [];

    // Filter by approval status
    query += ' AND is_approved = ?';
    params.push(approvedOnly ? 1 : 0);

    if (favoritesOnly) {
      query += ' AND is_favorite = 1';
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search.trim()) {
      query += ' AND (title LIKE ? OR artist LIKE ? OR content LIKE ?)';
      const likeParam = `%${search}%`;
      params.push(likeParam, likeParam, likeParam);
    }

    query += ' ORDER BY created_at DESC';

    const results = await db.getAllAsync<Gojol>(query, params);
    return results;
  }, [db]);

  const getGojolById = useCallback(async (id: number): Promise<Gojol | null> => {
    const result = await db.getFirstAsync<Gojol>('SELECT * FROM gojols WHERE id = ? AND deleted = 0', [id]);
    return result;
  }, [db]);

  const addGojol = useCallback(async (gojol: GojolInput): Promise<void> => {
    const now = new Date().toISOString();
    // Default to approved if added in admin mode, else pending
    const approvedVal = isAdmin ? 1 : 0;
    await db.runAsync(
      'INSERT INTO gojols (title, artist, category, content, is_favorite, is_approved, created_at, updated_at, synced, deleted) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, 0)',
      [gojol.title, gojol.artist || null, gojol.category, gojol.content, approvedVal, now, now]
    );
    refreshDb();
    syncData(); // Attempt background sync
  }, [db, refreshDb, syncData, isAdmin]);

  const updateGojol = useCallback(async (id: number, gojol: Partial<GojolInput>): Promise<void> => {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    if (gojol.title !== undefined) {
      fieldsToUpdate.push('title = ?');
      params.push(gojol.title);
    }
    if (gojol.artist !== undefined) {
      fieldsToUpdate.push('artist = ?');
      params.push(gojol.artist || null);
    }
    if (gojol.category !== undefined) {
      fieldsToUpdate.push('category = ?');
      params.push(gojol.category);
    }
    if (gojol.content !== undefined) {
      fieldsToUpdate.push('content = ?');
      params.push(gojol.content);
    }

    if (fieldsToUpdate.length === 0) return;

    // Add metadata for sync
    fieldsToUpdate.push('synced = 0');
    fieldsToUpdate.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);
    await db.runAsync(
      `UPDATE gojols SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      params
    );
    refreshDb();
    syncData(); // Attempt background sync
  }, [db, refreshDb, syncData]);

  const deleteGojol = useCallback(async (id: number): Promise<void> => {
    // Soft delete locally, so we can delete from Supabase on next sync
    await db.runAsync(
      'UPDATE gojols SET deleted = 1, synced = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
    refreshDb();
    syncData(); // Attempt background sync
  }, [db, refreshDb, syncData]);

  const toggleFavorite = useCallback(async (id: number, isFavorite: boolean): Promise<void> => {
    const favValue = isFavorite ? 1 : 0;
    await db.runAsync(
      'UPDATE gojols SET is_favorite = ?, synced = 0, updated_at = ? WHERE id = ?',
      [favValue, new Date().toISOString(), id]
    );
    refreshDb();
    syncData(); // Attempt background sync
  }, [db, refreshDb, syncData]);

  const approveGojol = useCallback(async (id: number): Promise<void> => {
    await db.runAsync(
      'UPDATE gojols SET is_approved = 1, synced = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
    refreshDb();
    syncData(); // Sync to cloud
  }, [db, refreshDb, syncData]);

  const exportDatabase = useCallback(async (): Promise<string> => {
    const all = await db.getAllAsync<Gojol>('SELECT * FROM gojols WHERE deleted = 0');
    return JSON.stringify(all, null, 2);
  }, [db]);

  const importDatabase = useCallback(async (jsonString: string): Promise<{ success: boolean; count: number }> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error("Backup file must contain an array of gojols.");
      }

      console.log(`Importing ${parsed.length} gojols...`);
      let count = 0;
      
      for (const item of parsed) {
        if (!item.title || !item.content) continue; // Basic validation
        
        const now = new Date().toISOString();
        const favVal = item.is_favorite ? 1 : 0;
        const appVal = item.is_approved ? 1 : 0;

        let exists = false;
        if (item.id) {
          const localItem = await db.getFirstAsync<{ id: number }>('SELECT id FROM gojols WHERE id = ?', [item.id]);
          exists = !!localItem;
        }

        if (exists && item.id) {
          // Update
          await db.runAsync(
            'UPDATE gojols SET title = ?, artist = ?, category = ?, content = ?, is_favorite = ?, is_approved = ?, updated_at = ?, synced = 0, deleted = 0 WHERE id = ?',
            [item.title, item.artist || null, item.category || 'General', item.content, favVal, appVal, now, item.id]
          );
        } else {
          // Insert
          await db.runAsync(
            'INSERT INTO gojols (title, artist, category, content, is_favorite, is_approved, created_at, updated_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)',
            [item.title, item.artist || null, item.category || 'General', item.content, favVal, appVal, item.created_at || now, now]
          );
        }
        count++;
      }
      
      refreshDb();
      syncData(); // Trigger background sync to upload imported items to Supabase
      return { success: true, count };
    } catch (e) {
      console.error("Failed to import database:", e);
      throw e;
    }
  }, [db, refreshDb, syncData]);

  return (
    <GojolContext.Provider value={{
      refreshKey,
      refreshDb,
      getGojols,
      getGojolById,
      addGojol,
      updateGojol,
      deleteGojol,
      toggleFavorite,
      approveGojol,
      isAdmin,
      authenticateAdmin,
      logoutAdmin,
      syncData,
      exportDatabase,
      importDatabase
    }}>
      {children}
    </GojolContext.Provider>
  );
}

export function GojolDatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="gojols.db" onInit={initializeDatabase}>
      <GojolProviderInner>{children}</GojolProviderInner>
    </SQLiteProvider>
  );
}

export function useGojolDb() {
  const context = useContext(GojolContext);
  if (!context) {
    throw new Error('useGojolDb must be used within a GojolDatabaseProvider');
  }
  return context;
}
