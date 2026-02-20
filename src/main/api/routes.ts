import { Router, Request, Response } from 'express';
import {
    createActivity,
    getActivities,
    logActivity,
    getActivityLogs,
    getDashboardData,
    getChartData,
    getHeatmapData,
    getActivityStats,
} from '../db/queries';

export function createRoutes(): Router {
    const router = Router();

    // Activities
    router.get('/activities', (_req: Request, res: Response) => {
        res.json(getActivities());
    });

    router.post('/activities', (req: Request, res: Response) => {
        try {
            const id = createActivity(req.body);
            res.json({ id, status: 'ok' });
        } catch (err) {
            res.status(400).json({ error: (err as Error).message });
        }
    });

    // Logging
    router.post('/log', (req: Request, res: Response) => {
        try {
            const id = logActivity(req.body);
            res.json({ id, status: 'ok' });
        } catch (err) {
            res.status(400).json({ error: (err as Error).message });
        }
    });

    router.get('/logs', (req: Request, res: Response) => {
        const filter = {
            activity_id: req.query.activity_id ? Number(req.query.activity_id) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
        };
        res.json(getActivityLogs(filter));
    });

    // Dashboard
    router.get('/dashboard', (_req: Request, res: Response) => {
        res.json(getDashboardData());
    });

    // Charts
    router.get('/chart', (req: Request, res: Response) => {
        const range = (req.query.range as string) || 'weekly';
        const activityId = req.query.activity_id ? Number(req.query.activity_id) : undefined;
        res.json(getChartData(range as any, activityId));
    });

    // Heatmap
    router.get('/heatmap', (req: Request, res: Response) => {
        const activityId = req.query.activity_id ? Number(req.query.activity_id) : undefined;
        res.json(getHeatmapData(activityId));
    });

    // Activity stats
    router.get('/activity-stats/:id', (req: Request, res: Response) => {
        res.json(getActivityStats(Number(req.params.id)));
    });

    return router;
}
