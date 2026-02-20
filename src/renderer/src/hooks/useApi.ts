/**
 * useApi hook — unified data access layer for the Habit Tracker.
 */

// ─── Types ─────────────────────────────────────────────────

export interface ActivityRow {
    id: number;
    name: string;
    category: string;
    icon: string;
    color: string;
    daily_target_minutes: number;
    is_archived: number;
    created_at: string;
}

export interface LogRow {
    id: number;
    activity_id: number;
    minutes: number;
    notes: string | null;
    source: string;
    logged_at: string;
    activity_name?: string;
    activity_icon?: string;
    activity_color?: string;
}

export interface DashboardData {
    today_minutes: number;
    week_minutes: number;
    month_minutes: number;
    current_streak: number;
    recent_logs: LogRow[];
    today_by_activity: { name: string; icon: string; color: string; minutes: number }[];
    activities: ActivityRow[];
}

export interface ChartDataPoint {
    label: string;
    value: number;
}

export interface ChartData {
    points: ChartDataPoint[];
    total: number;
    average: number;
}

export interface ActivityStats {
    total_minutes: number;
    total_sessions: number;
    avg_session: number;
    best_day: number;
    current_streak: number;
}

export interface TimetableSlotRow {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    activity_id: number;
    label: string | null;
    is_active: number;
    activity_name?: string;
    activity_icon?: string;
    activity_color?: string;
}

export interface AdherenceSlot {
    slot_id: number;
    start_time: string;
    end_time: string;
    activity_id: number;
    activity_name: string;
    activity_icon: string;
    planned_minutes: number;
    logged_minutes: number;
    status: 'done' | 'partial' | 'missed';
}

export interface AdherenceData {
    date: string;
    day_of_week: number;
    planned_minutes: number;
    completed_minutes: number;
    adherence_pct: number;
    slots: AdherenceSlot[];
}

export interface TestScoreRow {
    id: number;
    test_type: string;
    subject: string;
    topic: string | null;
    marks_obtained: number;
    total_marks: number;
    percentage: number;
    date: string;
    duration_minutes: number | null;
    notes: string | null;
    created_at: string;
}

export interface TestTrendPoint {
    date: string;
    percentage: number;
    marks_obtained: number;
    total_marks: number;
    subject: string;
}

export interface TestSummary {
    count: number;
    avg_percentage: number;
    best_percentage: number;
    worst_percentage: number;
    total_tests_prelims: number;
    total_tests_mains: number;
    by_subject: { subject: string; count: number; avg_pct: number; best_pct: number }[];
    recent: TestScoreRow[];
}

export interface DiaryEntryInput {
    date: string;
    mood?: number;
    energy_level?: number;
    energy?: number; // alias for easier use
    content?: string;
    tags?: string;
    wins?: string;
    challenges?: string;
    tomorrow_plan?: string;
}

export interface DiaryEntryRow {
    id: number;
    date: string;
    mood: number | null;
    energy_level: number | null;
    content: string | null;
    tags: string | null;
    wins: string | null;
    challenges: string | null;
    tomorrow_plan: string | null;
    created_at: string;
    updated_at: string;
}

export interface DiaryStats {
    total_entries: number;
    diary_streak: number;
    avg_mood: number;
    avg_energy: number;
    recent_moods: { date: string; mood: number }[];
}

export interface MomentumData {
    score: number;
    streak_component: number;
    volume_component: number;
    consistency_component: number;
    deep_work_component: number;
    trend: 'rising' | 'stable' | 'falling';
}

export interface DeepWorkStats {
    deep_sessions_week: number;
    total_deep_minutes: number;
    avg_session_length: number;
    focus_consistency: number;
    longest_session: number;
}

export interface EnergyCurvePoint {
    hour: number;
    avg_focus: number;
    avg_energy: number;
    sample_size: number;
}

export interface BurnoutRisk {
    risk_level: 'low' | 'medium' | 'high';
    risk_score: number;
    factors: string[];
}

export interface BrainLoad {
    current_load: number;
    status: 'optimal' | 'high' | 'overload';
    suggestion: string;
}

export interface GoalRow {
    id: number;
    parent_id: number | null;
    title: string;
    description: string | null;
    category: string | null;
    status: string;
    priority: string;
    deadline: string | null;
    progress: number;
    created_at: string;
    children?: GoalRow[]; // specific to recursive UI
}

export interface GoalInput {
    id?: number;
    parent_id?: number | null;
    title: string;
    description?: string;
    category?: string;
    status?: string;
    priority?: string;
    deadline?: string;
    progress?: number;
}

export interface VisionItem {
    id: number;
    type: 'image' | 'quote';
    content: string;
    position: number;
}

