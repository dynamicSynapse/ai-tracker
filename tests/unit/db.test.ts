import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations, seedDefaultActivities } from '../../src/main/db/migrations';

let db: Database.Database;

beforeAll(() => {
    db = new Database(':memory:');
    runMigrations(db);
    seedDefaultActivities(db);
});

afterAll(() => {
    db.close();
});

describe('Database Schema & Migrations', () => {
    it('creates all required tables', () => {
        const tables = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        ).all() as { name: string }[];

        const names = tables.map(t => t.name);
        expect(names).toContain('activities');
        expect(names).toContain('activity_logs');
        expect(names).toContain('settings');
    });

    it('activities table has correct columns', () => {
        const cols = db.prepare('PRAGMA table_info(activities)').all() as { name: string }[];
        const colNames = cols.map(c => c.name);
        expect(colNames).toEqual(
            expect.arrayContaining(['id', 'name', 'category', 'icon', 'color', 'daily_target_minutes', 'is_archived', 'created_at']),
        );
    });

    it('activity_logs table has correct columns', () => {
        const cols = db.prepare('PRAGMA table_info(activity_logs)').all() as { name: string }[];
        const colNames = cols.map(c => c.name);
        expect(colNames).toEqual(
            expect.arrayContaining(['id', 'activity_id', 'minutes', 'notes', 'source', 'logged_at']),
        );
    });

    it('seeds default activities', () => {
        const activities = db.prepare('SELECT * FROM activities').all() as { name: string }[];
        expect(activities.length).toBeGreaterThanOrEqual(7);
        const names = activities.map(a => a.name);
        expect(names).toContain('Gym');
        expect(names).toContain('Current Affairs');
        expect(names).toContain('Prelims Test');
    });

    it('can insert and retrieve an activity', () => {
        db.prepare('INSERT INTO activities (name, category) VALUES (?, ?)').run('Swimming', 'fitness');
        const act = db.prepare("SELECT * FROM activities WHERE name = 'Swimming'").get() as { name: string; category: string };
        expect(act.name).toBe('Swimming');
        expect(act.category).toBe('fitness');
    });

    it('enforces unique name constraint on activities', () => {
        expect(() => {
            db.prepare('INSERT INTO activities (name, category) VALUES (?, ?)').run('Gym', 'fitness');
        }).toThrow();
    });

    it('can log activity with positive minutes', () => {
        const act = db.prepare('SELECT id FROM activities LIMIT 1').get() as { id: number };
        const result = db.prepare(
            'INSERT INTO activity_logs (activity_id, minutes, source) VALUES (?, ?, ?)',
        ).run(act.id, 30, 'manual');
        expect(result.lastInsertRowid).toBeGreaterThan(0);
    });

    it('rejects activity logs with zero or negative minutes', () => {
        const act = db.prepare('SELECT id FROM activities LIMIT 1').get() as { id: number };
        expect(() => {
            db.prepare('INSERT INTO activity_logs (activity_id, minutes) VALUES (?, ?)').run(act.id, 0);
        }).toThrow();
        expect(() => {
            db.prepare('INSERT INTO activity_logs (activity_id, minutes) VALUES (?, ?)').run(act.id, -10);
        }).toThrow();
    });

    it('can store and retrieve settings', () => {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('test_key', 'test_val');
        const s = db.prepare("SELECT value FROM settings WHERE key = 'test_key'").get() as { value: string };
        expect(s.value).toBe('test_val');
    });

    it('can query activity logs with join', () => {
        const act = db.prepare('SELECT id FROM activities LIMIT 1').get() as { id: number };
        db.prepare('INSERT INTO activity_logs (activity_id, minutes, notes, source) VALUES (?, ?, ?, ?)').run(act.id, 45, 'test notes', 'pomodoro');

        const logs = db.prepare(
            `SELECT l.*, a.name as activity_name, a.icon as activity_icon
             FROM activity_logs l JOIN activities a ON l.activity_id = a.id
             ORDER BY l.logged_at DESC LIMIT 5`,
        ).all() as { activity_name: string; minutes: number; source: string }[];

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].activity_name).toBeTruthy();
    });
});
