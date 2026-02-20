import express from 'express';
import cors from 'cors';
import { createRoutes } from './routes';

let server: ReturnType<typeof express.application.listen> | null = null;
let expressApp: express.Express | null = null;

export function createServer(): express.Express {
    const app = express();

    app.use(cors({ origin: /^https?:\/\/(localhost|127\.0\.0\.1)/ }));
    app.use(express.json({ limit: '1mb' }));

    app.use('/', createRoutes());

    expressApp = app;
    return app;
}

export function startServer(port: number = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!expressApp) {
            createServer();
        }
        try {
            server = expressApp!.listen(port, '127.0.0.1', () => {
                console.log(`[API] Server listening on http://127.0.0.1:${port}`);
                resolve();
            });
            server.on('error', reject);
        } catch (err) {
            reject(err);
        }
    });
}

export function stopServer(): Promise<void> {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                server = null;
                console.log('[API] Server stopped');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

export function isServerRunning(): boolean {
    return server !== null && server.listening;
}

export function getExpressApp(): express.Express | null {
    return expressApp;
}