export interface GoalAlignment {
    category: string;
    goalPoints: number;
    timeMinutes: number;
}

export interface WeeklyStats {
    deepWorkMinutes: number;
    deepWorkSessions: number;
    totalLogMinutes: number;
    activeGoals: { title: string, progress: number, status: string }[];
    mood: number;
    energy: number;
}

export interface UserLevel {
    total_xp: number;
    level: number;
    title: string;
}

export interface CustomMetric {
    id: number;
    name: string;
    unit: string;
    type: 'number' | 'boolean' | 'scale';
    target?: number;
    archived: boolean;
}

export interface MetricLog {
    id: number;
    metric_id: number;
    value: number;
    logged_at: string;
    note?: string;
}

export interface MetricStats {
    today: number;
    avg: number;
    streak: number;
}

export interface Reminder {
    id: number;
    title: string;
    time: string;
    days: string;
    is_active: number;
    created_at: string;
}

// ─── API Access ────────────────────────────────────────────

const electronAPI = (window as unknown as { electronAPI?: Record<string, unknown> }).electronAPI;
const isElectron = !!electronAPI;
const API_BASE = 'http://127.0.0.1:8000';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

export function useApi() {
    return {
        // Activities
        async getActivities(includeArchived = false): Promise<ActivityRow[]> {
            if (isElectron) return (electronAPI as any).getActivities(includeArchived);
            return fetchApi('/activities');
        },

        async createActivity(input: { name: string; category: string; icon?: string; color?: string; daily_target_minutes?: number }) {
            if (isElectron) return (electronAPI as any).createActivity(input);
            return fetchApi('/activities', { method: 'POST', body: JSON.stringify(input) });
        },

        async updateActivity(id: number, input: Record<string, unknown>) {
            if (isElectron) return (electronAPI as any).updateActivity(id, input);
        },

        async archiveActivity(id: number, archived: boolean) {
            if (isElectron) return (electronAPI as any).archiveActivity(id, archived);
        },

        async deleteActivity(id: number) {
            if (isElectron) return (electronAPI as any).deleteActivity(id);
        },

        // Logging
        async logActivity(input: { activity_id: number; minutes: number; notes?: string; source?: string; focus_rating?: number; energy_after?: number; distractions?: string }) {
            if (isElectron) return (electronAPI as any).logActivity(input);
            return fetchApi('/log', { method: 'POST', body: JSON.stringify(input) });
        },

        async getActivityLogs(filter: { activity_id?: number; limit?: number; from?: string; to?: string } = {}): Promise<LogRow[]> {
            if (isElectron) return (electronAPI as any).getActivityLogs(filter);
            // Query params
            const params = new URLSearchParams();
            if (filter.activity_id) params.append('activity_id', filter.activity_id.toString());
            if (filter.limit) params.append('limit', filter.limit.toString());
            if (filter.from) params.append('from', filter.from);
            if (filter.to) params.append('to', filter.to);
            return fetchApi(`/logs?${params.toString()}`);
        },

        // Dashboard
        async getDashboard(): Promise<DashboardData> {
            if (isElectron) return (electronAPI as any).getDashboard();
            return fetchApi('/dashboard');
        },

        // Charts
        async getChartData(range: string, activityId?: number): Promise<ChartData> {
            if (isElectron) return (electronAPI as any).getChartData(range, activityId);
            return fetchApi(`/chart?range=${range}${activityId ? `&activity_id=${activityId}` : ''}`);
        },

        async getHeatmap(activityId?: number): Promise<Record<string, number>> {
            if (isElectron) return (electronAPI as any).getHeatmap(activityId);
            return fetchApi(`/heatmap${activityId ? `?activity_id=${activityId}` : ''}`);
        },

        async getActivityStats(activityId: number): Promise<ActivityStats> {
            if (isElectron) return (electronAPI as any).getActivityStats(activityId);
            return fetchApi(`/activity-stats/${activityId}`);
        },

        // AI Insights
        async getAIInsights(): Promise<{ summary: string; error?: string }> {
            if (isElectron) return (electronAPI as any).getAIInsights();
            return { summary: '', error: 'AI requires Electron' };
        },

        // Settings
        async getSetting(key: string): Promise<string | null> {
            if (isElectron) return (electronAPI as any).getSetting(key);
            return null;
        },

        async setSetting(key: string, value: string) {
            if (isElectron) return (electronAPI as any).setSetting(key, value);
        },

        async getAppInfo() {
            if (isElectron) return (electronAPI as any).getAppInfo();
            return { version: 'dev', dataPath: '', isPackaged: false };
        },

        // Timetable
        async getTimetable(day?: number): Promise<TimetableSlotRow[]> {
            if (isElectron) return (electronAPI as any).getTimetable(day);
            return fetchApi(`/timetable${day !== undefined ? `?day=${day}` : ''}`);
        },

        async upsertTimetableSlot(input: { day_of_week: number; start_time: string; end_time: string; activity_id: number; label?: string; id?: number }) {
            if (isElectron) return (electronAPI as any).upsertTimetableSlot(input);
            return fetchApi('/timetable', { method: 'POST', body: JSON.stringify(input) });
        },

        async deleteTimetableSlot(id: number) {
            if (isElectron) return (electronAPI as any).deleteTimetableSlot(id);
        },

        async getTimetableAdherence(date?: string): Promise<AdherenceData> {
            if (isElectron) return (electronAPI as any).getTimetableAdherence(date);
            return fetchApi(`/timetable-adherence${date ? `?date=${date}` : ''}`);
        },

        async getWeeklyAdherence(): Promise<AdherenceData[]> {
            if (isElectron) return (electronAPI as any).getWeeklyAdherence();
            return fetchApi('/weekly-adherence');
        },

        async analyzeSchedule(): Promise<{ summary: string; error?: string }> {
            if (isElectron) return (electronAPI as any).analyzeSchedule();
            return { summary: '', error: 'AI requires Electron' };
        },

        async autoSchedule(): Promise<{ summary: string; slots: any[]; error?: string }> {
            if (isElectron) return (electronAPI as any).autoSchedule();
            return { summary: '', slots: [], error: 'AI requires Electron' };
        },

        async getBurnoutRisk() {
            if (isElectron) return (electronAPI as any).getBurnoutRisk();
            return { risk_level: 'low', risk_score: 0, factors: [] };
        },

        async getBrainLoad() {
            if (isElectron) return (electronAPI as any).getBrainLoad();
            return { current_load: 0, status: 'optimal', suggestion: '' };
        },

        async getTopicDistribution(days = 30) {
            if (isElectron) return (electronAPI as any).getTopicDistribution(days);
            return [];
        },

        // Test Scores
        async addTestScore(input: { test_type: string; subject: string; topic?: string; marks_obtained: number; total_marks: number; date: string; duration_minutes?: number; notes?: string }) {
            if (isElectron) return (electronAPI as any).addTestScore(input);
            return fetchApi('/test-scores', { method: 'POST', body: JSON.stringify(input) });
        },

        async getTestScores(filter?: { test_type?: string; subject?: string; limit?: number }): Promise<TestScoreRow[]> {
            if (isElectron) return (electronAPI as any).getTestScores(filter);
            return fetchApi('/test-scores');
        },

        async updateTestScore(id: number, input: Record<string, unknown>) {
            if (isElectron) return (electronAPI as any).updateTestScore(id, input);
        },

        async deleteTestScore(id: number) {
            if (isElectron) return (electronAPI as any).deleteTestScore(id);
        },

        async getTestTrends(testType?: string, subject?: string): Promise<TestTrendPoint[]> {
            if (isElectron) return (electronAPI as any).getTestTrends(testType, subject);
            return fetchApi(`/test-trends${testType ? `?type=${testType}` : ''}`);
        },

        async getTestSummary(testType?: string): Promise<TestSummary> {
            if (isElectron) return (electronAPI as any).getTestSummary(testType);
            return fetchApi(`/test-summary${testType ? `?type=${testType}` : ''}`);
        },

        async analyzeTestPerformance(testType?: string): Promise<{ summary: string; error?: string }> {
            if (isElectron) return (electronAPI as any).analyzeTestPerformance(testType);
            return { summary: '', error: 'AI requires Electron' };
        },

        // Diary
        async upsertDiary(input: DiaryEntryInput): Promise<number> {
            if (isElectron) return (electronAPI as any).upsertDiary(input);
            return fetchApi('/diary', { method: 'POST', body: JSON.stringify(input) });
        },

        async getDiary(date: string): Promise<DiaryEntryRow | null> {
            if (isElectron) return (electronAPI as any).getDiary(date);
            return fetchApi(`/diary/${date}`);
        },

        async getDiaryEntries(limit?: number): Promise<DiaryEntryRow[]> {
            if (isElectron) return (electronAPI as any).getDiaryEntries(limit);
            return fetchApi(`/diary/entries${limit ? `?limit=${limit}` : ''}`);
        },

        async getDiaryStats(): Promise<DiaryStats> {
            if (isElectron) return (electronAPI as any).getDiaryStats();
            return fetchApi('/diary/stats');
        },

        // Momentum & Deep Work
        async getMomentumScore(): Promise<MomentumData> {
            if (isElectron) return (electronAPI as any).getMomentumScore();
            return fetchApi('/momentum');
        },

        async getDeepWorkStats(): Promise<DeepWorkStats> {
            if (isElectron) return (electronAPI as any).getDeepWorkStats();
            return fetchApi('/deep-work');
        },

        // Export
        async exportData(): Promise<Record<string, unknown[]>> {
            if (isElectron) return (electronAPI as any).exportData();
            return fetchApi('/export');
        },

        // Intelligence
        async getEnergyCurve(): Promise<EnergyCurvePoint[]> {
            if (isElectron) return (electronAPI as any).getEnergyCurve();
            return fetchApi('/energy-curve');
        },




        // Strategic Planning
        async upsertGoal(input: GoalInput) {
            if (isElectron) return (electronAPI as any).upsertGoal(input);
            return fetchApi('/goals', { method: 'POST', body: JSON.stringify(input) });
        },

        async getGoals(): Promise<GoalRow[]> {
            if (isElectron) return (electronAPI as any).getGoals();
            return fetchApi('/goals');
        },

        async deleteGoal(id: number) {
            if (isElectron) return (electronAPI as any).deleteGoal(id);
            return fetchApi(`/goals/${id}`, { method: 'DELETE' });
        },

        // Vision Board
        async addVisionItem(type: string, content: string) {
            if (isElectron) return (electronAPI as any).addVisionItem(type, content);
            return fetchApi('/vision-items', { method: 'POST', body: JSON.stringify({ type, content }) });
        },

        async getVisionItems(): Promise<VisionItem[]> {
            if (isElectron) return (electronAPI as any).getVisionItems();
            return fetchApi('/vision-items');
        },

        async deleteVisionItem(id: number) {
            if (isElectron) return (electronAPI as any).deleteVisionItem(id);
            return fetchApi(`/vision-items/${id}`, { method: 'DELETE' });
        },

        async getGoalAlignment(): Promise<GoalAlignment[]> {
            if (isElectron) return (electronAPI as any).getGoalAlignment();
            return fetchApi('/goal-alignment');
        },

        async getWeeklyStats(): Promise<WeeklyStats> {
            if (isElectron) return (electronAPI as any).getWeeklyStats();
            return fetchApi('/weekly-stats');
        },

        async getUserLevel(): Promise<UserLevel> {
            if (isElectron) return (electronAPI as any).getUserLevel();
            return fetchApi('/user-level');
        },

        // Custom Metrics
        async createMetric(name: string, unit: string, type = 'number', target?: number): Promise<number> {
            if (isElectron) return (electronAPI as any).createMetric(name, unit, type, target);
            return fetchApi('/metrics', { method: 'POST', body: JSON.stringify({ name, unit, type, target }) });
        },

        async getMetrics(includeArchived = false): Promise<CustomMetric[]> {
            if (isElectron) return (electronAPI as any).getMetrics(includeArchived);
            return fetchApi('/metrics');
        },

        async archiveMetric(id: number, archived: boolean) {
            if (isElectron) return (electronAPI as any).archiveMetric(id, archived);
        },

        async logMetric(metricId: number, value: number, note?: string): Promise<number> {
            if (isElectron) return (electronAPI as any).logMetric(metricId, value, note);
            return fetchApi('/metrics/log', { method: 'POST', body: JSON.stringify({ metricId, value, note }) });
        },

        async getMetricLogs(metricId: number, days = 30): Promise<MetricLog[]> {
            if (isElectron) return (electronAPI as any).getMetricLogs(metricId, days);
            return fetchApi(`/metrics/${metricId}/logs?days=${days}`);
        },

        async getMetricStats(metricId: number): Promise<MetricStats> {
            if (isElectron) return (electronAPI as any).getMetricStats(metricId);
            return fetchApi(`/metrics/${metricId}/stats`);
        },

        // ─── Reminders System ──────────────────────────────────
        async getReminders(): Promise<Reminder[]> {
            if (isElectron) return (electronAPI as any).getReminders();
            return fetchApi('/reminders');
        },

        async addReminder(title: string, time: string, days: string): Promise<number> {
            if (isElectron) return (electronAPI as any).addReminder(title, time, days);
            return fetchApi('/reminders', { method: 'POST', body: JSON.stringify({ title, time, days }) });
        },

        async toggleReminder(id: number, isActive: boolean) {
            if (isElectron) return (electronAPI as any).toggleReminder(id, isActive);
            return fetchApi(`/reminders/${id}/toggle`, { method: 'POST', body: JSON.stringify({ isActive }) });
        },

        async deleteReminder(id: number) {
            if (isElectron) return (electronAPI as any).deleteReminder(id);
            return fetchApi(`/reminders/${id}`, { method: 'DELETE' });
        },
    };
}
