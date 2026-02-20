import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { runMigrations, seedDefaultActivities } from '../../src/main/db/migrations';

// We need to mock the database module before importing routes
let db: Database.Database;
let app: express.Express;

// Setup: Create in-memory DB and routes
beforeAll(async () => {
    db = new Database(':memory:');
    runMigrations(db);
    seedDefaultActivities(db);

    // Mock the getDatabase function
    const { vi } = await import('vitest');
    vi.doMock('../../src/main/db/database', () => ({
        getDatabase: () => db,
        initDatabase: () => db,
        closeDatabase: () => { },
    }));

    // Import routes after mock
    const { createRoutes } = await import('../../src/main/api/routes');
    app = express();
    app.use(express.json());
    app.use('/', createRoutes());
});

afterAll(() => {
    db.close();
});

describe('API Routes', () => {
    it('GET /activities returns seeded activities', async () => {
        const res = await request(app).get('/activities');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(7);
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('icon');
    });

    it('POST /activities creates a new activity', async () => {
        const res = await request(app)
            .post('/activities')
            .send({ name: 'Meditation', category: 'fitness', icon: '🧘', color: '#8338EC' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('ok');
    });

    it('POST /activities rejects duplicates', async () => {
        const res = await request(app)
            .post('/activities')
            .send({ name: 'Meditation', category: 'fitness' });
        expect(res.status).toBe(400);
    });

    it('POST /log creates an activity log', async () => {
        const acts = await request(app).get('/activities');
        const actId = acts.body[0].id;

        const res = await request(app)
            .post('/log')
            .send({ activity_id: actId, minutes: 30, source: 'manual' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('POST /log rejects zero minutes', async () => {
        const acts = await request(app).get('/activities');
        const actId = acts.body[0].id;

        const res = await request(app)
            .post('/log')
            .send({ activity_id: actId, minutes: 0 });
        expect(res.status).toBe(400);
    });

    it('GET /logs returns logged activities', async () => {
        const res = await request(app).get('/logs');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /dashboard returns summary data', async () => {
        const res = await request(app).get('/dashboard');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('today_minutes');
        expect(res.body).toHaveProperty('week_minutes');
        expect(res.body).toHaveProperty('current_streak');
        expect(res.body).toHaveProperty('activities');
    });

    it('GET /chart returns chart data', async () => {
        const res = await request(app).get('/chart?range=weekly');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('points');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('average');
    });

    it('GET /heatmap returns heatmap data', async () => {
        const res = await request(app).get('/heatmap');
        expect(res.status).toBe(200);
        expect(typeof res.body).toBe('object');
    });

    it('GET /activity-stats/:id returns stats', async () => {
        const acts = await request(app).get('/activities');
        const actId = acts.body[0].id;

        const res = await request(app).get(`/activity-stats/${actId}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total_minutes');
        expect(res.body).toHaveProperty('total_sessions');
        expect(res.body).toHaveProperty('current_streak');
    });
});
