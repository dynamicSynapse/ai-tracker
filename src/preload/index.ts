import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
    // Activities
    createActivity: (input: { name: string; category: string; icon?: string; color?: string; daily_target_minutes?: number }) => Promise<{ id: number; status: string }>;
    getActivities: (includeArchived?: boolean) => Promise<unknown[]>;
    updateActivity: (id: number, input: Record<string, unknown>) => Promise<{ status: string }>;
    archiveActivity: (id: number, archived: boolean) => Promise<{ status: string }>;
    deleteActivity: (id: number) => Promise<{ status: string }>;

    // Activity Logs
    logActivity: (input: { activity_id: number; minutes: number; notes?: string; source?: string }) => Promise<{ id: number; status: string }>;
    getActivityLogs: (filter?: { activity_id?: number; limit?: number; from?: string; to?: string }) => Promise<unknown[]>;

    // Dashboard
    getDashboard: () => Promise<unknown>;

    // Charts / Analytics
    getChartData: (range: string, activityId?: number) => Promise<unknown>;
    getHeatmap: (activityId?: number) => Promise<Record<string, number>>;
    getActivityStats: (activityId: number) => Promise<unknown>;

    // AI Insights
    getAIInsights: () => Promise<{ summary: string; error?: string }>;

    // Settings
    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<{ status: string }>;

    // Timetable
    getTimetable: (day?: number) => Promise<unknown[]>;
    upsertTimetableSlot: (input: Record<string, unknown>) => Promise<{ id: number; status: string }>;
    deleteTimetableSlot: (id: number) => Promise<{ status: string }>;
    getTimetableAdherence: (date?: string) => Promise<unknown>;
    getWeeklyAdherence: () => Promise<unknown[]>;
    analyzeSchedule: () => Promise<{ summary: string; error?: string }>;
    autoSchedule: () => Promise<{ summary: string; slots: any[]; error?: string }>;
    getBurnoutRisk: () => Promise<unknown>;
    getBrainLoad: () => Promise<unknown>;
    getTopicDistribution: (days?: number) => Promise<unknown[]>;

    // Test Scores
    addTestScore: (input: Record<string, unknown>) => Promise<{ id: number; status: string }>;
    getTestScores: (filter?: Record<string, unknown>) => Promise<unknown[]>;
    updateTestScore: (id: number, input: Record<string, unknown>) => Promise<{ status: string }>;
    deleteTestScore: (id: number) => Promise<{ status: string }>;
    getTestTrends: (testType?: string, subject?: string) => Promise<unknown[]>;
    getTestSummary: (testType?: string) => Promise<unknown>;
    analyzeTestPerformance: (testType?: string) => Promise<{ summary: string; error?: string }>;

    // Diary
    upsertDiary: (input: Record<string, unknown>) => Promise<number>;
    getDiary: (date: string) => Promise<unknown | null>;
    getDiaryEntries: (limit?: number) => Promise<unknown[]>;
    getDiaryStats: () => Promise<unknown>;

    // Momentum & Deep Work
    getMomentumScore: () => Promise<unknown>;
    getDeepWorkStats: () => Promise<unknown>;

    // Export
    exportData: () => Promise<Record<string, unknown[]>>;

    // Intelligence
    getEnergyCurve: () => Promise<unknown[]>;

    upsertGoal: (input: unknown) => Promise<unknown>;
    getGoals: () => Promise<unknown[]>;
    deleteGoal: (id: number) => Promise<unknown>;
    addVisionItem: (type: string, content: string) => Promise<unknown>;
    getVisionItems: () => Promise<unknown[]>;
    deleteVisionItem: (id: number) => Promise<unknown>;
    getGoalAlignment: () => Promise<unknown[]>;
    getWeeklyStats: () => Promise<unknown>;
    getUserLevel: () => Promise<unknown>;

    // Server
    toggleHttpServer: (enabled: boolean) => Promise<{ running: boolean }>;
    getServerStatus: () => Promise<{ running: boolean }>;

    // Custom Metrics
    createMetric: (name: string, unit: string, type: string, target?: number) => Promise<number>;
    getMetrics: (includeArchived?: boolean) => Promise<unknown[]>;
    archiveMetric: (id: number, archived: boolean) => Promise<void>;
    logMetric: (metricId: number, value: number, note?: string) => Promise<number>;
    getMetricLogs: (metricId: number, days?: number) => Promise<unknown[]>;
    getMetricStats: (metricId: number) => Promise<unknown>;

    // Reminders
    getReminders: () => Promise<unknown[]>;
    addReminder: (title: string, time: string, days: string) => Promise<number>;
    toggleReminder: (id: number, isActive: boolean) => Promise<void>;
    deleteReminder: (id: number) => Promise<void>;

    // App
    getAppInfo: () => Promise<{ version: string; dataPath: string; isPackaged: boolean }>;
    sendNotification: (title: string, body: string) => void;

    // Remote Control
    onStartPomodoro: (callback: (data: { activity_id: number; minutes: number }) => void) => void;
    removeStartPomodoro: () => void;
    onStopPomodoro: (callback: () => void) => void;
    removeStopPomodoro: () => void;
}

