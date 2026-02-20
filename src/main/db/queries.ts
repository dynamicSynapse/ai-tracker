import { getDatabase } from './database';

// ─── Activity Types ────────────────────────────────────────

export interface ActivityInput {
    name: string;
    category: string;
    icon?: string;
    color?: string;
    daily_target_minutes?: number;
}

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

// ─── Log Types ─────────────────────────────────────────────

export interface LogInput {
    activity_id: number;
    minutes: number;
    notes?: string;
    source?: string;
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

// ─── Dashboard Types ───────────────────────────────────────

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

// ─── Activity Queries ──────────────────────────────────────

export function createActivity(input: ActivityInput): number {
    const db = getDatabase();
    const result = db.prepare(
        `INSERT INTO activities (name, category, icon, color, daily_target_minutes)
         VALUES (?, ?, ?, ?, ?)`,
    ).run(
        input.name,
        input.category,
        input.icon || '📌',
        input.color || '#6C63FF',
        input.daily_target_minutes || 0,
    );
    return result.lastInsertRowid as number;
}

export function getActivities(includeArchived = false): ActivityRow[] {
    const db = getDatabase();
    if (includeArchived) {
        return db.prepare('SELECT * FROM activities ORDER BY name').all() as ActivityRow[];
    }
    return db.prepare('SELECT * FROM activities WHERE is_archived = 0 ORDER BY name').all() as ActivityRow[];
}

export function updateActivity(id: number, input: Partial<ActivityInput>): void {
    const db = getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
    if (input.icon !== undefined) { fields.push('icon = ?'); values.push(input.icon); }
    if (input.color !== undefined) { fields.push('color = ?'); values.push(input.color); }
    if (input.daily_target_minutes !== undefined) { fields.push('daily_target_minutes = ?'); values.push(input.daily_target_minutes); }

    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE activities SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function archiveActivity(id: number, archived: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE activities SET is_archived = ? WHERE id = ?').run(archived ? 1 : 0, id);
}

export function deleteActivity(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM activity_logs WHERE activity_id = ?').run(id);
    db.prepare('DELETE FROM activities WHERE id = ?').run(id);
}

// ─── Log Queries ───────────────────────────────────────────

export interface LogInput {
    activity_id: number;
    minutes: number;
    notes?: string;
    source?: string;
    focus_rating?: number;
    distractions?: string;
    energy_after?: number;
}

export function logActivity(input: LogInput): { id: number; status: string } {
    const db = getDatabase();
    if (input.minutes <= 0) throw new Error('Minutes must be positive');

    const result = db.prepare(
        `INSERT INTO activity_logs (activity_id, minutes, notes, source, focus_rating, distractions, energy_after)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        input.activity_id,
        input.minutes,
        input.notes || null,
        input.source || 'manual',
        input.focus_rating || null,
        input.distractions || null,
        input.energy_after || null,
    );
    return { id: result.lastInsertRowid as number, status: 'success' };
}

export function getActivityLogs(filter?: {
    activity_id?: number;
    limit?: number;
    from?: string;
    to?: string;
}): LogRow[] {
    const db = getDatabase();
    let query = `SELECT l.*, a.name as activity_name, a.icon as activity_icon, a.color as activity_color
                 FROM activity_logs l JOIN activities a ON l.activity_id = a.id`;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.activity_id) {
        conditions.push('l.activity_id = ?');
        params.push(filter.activity_id);
    }
    if (filter?.from) {
        conditions.push('l.logged_at >= ?');
        params.push(filter.from);
    }
    if (filter?.to) {
        conditions.push('l.logged_at <= ?');
        params.push(filter.to);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY l.logged_at DESC';
    query += ` LIMIT ?`;
    params.push(Math.min(filter?.limit || 100, 500));

    const results = db.prepare(query).all(...params) as LogRow[];
    return results.map(r => ({ ...r, logged_at: r.logged_at.replace(' ', 'T') + 'Z' }));
}

// ─── Dashboard Queries ─────────────────────────────────────

export function getDashboardData(): DashboardData {
    const db = getDatabase();

    // Today's total minutes
    const todayResult = db.prepare(
        `SELECT COALESCE(SUM(minutes), 0) as total FROM activity_logs
         WHERE date(logged_at) = date('now', 'localtime')`,
    ).get() as { total: number };

    // This week's total
    const weekResult = db.prepare(
        `SELECT COALESCE(SUM(minutes), 0) as total FROM activity_logs
         WHERE logged_at >= datetime('now', '-7 days')`,
    ).get() as { total: number };

    // This month's total
    const monthResult = db.prepare(
        `SELECT COALESCE(SUM(minutes), 0) as total FROM activity_logs
         WHERE logged_at >= datetime('now', '-30 days')`,
    ).get() as { total: number };

    // Streak: consecutive days with any log
    const streakDays = db.prepare(
        `SELECT DISTINCT date(logged_at, 'localtime') as d FROM activity_logs
         ORDER BY d DESC LIMIT 365`,
    ).all() as { d: string }[];

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();
    for (let i = 0; i < streakDays.length; i++) {
        const expected = checkDate.toISOString().split('T')[0];
        if (streakDays[i].d === expected) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else if (i === 0 && streakDays[i].d !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (streakDays[i].d === yesterday) {
                checkDate = new Date(Date.now() - 86400000);
                currentStreak++;
                checkDate = new Date(checkDate.getTime() - 86400000);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    // Recent logs
    const recentLogs = getActivityLogs({ limit: 15 });

    // Today breakdown by activity
    const todayByActivity = db.prepare(
        `SELECT a.name, a.icon, a.color, COALESCE(SUM(l.minutes), 0) as minutes
         FROM activity_logs l JOIN activities a ON l.activity_id = a.id
         WHERE date(l.logged_at, 'localtime') = date('now', 'localtime')
         GROUP BY a.id ORDER BY minutes DESC`,
    ).all() as { name: string; icon: string; color: string; minutes: number }[];

    const activities = getActivities();

    return {
        today_minutes: todayResult.total,
        week_minutes: weekResult.total,
        month_minutes: monthResult.total,
        current_streak: currentStreak,
        recent_logs: recentLogs,
        today_by_activity: todayByActivity,
        activities,
    };
}

// ─── Chart / Analytics Queries ─────────────────────────────

export function getChartData(
    range: 'daily' | 'weekly' | 'monthly' | 'all',
    activityId?: number,
): ChartData {
    const db = getDatabase();
    let query: string;
    const params: unknown[] = [];

    const activityFilter = activityId
        ? 'AND l.activity_id = ?'
        : '';

    switch (range) {
        case 'daily':
            // Last 24 hours, grouped by hour
            query = `SELECT strftime('%H:00', l.logged_at, 'localtime') as label,
                     COALESCE(SUM(l.minutes), 0) as value
                     FROM activity_logs l
                     WHERE date(l.logged_at, 'localtime') = date('now', 'localtime') ${activityFilter}
                     GROUP BY label ORDER BY label`;
            break;
        case 'weekly':
            // Last 7 days
            query = `SELECT strftime('%w', l.logged_at, 'localtime') as dow,
                     date(l.logged_at, 'localtime') as label,
                     COALESCE(SUM(l.minutes), 0) as value
                     FROM activity_logs l
                     WHERE l.logged_at >= datetime('now', '-7 days') ${activityFilter}
                     GROUP BY label ORDER BY label`;
            break;
        case 'monthly':
            // Last 30 days
            query = `SELECT date(l.logged_at, 'localtime') as label,
                     COALESCE(SUM(l.minutes), 0) as value
                     FROM activity_logs l
                     WHERE l.logged_at >= datetime('now', '-30 days') ${activityFilter}
                     GROUP BY label ORDER BY label`;
            break;
        case 'all':
            // All time, grouped by week
            query = `SELECT strftime('%Y-W%W', l.logged_at, 'localtime') as label,
                     COALESCE(SUM(l.minutes), 0) as value
                     FROM activity_logs l
                     WHERE 1=1 ${activityFilter}
                     GROUP BY label ORDER BY label`;
            break;
    }

    if (activityId) params.push(activityId);
    const points = db.prepare(query).all(...params) as ChartDataPoint[];
    const total = points.reduce((s, p) => s + p.value, 0);
    const average = points.length > 0 ? Math.round(total / points.length) : 0;

    return { points, total, average };
}

export function getHeatmapData(activityId?: number): Record<string, number> {
    const db = getDatabase();
    const activityFilter = activityId ? 'AND activity_id = ?' : '';
    const params: unknown[] = [];
    if (activityId) params.push(activityId);

    const rows = db.prepare(
        `SELECT date(logged_at, 'localtime') as d, SUM(minutes) as total
         FROM activity_logs
         WHERE logged_at >= datetime('now', '-365 days') ${activityFilter}
         GROUP BY d`,
    ).all(...params) as { d: string; total: number }[];

    const heatmap: Record<string, number> = {};
    for (const row of rows) {
        heatmap[row.d] = row.total;
    }
    return heatmap;
}

export function getActivityStats(activityId: number): {
    total_minutes: number;
    total_sessions: number;
    avg_session: number;
    best_day: number;
    current_streak: number;
} {
    const db = getDatabase();

    const totals = db.prepare(
        `SELECT COALESCE(SUM(minutes), 0) as total_minutes,
                COUNT(*) as total_sessions
         FROM activity_logs WHERE activity_id = ?`,
    ).get(activityId) as { total_minutes: number; total_sessions: number };

    const bestDay = db.prepare(
        `SELECT COALESCE(MAX(daily_total), 0) as best FROM (
            SELECT SUM(minutes) as daily_total FROM activity_logs
            WHERE activity_id = ? GROUP BY date(logged_at, 'localtime')
         )`,
    ).get(activityId) as { best: number };

    // Streak for this activity
    const days = db.prepare(
        `SELECT DISTINCT date(logged_at, 'localtime') as d FROM activity_logs
         WHERE activity_id = ? ORDER BY d DESC LIMIT 365`,
    ).all(activityId) as { d: string }[];

    let streak = 0;
    let checkDate = new Date();
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < days.length; i++) {
        const expected = checkDate.toISOString().split('T')[0];
        if (days[i].d === expected) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else if (i === 0 && days[i].d !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (days[i].d === yesterday) {
                checkDate = new Date(Date.now() - 86400000);
                streak++;
                checkDate = new Date(checkDate.getTime() - 86400000);
            } else break;
        } else break;
    }

    return {
        total_minutes: totals.total_minutes,
        total_sessions: totals.total_sessions,
        avg_session: totals.total_sessions > 0
            ? Math.round(totals.total_minutes / totals.total_sessions)
            : 0,
        best_day: bestDay.best,
        current_streak: streak,
    };
}

// ─── Settings ──────────────────────────────────────────────

export function getSetting(key: string): string | null {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
        | { value: string }
        | undefined;
    return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// ─── Timetable Types ───────────────────────────────────────

export interface TimetableSlotInput {
    day_of_week: number; // 0=Sun, 1=Mon ... 6=Sat
    start_time: string;  // "09:00"
    end_time: string;    // "10:30"
    activity_id: number;
    label?: string;
}

export interface TimetableSlotRow {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    activity_id: number;
    label: string | null;
    is_active: number;
    created_at: string;
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

// ─── Timetable Queries ─────────────────────────────────────

export function getTimetableSlots(day?: number): TimetableSlotRow[] {
    const db = getDatabase();
    if (day !== undefined) {
        return db.prepare(
            `SELECT t.*, a.name as activity_name, a.icon as activity_icon, a.color as activity_color
             FROM timetable_slots t JOIN activities a ON t.activity_id = a.id
             WHERE t.day_of_week = ? AND t.is_active = 1
             ORDER BY t.start_time`,
        ).all(day) as TimetableSlotRow[];
    }
    return db.prepare(
        `SELECT t.*, a.name as activity_name, a.icon as activity_icon, a.color as activity_color
         FROM timetable_slots t JOIN activities a ON t.activity_id = a.id
         WHERE t.is_active = 1
         ORDER BY t.day_of_week, t.start_time`,
    ).all() as TimetableSlotRow[];
}

export function upsertTimetableSlot(input: TimetableSlotInput & { id?: number }): number {
    const db = getDatabase();
    if (input.id) {
        db.prepare(
            `UPDATE timetable_slots SET day_of_week = ?, start_time = ?, end_time = ?, activity_id = ?, label = ?
             WHERE id = ?`,
        ).run(input.day_of_week, input.start_time, input.end_time, input.activity_id, input.label || null, input.id);
        return input.id;
    }
    const result = db.prepare(
        `INSERT INTO timetable_slots (day_of_week, start_time, end_time, activity_id, label)
         VALUES (?, ?, ?, ?, ?)`,
    ).run(input.day_of_week, input.start_time, input.end_time, input.activity_id, input.label || null);
    return result.lastInsertRowid as number;
}

export function deleteTimetableSlot(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM timetable_slots WHERE id = ?').run(id);
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function getTimetableAdherence(dateStr?: string): AdherenceData {
    const db = getDatabase();
    const date = dateStr || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun

    const slots = getTimetableSlots(dayOfWeek);

    const adherenceSlots: AdherenceSlot[] = slots.map(slot => {
        const plannedMinutes = timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time);

        // Get logged minutes for this activity on this date
        const logged = db.prepare(
            `SELECT COALESCE(SUM(minutes), 0) as total
             FROM activity_logs
             WHERE activity_id = ? AND date(logged_at, 'localtime') = ?`,
        ).get(slot.activity_id, date) as { total: number };

        const loggedMinutes = logged.total;
        let status: 'done' | 'partial' | 'missed' = 'missed';
        if (loggedMinutes >= plannedMinutes * 0.8) status = 'done';
        else if (loggedMinutes > 0) status = 'partial';

        return {
            slot_id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            activity_id: slot.activity_id,
            activity_name: slot.activity_name || '',
            activity_icon: slot.activity_icon || '📌',
            planned_minutes: plannedMinutes,
            logged_minutes: loggedMinutes,
            status,
        };
    });

    const planned = adherenceSlots.reduce((s, a) => s + a.planned_minutes, 0);
    const completed = adherenceSlots.reduce((s, a) => s + Math.min(a.logged_minutes, a.planned_minutes), 0);

    return {
        date,
        day_of_week: dayOfWeek,
        planned_minutes: planned,
        completed_minutes: completed,
        adherence_pct: planned > 0 ? Math.round((completed / planned) * 100) : 0,
        slots: adherenceSlots,
    };
}

export function getWeeklyAdherence(): AdherenceData[] {
    const results: AdherenceData[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        results.push(getTimetableAdherence(dateStr));
    }
    return results;
}

// ─── Test Score Types ──────────────────────────────────────

export interface TestScoreInput {
    test_type: 'prelims' | 'mains';
    subject: string;
    topic?: string;
    marks_obtained: number;
    total_marks: number;
    date: string;
    duration_minutes?: number;
    notes?: string;
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

// ─── Test Score Queries ────────────────────────────────────

export function addTestScore(input: TestScoreInput): number {
    const db = getDatabase();
    const percentage = Math.round((input.marks_obtained / input.total_marks) * 10000) / 100;
    const result = db.prepare(
        `INSERT INTO test_scores (test_type, subject, topic, marks_obtained, total_marks, percentage, date, duration_minutes, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        input.test_type, input.subject, input.topic || null,
        input.marks_obtained, input.total_marks, percentage,
        input.date, input.duration_minutes || null, input.notes || null,
    );
    return result.lastInsertRowid as number;
}

export function getTestScores(filter?: {
    test_type?: string;
    subject?: string;
    from?: string;
    to?: string;
    limit?: number;
}): TestScoreRow[] {
    const db = getDatabase();
    let query = 'SELECT * FROM test_scores';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.test_type) { conditions.push('test_type = ?'); params.push(filter.test_type); }
    if (filter?.subject) { conditions.push('subject = ?'); params.push(filter.subject); }
    if (filter?.from) { conditions.push('date >= ?'); params.push(filter.from); }
    if (filter?.to) { conditions.push('date <= ?'); params.push(filter.to); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date DESC';
    query += ` LIMIT ?`;
    params.push(Math.min(filter?.limit || 200, 500));

    return db.prepare(query).all(...params) as TestScoreRow[];
}

export function updateTestScore(id: number, input: Partial<TestScoreInput>): void {
    const db = getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.test_type !== undefined) { fields.push('test_type = ?'); values.push(input.test_type); }
    if (input.subject !== undefined) { fields.push('subject = ?'); values.push(input.subject); }
    if (input.topic !== undefined) { fields.push('topic = ?'); values.push(input.topic || null); }
    if (input.date !== undefined) { fields.push('date = ?'); values.push(input.date); }
    if (input.duration_minutes !== undefined) { fields.push('duration_minutes = ?'); values.push(input.duration_minutes); }
    if (input.notes !== undefined) { fields.push('notes = ?'); values.push(input.notes || null); }

    if (input.marks_obtained !== undefined || input.total_marks !== undefined) {
        // Need both to recalculate percentage
        const existing = db.prepare('SELECT marks_obtained, total_marks FROM test_scores WHERE id = ?').get(id) as { marks_obtained: number; total_marks: number } | undefined;
        if (existing) {
            const mo = input.marks_obtained ?? existing.marks_obtained;
            const tm = input.total_marks ?? existing.total_marks;
            fields.push('marks_obtained = ?'); values.push(mo);
            fields.push('total_marks = ?'); values.push(tm);
            fields.push('percentage = ?'); values.push(Math.round((mo / tm) * 10000) / 100);
        }
    }

    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE test_scores SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTestScore(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM test_scores WHERE id = ?').run(id);
}

export function getTestTrends(testType?: string, subject?: string): TestTrendPoint[] {
    const db = getDatabase();
    let query = 'SELECT date, percentage, marks_obtained, total_marks, subject FROM test_scores';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (testType) { conditions.push('test_type = ?'); params.push(testType); }
    if (subject) { conditions.push('subject = ?'); params.push(subject); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date ASC';

    return db.prepare(query).all(...params) as TestTrendPoint[];
}

export function getTestSummary(testType?: string): TestSummary {
    const db = getDatabase();
    const typeFilter = testType ? 'WHERE test_type = ?' : '';
    const params: unknown[] = testType ? [testType] : [];

    const agg = db.prepare(
        `SELECT COUNT(*) as count,
                COALESCE(AVG(percentage), 0) as avg_pct,
                COALESCE(MAX(percentage), 0) as best_pct,
                COALESCE(MIN(percentage), 0) as worst_pct
         FROM test_scores ${typeFilter}`,
    ).get(...params) as { count: number; avg_pct: number; best_pct: number; worst_pct: number };

    const typeCounts = db.prepare(
        `SELECT test_type, COUNT(*) as cnt FROM test_scores GROUP BY test_type`,
    ).all() as { test_type: string; cnt: number }[];

    const prelimsCount = typeCounts.find(t => t.test_type === 'prelims')?.cnt || 0;
    const mainsCount = typeCounts.find(t => t.test_type === 'mains')?.cnt || 0;

    const bySubject = db.prepare(
        `SELECT subject, COUNT(*) as count,
                ROUND(AVG(percentage), 1) as avg_pct,
                ROUND(MAX(percentage), 1) as best_pct
         FROM test_scores ${typeFilter}
         GROUP BY subject ORDER BY avg_pct DESC`,
    ).all(...params) as { subject: string; count: number; avg_pct: number; best_pct: number }[];

    const recent = getTestScores({ test_type: testType, limit: 10 });

    return {
        count: agg.count,
        avg_percentage: Math.round(agg.avg_pct * 10) / 10,
        best_percentage: Math.round(agg.best_pct * 10) / 10,
        worst_percentage: Math.round(agg.worst_pct * 10) / 10,
        total_tests_prelims: prelimsCount,
        total_tests_mains: mainsCount,
        by_subject: bySubject,
        recent,
    };
}

// ─── Diary Types ───────────────────────────────────────────

export interface DiaryEntryInput {
    date: string;
    mood?: number;
    energy_level?: number;
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

// ─── Diary Queries ─────────────────────────────────────────

export function upsertDiaryEntry(input: DiaryEntryInput): number {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM diary_entries WHERE date = ?').get(input.date) as { id: number } | undefined;

    if (existing) {
        db.prepare(
            `UPDATE diary_entries SET mood = ?, energy_level = ?, content = ?, tags = ?, wins = ?, challenges = ?, tomorrow_plan = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
        ).run(
            input.mood || null, input.energy_level || null, input.content || null,
            input.tags || null, input.wins || null, input.challenges || null,
            input.tomorrow_plan || null, existing.id,
        );
        return existing.id;
    }

    const result = db.prepare(
        `INSERT INTO diary_entries (date, mood, energy_level, content, tags, wins, challenges, tomorrow_plan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        input.date, input.mood || null, input.energy_level || null, input.content || null,
        input.tags || null, input.wins || null, input.challenges || null, input.tomorrow_plan || null,
    );
    return result.lastInsertRowid as number;
}

export function getDiaryEntry(date: string): DiaryEntryRow | null {
    const db = getDatabase();
    return (db.prepare('SELECT * FROM diary_entries WHERE date = ?').get(date) as DiaryEntryRow) || null;
}

export function getDiaryEntries(limit = 30): DiaryEntryRow[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM diary_entries ORDER BY date DESC LIMIT ?').all(limit) as DiaryEntryRow[];
}

export function getDiaryStats(): DiaryStats {
    const db = getDatabase();
    const total = (db.prepare('SELECT COUNT(*) as cnt FROM diary_entries').get() as { cnt: number }).cnt;

    const avgData = db.prepare(
        'SELECT AVG(mood) as avg_mood, AVG(energy_level) as avg_energy FROM diary_entries WHERE mood IS NOT NULL',
    ).get() as { avg_mood: number | null; avg_energy: number | null };

    // Calculate diary streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const exists = db.prepare('SELECT 1 FROM diary_entries WHERE date = ?').get(dateStr);
        if (exists) streak++;
        else break;
    }

    const recentMoods = db.prepare(
        'SELECT date, mood FROM diary_entries WHERE mood IS NOT NULL ORDER BY date DESC LIMIT 14',
    ).all() as { date: string; mood: number }[];

    return {
        total_entries: total,
        diary_streak: streak,
        avg_mood: Math.round((avgData.avg_mood || 0) * 10) / 10,
        avg_energy: Math.round((avgData.avg_energy || 0) * 10) / 10,
        recent_moods: recentMoods.reverse(),
    };
}

// ─── Momentum Score ────────────────────────────────────────

export interface MomentumData {
    score: number;
    streak_component: number;
    volume_component: number;
    consistency_component: number;
    deep_work_component: number;
    trend: 'rising' | 'stable' | 'falling';
}

export function getMomentumScore(): MomentumData {
    const db = getDatabase();

    // Streak component (0-100): cap at 30 days = 100
    const dashboard = getDashboardData();
    const streak_component = Math.min(dashboard.current_streak / 30, 1) * 100;

    // Volume component (0-100): this week's minutes vs 35hr target (2100min)
    const volume_component = Math.min(dashboard.week_minutes / 2100, 1) * 100;

    // Consistency component (0-100): how many of last 7 days had activity
    const activeDays = db.prepare(
        `SELECT COUNT(DISTINCT date(logged_at, 'localtime')) as cnt
         FROM activity_logs
         WHERE logged_at >= datetime('now', '-7 days')`,
    ).get() as { cnt: number };
    const consistency_component = (activeDays.cnt / 7) * 100;

    // Deep work component (0-100): sessions ≥45 min this week
    const deepSessions = db.prepare(
        `SELECT COUNT(*) as cnt FROM activity_logs
         WHERE minutes >= 45 AND logged_at >= datetime('now', '-7 days')`,
    ).get() as { cnt: number };
    const deep_work_component = Math.min(deepSessions.cnt / 10, 1) * 100;

    const score = Math.round(
        streak_component * 0.25 + volume_component * 0.25 +
        consistency_component * 0.25 + deep_work_component * 0.25,
    );

    // Trend: compare this week vs last week
    const lastWeekMin = (db.prepare(
        `SELECT COALESCE(SUM(minutes), 0) as total FROM activity_logs
         WHERE logged_at >= datetime('now', '-14 days') AND logged_at < datetime('now', '-7 days')`,
    ).get() as { total: number }).total;
    const trend: 'rising' | 'stable' | 'falling' =
        dashboard.week_minutes > lastWeekMin * 1.1 ? 'rising' :
            dashboard.week_minutes < lastWeekMin * 0.9 ? 'falling' : 'stable';

    return { score, streak_component, volume_component, consistency_component, deep_work_component, trend };
}

// ─── Deep Work Stats ───────────────────────────────────────

export interface DeepWorkStats {
    deep_sessions_week: number;
    total_deep_minutes: number;
    avg_session_length: number;
    focus_consistency: number;
    longest_session: number;
}

export function getDeepWorkStats(): DeepWorkStats {
    const db = getDatabase();
    const week = db.prepare(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(minutes), 0) as total, COALESCE(MAX(minutes), 0) as longest
         FROM activity_logs WHERE minutes >= 45 AND logged_at >= datetime('now', '-7 days')`,
    ).get() as { cnt: number; total: number; longest: number };

    const allSessions = db.prepare(
        `SELECT COUNT(*) as cnt FROM activity_logs WHERE logged_at >= datetime('now', '-7 days')`,
    ).get() as { cnt: number };

    const focus_consistency = allSessions.cnt > 0 ? Math.round((week.cnt / allSessions.cnt) * 100) : 0;

    return {
        deep_sessions_week: week.cnt,
        total_deep_minutes: week.total,
        avg_session_length: week.cnt > 0 ? Math.round(week.total / week.cnt) : 0,
        focus_consistency,
        longest_session: week.longest,
    };
}

// ─── Data Export ────────────────────────────────────────────

export function exportAllData(): Record<string, unknown[]> {
    const db = getDatabase();
    return {
        activities: db.prepare('SELECT * FROM activities').all(),
        activity_logs: db.prepare('SELECT * FROM activity_logs ORDER BY logged_at DESC').all(),
        timetable_slots: db.prepare('SELECT * FROM timetable_slots').all(),
        test_scores: db.prepare('SELECT * FROM test_scores ORDER BY date DESC').all(),
        diary_entries: db.prepare('SELECT * FROM diary_entries ORDER BY date DESC').all(),
        goals: db.prepare('SELECT * FROM goals').all(),
        vision_items: db.prepare('SELECT * FROM vision_items ORDER BY position ASC').all(),
        settings: db.prepare('SELECT * FROM settings').all(),
    };
}



// ─── Phase 3: Strategic Planning ───────────────────────────

// Goals
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

export interface GoalRow {
    id: number;
    parent_id: number | null;
    title: string;
    description: string | null;
    category: string | null;
    status: string; // pending, active, completed, archived
    priority: string; // low, medium, high
    deadline: string | null;
    progress: number;
    created_at: string;
    updated_at: string;
}

export function upsertGoal(input: GoalInput): number {
    const db = getDatabase();
    if (input.id) {
        // Update
        const fields: string[] = [];
        const values: unknown[] = [];
        if (input.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(input.parent_id); }
        if (input.title !== undefined) { fields.push('title = ?'); values.push(input.title); }
        if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }
        if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
        if (input.status !== undefined) { fields.push('status = ?'); values.push(input.status); }
        if (input.priority !== undefined) { fields.push('priority = ?'); values.push(input.priority); }
        if (input.deadline !== undefined) { fields.push('deadline = ?'); values.push(input.deadline); }
        if (input.progress !== undefined) { fields.push('progress = ?'); values.push(input.progress); }

        if (fields.length > 0) {
            values.push(input.id);
            db.prepare(`UPDATE goals SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
        }
        return input.id;
    } else {
        // Insert
        const result = db.prepare(`
            INSERT INTO goals (parent_id, title, description, category, status, priority, deadline, progress)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            input.parent_id || null,
            input.title,
            input.description || null,
            input.category || 'Work',
            input.status || 'active',
            input.priority || 'medium',
            input.deadline || null,
            input.progress || 0
        );
        return result.lastInsertRowid as number;
    }
}

export function getGoals(): GoalRow[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all() as GoalRow[];
}

export function deleteGoal(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
}

// Vision Board
export interface VisionItem {
    id: number;
    type: 'image' | 'quote';
    content: string;
    position: number;
}

export function addVisionItem(type: string, content: string): number {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO vision_items (type, content, position) VALUES (?, ?, 0)').run(type, content);
    return result.lastInsertRowid as number;
}

export function getVisionItems(): VisionItem[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM vision_items ORDER BY created_at DESC').all() as VisionItem[];
}

export function deleteVisionItem(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM vision_items WHERE id = ?').run(id);
}

export function getGoalAlignment() {
    const db = getDatabase();
    // 1. Get Goal Priorities by Category
    // Priority: high=3, medium=2, low=1
    const goals = db.prepare("SELECT category, priority FROM goals WHERE status != 'archived'").all() as { category: string, priority: string }[];

    // 2. Get Time Spent by Category (Last 30 days)
    const logs = db.prepare(`
        SELECT a.category, SUM(l.minutes) as total_minutes
        FROM activity_logs l
        JOIN activities a ON l.activity_id = a.id
        WHERE l.logged_at >= date('now', '-30 days')
        GROUP BY a.category
    `).all() as { category: string, total_minutes: number }[];

    // Process
    const alignment: Record<string, { goalPoints: number, timeMinutes: number }> = {};
    const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };

    goals.forEach(g => {
        const cat = g.category || 'Uncategorized';
        if (!alignment[cat]) alignment[cat] = { goalPoints: 0, timeMinutes: 0 };
        alignment[cat].goalPoints += pMap[g.priority || 'medium'] || 1;
    });

    logs.forEach(l => {
        const cat = l.category || 'Uncategorized';
        if (!alignment[cat]) alignment[cat] = { goalPoints: 0, timeMinutes: 0 };
        alignment[cat].timeMinutes += l.total_minutes;
    });

    return Object.entries(alignment).map(([category, stats]) => ({
        category,
        ...stats
    }));
}

export function getWeeklyStats() {
    const db = getDatabase();
    // 7 days lookback
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const startStr = start.toISOString();

    // 1. Total Deep Work
    // 1. Total Deep Work (sessions >= 45m)
    const deepWork = db.prepare(`
        SELECT SUM(minutes) as total_minutes, COUNT(*) as sessions
        FROM activity_logs
        WHERE logged_at >= ? AND minutes >= 45
    `).get(startStr) as { total_minutes: number, sessions: number };

    // 2. Total Time Logged
    const logs = db.prepare(`
        SELECT SUM(minutes) as total_minutes
        FROM activity_logs
        WHERE logged_at >= date(?, 'start of day')
    `).get(startStr) as { total_minutes: number };

    // 3. Goal Progress moved (snapshot logic is complex, so we just return current progress of active goals)
    const goals = db.prepare("SELECT title, progress, status FROM goals WHERE status = 'active'").all();

    // 4. Diary Sentiment
    const diary = db.prepare(`
        SELECT AVG(mood) as avg_mood, AVG(energy_level) as avg_energy
        FROM diary_entries
        WHERE date >= date(?, 'start of day')
    `).get(startStr) as { avg_mood: number, avg_energy: number };

    // 5. Completion Rate (Timetable)
    // Assuming we track 'completed' in timetable_slots? We don't have a status there properly yet, so skipping for now.

    return {
        deepWorkMinutes: deepWork.total_minutes || 0,
        deepWorkSessions: deepWork.sessions || 0,
        totalLogMinutes: logs.total_minutes || 0,
        activeGoals: goals,
        mood: diary.avg_mood || 0,
        energy: diary.avg_energy || 0
    };
}

// ─── Phase 4: Mastery System ──────────────────────────────

export function getUserLevel() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM user_xp WHERE id = 1').get();
}

export function addXP(amount: number, source: string, description: string) {
    const db = getDatabase();
    // Transaction to update logs and total_xp
    const transaction = db.transaction(() => {
        db.prepare('INSERT INTO xp_logs (amount, source, description) VALUES (?, ?, ?)').run(amount, source, description);
        db.prepare('UPDATE user_xp SET total_xp = total_xp + ? WHERE id = 1').run(amount);

        // Check for level up
        const user = db.prepare('SELECT total_xp, level FROM user_xp WHERE id = 1').get() as { total_xp: number, level: number };
        // Level curve: Level = floor(sqrt(XP / 100)) + 1.  (0xp=L1, 100xp=L2, 400xp=L3)
        const newLevel = Math.floor(Math.sqrt(user.total_xp / 100)) + 1;

        if (newLevel > user.level) {
            db.prepare('UPDATE user_xp SET level = ? WHERE id = 1').run(newLevel);
            // Return true if level up
            return { leveledUp: true, newLevel };
        }
        return { leveledUp: false, newLevel: user.level };
    });
    return transaction();
}

export interface EnergyCurvePoint {
    hour: number;
    avg_focus: number;
    avg_energy: number;
    sample_size: number;
}

export function getEnergyCurve(): EnergyCurvePoint[] {
    const db = getDatabase();
    const data = db.prepare(`
        SELECT
            strftime('%H', logged_at) as hour,
            AVG(focus_rating) as avg_focus,
            AVG(energy_after) as avg_energy,
            COUNT(*) as cnt
        FROM activity_logs
        WHERE (focus_rating IS NOT NULL OR energy_after IS NOT NULL)
          AND logged_at >= datetime('now', '-30 days')
        GROUP BY hour
        ORDER BY hour
    `).all() as { hour: string; avg_focus: number | null; avg_energy: number | null; cnt: number }[];

    // Fill missing hours
    const result: EnergyCurvePoint[] = [];
    for (let h = 0; h < 24; h++) {
        const hStr = h.toString().padStart(2, '0');
        const found = data.find(d => d.hour === hStr);
        result.push({
            hour: h,
            avg_focus: found?.avg_focus ? Math.round(found.avg_focus * 10) / 10 : 0,
            avg_energy: found?.avg_energy ? Math.round(found.avg_energy * 10) / 10 : 0,
            sample_size: found?.cnt || 0,
        });
    }
    return result;
}

export interface BurnoutRisk {
    risk_level: 'low' | 'medium' | 'high';
    risk_score: number; // 0-100
    factors: string[];
}

export function getBurnoutRisk(): BurnoutRisk {
    const db = getDatabase();
    const factors: string[] = [];
    let score = 0;

    // 1. High Volume: >40h (2400m) rolling 7 days
    const vol = (db.prepare(
        `SELECT SUM(minutes) as total FROM activity_logs WHERE logged_at >= datetime('now', '-7 days')`
    ).get() as { total: number }).total || 0;
    if (vol > 2400) { score += 40; factors.push('High volume (>40h/week)'); }
    else if (vol > 1800) { score += 20; }

    // 2. Low Mood: Avg mood < 2.5 last 7 days
    const mood = (db.prepare(
        `SELECT AVG(mood) as val FROM diary_entries WHERE date >= date('now', '-7 days')`
    ).get() as { val: number }).val;
    if (mood && mood < 2.5) { score += 30; factors.push('Low mood trend'); }

    // 3. Low Energy: Avg energy < 2.5 last 7 days (diary or logs)
    const energy = (db.prepare(
        `SELECT AVG(energy_level) as val FROM diary_entries WHERE date >= date('now', '-7 days')`
    ).get() as { val: number }).val;
    if (energy && energy < 2.5) { score += 20; factors.push('Low energy trend'); }

    // 4. Recovery: Days with <30m deep work in last 7 days (should be some rest)
    // Actually, burnout usually comes from NO rest. Let's check days with 0 logs.
    const activeDays = (db.prepare(
        `SELECT COUNT(DISTINCT date(logged_at)) as cnt FROM activity_logs WHERE logged_at >= datetime('now', '-7 days')`
    ).get() as { cnt: number }).cnt;
    if (activeDays === 7) { score += 10; factors.push('No rest days'); }

    return {
        risk_level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
        risk_score: score,
        factors,
    };
}

export interface BrainLoad {
    current_load: number; // 0-100%
    status: 'optimal' | 'high' | 'overload';
    suggestion: string;
}

export function getBrainLoad(): BrainLoad {
    const db = getDatabase();
    // Calculate cognitive load for TODAY
    // Coding/Study = 1.5x, others = 0.5x
    const logs = db.prepare(`
        SELECT l.minutes, a.category, a.name
        FROM activity_logs l
        JOIN activities a ON l.activity_id = a.id
        WHERE date(l.logged_at, 'localtime') = date('now', 'localtime')
    `).all() as { minutes: number; category: string; name: string }[];

    let loadUnits = 0;
    logs.forEach(l => {
        const isHighLoad = l.category === 'Work' || l.category === 'Study' || l.name.includes('Code') || l.name.includes('Deep');
        loadUnits += l.minutes * (isHighLoad ? 1.5 : 0.5);
    });

    // Capacity: arbitrary 6 hours of deep work equivalent (360 units) = 100%
    const capacity = 360;
    const current_load = Math.min(Math.round((loadUnits / capacity) * 100), 100);

    let status: BrainLoad['status'] = 'optimal';
    let suggestion = 'You have mental capacity available.';

    if (current_load > 90) {
        status = 'overload';
        suggestion = 'Brain fried. Switch to low-focus tasks or rest.';
    } else if (current_load > 60) {
        status = 'high';
        suggestion = 'High load. Consider a break soon.';
    }

    return { current_load, status, suggestion };
}

export function getTopicDistribution(days = 30) {
    const db = getDatabase();
    // Get distribution of time by Topic (or Subject if Topic is null)
    // We'll use activities 'category' as high level, but user wants "Topic Saturation".
    // Let's use 'activity name' as the topic for now, or 'subject' from test scores?
    // User context implies 'studying', so let's use Activity Names where category='Study' or 'Work'

    const data = db.prepare(`
        SELECT a.name as topic, SUM(l.minutes) as total_minutes
        FROM activity_logs l
        JOIN activities a ON l.activity_id = a.id
        WHERE l.logged_at >= date('now', '-' || ? || ' days')
        GROUP BY a.name
        ORDER BY total_minutes DESC
        LIMIT 10
    `).all(days) as { topic: string, total_minutes: number }[];

    const total = data.reduce((sum, d) => sum + d.total_minutes, 0);
    return data.map(d => ({
        topic: d.topic,
        percentage: total > 0 ? Math.round((d.total_minutes / total) * 100) : 0,
        minutes: d.total_minutes
    }));
}

// ─── Custom Metrics ─────────────────────────────────────────

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

export function createMetric(name: string, unit: string, type = 'number', target?: number): number {
    const db = getDatabase();
    const info = db.prepare(
        `INSERT INTO custom_metrics (name, unit, type, target) VALUES (?, ?, ?, ?)`
    ).run(name, unit, type, target);
    return info.lastInsertRowid as number;
}

export function getMetrics(includeArchived = false): CustomMetric[] {
    const db = getDatabase();
    if (includeArchived) {
        return db.prepare(`SELECT * FROM custom_metrics ORDER BY created_at DESC`).all() as CustomMetric[];
    }
    return db.prepare(`SELECT * FROM custom_metrics WHERE archived = 0 ORDER BY created_at DESC`).all() as CustomMetric[];
}

export function toggleMetricArchive(id: number, archived: boolean): void {
    const db = getDatabase();
    db.prepare(`UPDATE custom_metrics SET archived = ? WHERE id = ?`).run(archived ? 1 : 0, id);
}

export function logMetric(metricId: number, value: number, note?: string): number {
    const db = getDatabase();
    const info = db.prepare(
        `INSERT INTO metric_logs (metric_id, value, note) VALUES (?, ?, ?)`
    ).run(metricId, value, note);
    return info.lastInsertRowid as number;
}

export function getMetricLogs(metricId: number, days = 30): MetricLog[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM metric_logs 
        WHERE metric_id = ? AND logged_at >= date('now', '-' || ? || ' days')
        ORDER BY logged_at DESC
    `).all(metricId, days) as MetricLog[];
}

export function getMetricStats(metricId: number): { today: number; avg: number; streak: number } {
    const db = getDatabase();
    // Today
    const today = db.prepare(`
        SELECT SUM(value) as val FROM metric_logs 
        WHERE metric_id = ? AND date(logged_at, 'localtime') = date('now', 'localtime')
    `).get(metricId) as { val: number };

    // Avg last 30 days
    const avg = db.prepare(`
        SELECT AVG(value) as val FROM metric_logs 
        WHERE metric_id = ? AND logged_at >= date('now', '-30 days')
    `).get(metricId) as { val: number };

    // Simple streak (consecutive days with any log)
    // Detailed streak logic is complex, approximating here
    return {
        today: today?.val || 0,
        avg: Math.round((avg?.val || 0) * 10) / 10,
        streak: 0 // Placeholder or calculate properly
    };
}

// ─── Reminders System ─────────────────────────────────────────

export interface Reminder {
    id: number;
    title: string;
    time: string;
    days: string;
    is_active: number;
    created_at: string;
}

export function getReminders(): Reminder[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM reminders ORDER BY time ASC').all() as Reminder[];
}

export function addReminder(title: string, time: string, days: string): number {
    const db = getDatabase();
    const info = db.prepare(
        'INSERT INTO reminders (title, time, days, is_active) VALUES (?, ?, ?, 1)'
    ).run(title, time, days);
    return info.lastInsertRowid as number;
}

export function toggleReminder(id: number, isActive: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE reminders SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
}

export function deleteReminder(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
}
