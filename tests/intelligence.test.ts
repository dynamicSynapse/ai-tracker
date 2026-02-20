import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabase, initializeDatabase } from '../src/main/db';
import { logActivity, getEnergyCurve, getBurnoutRisk, getBrainLoad } from '../src/main/db/queries';

describe('Intelligence Features', () => {
    beforeAll(() => {
        initializeDatabase(':memory:');
    });

    afterAll(() => {
        closeDatabase();
    });

    it('calculates energy curve correctly', () => {
        // Log entries at specific hours
        logActivity({ activity_id: 1, minutes: 25, focus_rating: 5, energy_after: 4 }); // Hour will be current hour

        const curve = getEnergyCurve();
        expect(curve).toBeDefined();
        expect(curve.length).toBe(24);
        // Find the hour we just logged in
        const currentHour = new Date().getHours();
        const point = curve.find(p => p.hour === currentHour);

        expect(point).toBeDefined();
        if (point) {
            expect(point.avg_focus).toBeGreaterThan(0);
            expect(point.avg_energy).toBeGreaterThan(0);
        }
    });

    it('calculates burnout risk', () => {
        const risk = getBurnoutRisk();
        expect(risk).toHaveProperty('risk_level');
        expect(risk).toHaveProperty('risk_score');
        expect(risk).toHaveProperty('factors');
    });

    it('calculates brain load', () => {
        const load = getBrainLoad();
        expect(load).toHaveProperty('current_load');
        expect(load).toHaveProperty('status');
        expect(load).toHaveProperty('suggestion');
    });
});