const api: ElectronAPI = {
    createActivity: (input) => ipcRenderer.invoke('create-activity', input),
    getActivities: (includeArchived) => ipcRenderer.invoke('get-activities', includeArchived),
    updateActivity: (id, input) => ipcRenderer.invoke('update-activity', id, input),
    archiveActivity: (id, archived) => ipcRenderer.invoke('archive-activity', id, archived),
    deleteActivity: (id) => ipcRenderer.invoke('delete-activity', id),
    logActivity: (input) => ipcRenderer.invoke('log-activity', input),
    getActivityLogs: (filter) => ipcRenderer.invoke('get-activity-logs', filter),
    getDashboard: () => ipcRenderer.invoke('get-dashboard'),
    getChartData: (range, activityId) => ipcRenderer.invoke('get-chart-data', range, activityId),
    getHeatmap: (activityId) => ipcRenderer.invoke('get-heatmap', activityId),
    getActivityStats: (activityId) => ipcRenderer.invoke('get-activity-stats', activityId),
    getAIInsights: () => ipcRenderer.invoke('get-ai-insights'),
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    getTimetable: (day) => ipcRenderer.invoke('get-timetable', day),
    upsertTimetableSlot: (input) => ipcRenderer.invoke('upsert-timetable-slot', input),
    deleteTimetableSlot: (id) => ipcRenderer.invoke('delete-timetable-slot', id),
    getTimetableAdherence: (date) => ipcRenderer.invoke('get-timetable-adherence', date),
    getWeeklyAdherence: () => ipcRenderer.invoke('get-weekly-adherence'),
    analyzeSchedule: () => ipcRenderer.invoke('analyze-schedule'),
    autoSchedule: () => ipcRenderer.invoke('auto-schedule'),
    getBurnoutRisk: () => ipcRenderer.invoke('get-burnout-risk'),
    getBrainLoad: () => ipcRenderer.invoke('get-brain-load'),
    getTopicDistribution: (days) => ipcRenderer.invoke('get-topic-distribution', days),
    addTestScore: (input) => ipcRenderer.invoke('add-test-score', input),
    getTestScores: (filter) => ipcRenderer.invoke('get-test-scores', filter),
    updateTestScore: (id, input) => ipcRenderer.invoke('update-test-score', id, input),
    deleteTestScore: (id) => ipcRenderer.invoke('delete-test-score', id),
    getTestTrends: (testType, subject) => ipcRenderer.invoke('get-test-trends', testType, subject),
    getTestSummary: (testType) => ipcRenderer.invoke('get-test-summary', testType),
    analyzeTestPerformance: (testType) => ipcRenderer.invoke('analyze-test-performance', testType),
    upsertDiary: (input) => ipcRenderer.invoke('upsert-diary', input),
    getDiary: (date) => ipcRenderer.invoke('get-diary', date),
    getDiaryEntries: (limit) => ipcRenderer.invoke('get-diary-entries', limit),
    getDiaryStats: () => ipcRenderer.invoke('get-diary-stats'),
    getMomentumScore: () => ipcRenderer.invoke('get-momentum-score'),
    getDeepWorkStats: () => ipcRenderer.invoke('get-deep-work-stats'),
    exportData: () => ipcRenderer.invoke('export-data'),
    getEnergyCurve: () => ipcRenderer.invoke('get-energy-curve'),

    upsertGoal: (input) => ipcRenderer.invoke('upsert-goal', input),
    getGoals: () => ipcRenderer.invoke('get-goals'),
    deleteGoal: (id) => ipcRenderer.invoke('delete-goal', id),
    addVisionItem: (type, content) => ipcRenderer.invoke('add-vision-item', type, content),
    getVisionItems: () => ipcRenderer.invoke('get-vision-items'),
    deleteVisionItem: (id) => ipcRenderer.invoke('delete-vision-item', id),
    getGoalAlignment: () => ipcRenderer.invoke('get-goal-alignment'),
    getWeeklyStats: () => ipcRenderer.invoke('get-weekly-stats'),
    getUserLevel: () => ipcRenderer.invoke('get-user-level'),
    toggleHttpServer: (enabled) => ipcRenderer.invoke('toggle-http-server', enabled),
    getServerStatus: () => ipcRenderer.invoke('get-server-status'),

    // Custom Metrics
    createMetric: (name, unit, type, target) => ipcRenderer.invoke('create-metric', name, unit, type, target),
    getMetrics: (includeArchived) => ipcRenderer.invoke('get-metrics', includeArchived),
    archiveMetric: (id, archived) => ipcRenderer.invoke('archive-metric', id, archived),
    logMetric: (metricId, value, note) => ipcRenderer.invoke('log-metric', metricId, value, note),
    getMetricLogs: (metricId, days) => ipcRenderer.invoke('get-metric-logs', metricId, days),
    getMetricStats: (metricId) => ipcRenderer.invoke('get-metric-stats', metricId),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    sendNotification: (title, body) => ipcRenderer.send('send-notification', title, body),

    // Reminders
    getReminders: () => ipcRenderer.invoke('get-reminders'),
    addReminder: (title, time, days) => ipcRenderer.invoke('add-reminder', title, time, days),
    toggleReminder: (id, isActive) => ipcRenderer.invoke('toggle-reminder', id, isActive),
    deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),

    onStartPomodoro: (callback) => ipcRenderer.on('start-pomodoro', (_event, data) => callback(data)),
    removeStartPomodoro: () => ipcRenderer.removeAllListeners('start-pomodoro'),
    onStopPomodoro: (callback) => ipcRenderer.on('stop-pomodoro', () => callback()),
    removeStopPomodoro: () => ipcRenderer.removeAllListeners('stop-pomodoro'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
