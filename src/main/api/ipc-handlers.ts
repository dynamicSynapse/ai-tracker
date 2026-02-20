import { ipcMain } from 'electron';
import {
    createActivity,
    getActivities,
    updateActivity,
    archiveActivity,
    deleteActivity,
    logActivity,
    getActivityLogs,
    getDashboardData,
    getChartData,
    getHeatmapData,
    getActivityStats,
    getSetting,
    setSetting,
    getTimetableSlots,
    upsertTimetableSlot,
    deleteTimetableSlot,
    getTimetableAdherence,
    getWeeklyAdherence,
    addTestScore,
    getTestScores,
    updateTestScore,
    deleteTestScore,
    getTestTrends,
    getTestSummary,
    upsertDiaryEntry,
    getDiaryEntry,
    getDiaryEntries,
    getDiaryStats,
    getMomentumScore,
    getDeepWorkStats,
    exportAllData,
    getEnergyCurve,
    getBurnoutRisk,
    getBrainLoad,
    upsertGoal,
    getGoals,
    deleteGoal,
    addVisionItem,
    getVisionItems,
    deleteVisionItem,
    getGoalAlignment,
    getWeeklyStats,
    getUserLevel,
    ActivityInput,
    LogInput,
    TimetableSlotInput,
    GoalInput,
    TestScoreInput,
    DiaryEntryInput,
    addXP,
    getTopicDistribution,
    createMetric,
    getMetrics,
    toggleMetricArchive,
    logMetric,
    getMetricLogs,
    getMetricStats,
    getReminders,
    addReminder,
    toggleReminder,
    deleteReminder,
} from '../db/queries';
import { startServer, stopServer, isServerRunning } from './server';
import {
    analyzeTrends,
    analyzeScheduleAdherence,
    analyzeTestPerformance,
    autoSchedule,
} from './ai-service';

