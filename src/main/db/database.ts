import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

function getDbPath(): string {
    // Check for portable mode
    const exeDir = path.dirname(process.execPath);
    const portableFlag = path.join(exeDir, 'portable.flag');

    if (fs.existsSync(portableFlag)) {
        const dbDir = path.join(exeDir, 'data');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        return path.join(dbDir, 'tracker.db');
    }

    // Standard mode: use %APPDATA%
    const appDataDir = path.join(app.getPath('appData'), 'ai-study-tracker');
    if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
    return path.join(appDataDir, 'tracker.db');
}

export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

export function initDatabase(customPath?: string): Database.Database {
    const dbPath = customPath || getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    return db;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}