export function registerIpcHandlers(): void {
    // ─── Activities ────────────────────────────────────────
    ipcMain.handle('create-activity', async (_event, input: ActivityInput) => {
        const id = createActivity(input);
        return { id, status: 'ok' };
    });

    ipcMain.handle('get-activities', async (_event, includeArchived?: boolean) => {
        return getActivities(includeArchived);
    });

    ipcMain.handle('update-activity', async (_event, id: number, input: Partial<ActivityInput>) => {
        updateActivity(id, input);
        return { status: 'ok' };
    });

    ipcMain.handle('archive-activity', async (_event, id: number, archived: boolean) => {
        archiveActivity(id, archived);
        return { status: 'ok' };
    });

    ipcMain.handle('delete-activity', async (_event, id: number) => {
        deleteActivity(id);
        return { status: 'ok' };
    });

    // ─── Activity Logs ─────────────────────────────────────
    ipcMain.handle('log-activity', async (_event, input: LogInput) => {
        const id = logActivity(input);
        // XP Reward: 10 XP per log
        // TODO: Calculate based on duration or focus score?
        addXP(10, 'activity', `Logged activity: ${input.activity_id}`);
        return { id, status: 'ok' };
    });

    ipcMain.handle('get-activity-logs', async (_event, filter?: {
        activity_id?: number;
        limit?: number;
        from?: string;
        to?: string;
    }) => {
        return getActivityLogs(filter);
    });

    // ─── Dashboard ─────────────────────────────────────────
    ipcMain.handle('get-dashboard', async () => {
        return getDashboardData();
    });

    // ─── Charts / Analytics ────────────────────────────────
    ipcMain.handle('get-chart-data', async (_event, range: string, activityId?: number) => {
        return getChartData(range as 'daily' | 'weekly' | 'monthly' | 'all', activityId);
    });

    ipcMain.handle('get-heatmap', async (_event, activityId?: number) => {
        return getHeatmapData(activityId);
    });

    ipcMain.handle('get-activity-stats', async (_event, activityId: number) => {
        return getActivityStats(activityId);
    });

    // ─── AI Insights ───────────────────────────────────────
    ipcMain.handle('get-ai-insights', async () => {
        const dashboard = getDashboardData();
        const activityData = {
            activities: dashboard.activities.map(a => {
                const stats = getActivityStats(a.id);
                return {
                    name: a.name,
                    total_minutes: stats.total_minutes,
                    sessions: stats.total_sessions,
                    streak: stats.current_streak,
                };
            }),
            today_minutes: dashboard.today_minutes,
            week_minutes: dashboard.week_minutes,
            month_minutes: dashboard.month_minutes,
            current_streak: dashboard.current_streak,
        };
        return analyzeTrends(activityData);
    });

    // ─── Settings ──────────────────────────────────────────
    ipcMain.handle('get-setting', async (_event, key: string) => {
        return getSetting(key);
    });

    ipcMain.handle('set-setting', async (_event, key: string, value: string) => {
        setSetting(key, value);
        return { status: 'ok' };
    });

    // ─── HTTP Server ───────────────────────────────────────
    ipcMain.handle('toggle-http-server', async (_event, enabled: boolean) => {
        if (enabled && !isServerRunning()) {
            await startServer();
        } else if (!enabled && isServerRunning()) {
            await stopServer();
        }
        return { running: isServerRunning() };
    });

    ipcMain.handle('get-server-status', async () => {
        return { running: isServerRunning() };
    });

    // ─── Timetable ─────────────────────────────────────────
    ipcMain.handle('get-timetable', async (_event, day?: number) => {
        return getTimetableSlots(day);
    });

    ipcMain.handle('upsert-timetable-slot', async (_event, input: TimetableSlotInput & { id?: number }) => {
        const id = upsertTimetableSlot(input);
        return { id, status: 'ok' };
    });

    ipcMain.handle('delete-timetable-slot', async (_event, id: number) => {
        deleteTimetableSlot(id);
        return { status: 'ok' };
    });

    ipcMain.handle('get-timetable-adherence', async (_event, date?: string) => {
        return getTimetableAdherence(date);
    });

    ipcMain.handle('get-weekly-adherence', async () => {
        return getWeeklyAdherence();
    });

    ipcMain.handle('analyze-schedule', async () => {
        const weeklyAdherence = getWeeklyAdherence();
        const dashboard = getDashboardData();
        return analyzeScheduleAdherence(weeklyAdherence, dashboard);
    });

    ipcMain.handle('auto-schedule', async () => {
        return autoSchedule();
    });

    // ─── Analytics / Insights ─────────────────────────────
    ipcMain.handle('get-burnout-risk', () => getBurnoutRisk());
    ipcMain.handle('get-brain-load', () => getBrainLoad());
    ipcMain.handle('get-topic-distribution', (_e, days) => getTopicDistribution(days));

    // ─── Test Scores ───────────────────────────────────────
    ipcMain.handle('add-test-score', async (_event, input: TestScoreInput) => {
        const id = addTestScore(input);
        return { id, status: 'ok' };
    });

    ipcMain.handle('get-test-scores', async (_event, filter?: { test_type?: string; subject?: string; limit?: number }) => {
        return getTestScores(filter);
    });

    ipcMain.handle('update-test-score', async (_event, id: number, input: Partial<TestScoreInput>) => {
        updateTestScore(id, input);
        return { status: 'ok' };
    });

    ipcMain.handle('delete-test-score', async (_event, id: number) => {
        deleteTestScore(id);
        return { status: 'ok' };
    });

    ipcMain.handle('get-test-trends', async (_event, testType?: string, subject?: string) => {
        return getTestTrends(testType, subject);
    });

    ipcMain.handle('get-test-summary', async (_event, testType?: string) => {
        return getTestSummary(testType);
    });

    ipcMain.handle('analyze-test-performance', async (_event, testType?: string) => {
        const summary = getTestSummary(testType);
        const trends = getTestTrends(testType);
        return analyzeTestPerformance(summary, trends);
    });

    // ─── Diary ──────────────────────────────────────────────

    ipcMain.handle('upsert-diary', async (_event, input: DiaryEntryInput) => {
        return upsertDiaryEntry(input);
    });

    ipcMain.handle('get-diary', async (_event, date: string) => {
        return getDiaryEntry(date);
    });

    ipcMain.handle('get-diary-entries', async (_event, limit?: number) => {
        return getDiaryEntries(limit);
    });

    ipcMain.handle('get-diary-stats', async () => {
        return getDiaryStats();
    });

    // ─── Momentum & Deep Work ──────────────────────────────

    ipcMain.handle('get-momentum-score', async () => {
        return getMomentumScore();
    });

    ipcMain.handle('get-deep-work-stats', async () => {
        return getDeepWorkStats();
    });

    // ─── Data Export ───────────────────────────────────────

    ipcMain.handle('export-data', async () => {
        return exportAllData();
    });

    // ─── Phase 2: Intelligence ─────────────────────────────

    ipcMain.handle('get-energy-curve', async () => {
        return getEnergyCurve();
    });

    // ─── Phase 3: Strategic Planning ───────────────────────

    ipcMain.handle('upsert-goal', async (_event, input: GoalInput) => {
        return upsertGoal(input);
    });

    ipcMain.handle('get-goals', async () => {
        return getGoals();
    });

    ipcMain.handle('delete-goal', async (_event, id: number) => {
        return deleteGoal(id);
    });

    ipcMain.handle('add-vision-item', async (_event, type: string, content: string) => {
        return addVisionItem(type, content);
    });

    ipcMain.handle('get-vision-items', async () => {
        return getVisionItems();
    });

    ipcMain.handle('delete-vision-item', async (_event, id: number) => {
        return deleteVisionItem(id);
    });

    ipcMain.handle('get-goal-alignment', async () => {
        return getGoalAlignment();
    });

    ipcMain.handle('get-weekly-stats', async () => {
        return getWeeklyStats();
    });

    ipcMain.handle('get-user-level', async () => {
        return getUserLevel();
    });

    // ─── Custom Metrics ───────────────────────────────────
    ipcMain.handle('create-metric', (_e, name, unit, type, target) => createMetric(name, unit, type, target));
    ipcMain.handle('get-metrics', (_e, includeArchived) => getMetrics(includeArchived));
    ipcMain.handle('archive-metric', (_e, id, archived) => toggleMetricArchive(id, archived));
    ipcMain.handle('log-metric', (_e, metricId, value, note) => logMetric(metricId, value, note));
    ipcMain.handle('get-metric-logs', (_e, metricId, days) => getMetricLogs(metricId, days));
    ipcMain.handle('get-metric-stats', (_e, metricId) => getMetricStats(metricId));

    // ─── Reminders ─────────────────────────────────────────
    ipcMain.handle('get-reminders', () => getReminders());
    ipcMain.handle('add-reminder', (_e, title, time, days) => addReminder(title, time, days));
    ipcMain.handle('toggle-reminder', (_e, id, isActive) => toggleReminder(id, isActive));
    ipcMain.handle('delete-reminder', (_e, id) => deleteReminder(id));
}
