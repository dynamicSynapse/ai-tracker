import { getSetting, getTimetableSlots, getGoals, getWeeklyAdherence } from '../db/queries';
import { generateCompletion } from './ai-provider';

export interface AIInsight {
    summary: string;
    error?: string;
}

export async function analyzeTrends(activityData: {
    activities: { name: string; total_minutes: number; sessions: number; streak: number }[];
    today_minutes: number;
    week_minutes: number;
    month_minutes: number;
    current_streak: number;
}): Promise<AIInsight> {
    const systemPrompt = `You are a personal productivity coach analyzing habit tracking data. Be encouraging, specific, and actionable. Keep your response under 200 words. Use emoji for visual appeal.`;

    const userPrompt = `Here's the user's data:
- Today: ${activityData.today_minutes} minutes logged
- This week: ${activityData.week_minutes} minutes
- This month: ${activityData.month_minutes} minutes  
- Current streak: ${activityData.current_streak} consecutive days

Activity breakdown:
${activityData.activities.map(a => `- ${a.name}: ${a.total_minutes} min total, ${a.sessions} sessions, ${a.streak}-day streak`).join('\n')}

Provide:
1. A brief trend analysis (what's going well, what needs attention)
2. One specific, actionable suggestion
3. A motivational note`;

    try {
        const content = await generateCompletion(systemPrompt, userPrompt);
        return { summary: content };
    } catch (err: any) {
        console.error('[AI] Request failed:', err);
        return { summary: '', error: err.message || 'Failed to connect to AI Provider' };
    }
}

export async function analyzeScheduleAdherence(
    weeklyAdherence: { date: string; adherence_pct: number; planned_minutes: number; completed_minutes: number; slots: { activity_name: string; planned_minutes: number; logged_minutes: number; status: string }[] }[],
    dashboard: { today_minutes: number; current_streak: number },
): Promise<AIInsight> {
    const scheduleBreakdown = weeklyAdherence.map(day => {
        const slotDetails = day.slots.map(s =>
            `  - ${s.activity_name}: planned ${s.planned_minutes}m, done ${s.logged_minutes}m (${s.status})`
        ).join('\n');
        return `${day.date} (adherence: ${day.adherence_pct}%, planned: ${day.planned_minutes}m, done: ${day.completed_minutes}m)\n${slotDetails || '  - No slots scheduled'}`;
    }).join('\n\n');

    const systemPrompt = `You are a productivity coach analyzing schedule adherence data. Be encouraging but honest. Under 250 words. Use emoji.`;

    const userPrompt = `User's timetable adherence for the last 7 days:
${scheduleBreakdown}

Current streak: ${dashboard.current_streak} days
Today's total: ${dashboard.today_minutes} minutes

Provide:
1. Overall schedule adherence pattern (which days/activities are strong vs weak)
2. Specific areas where the user is falling behind their schedule
3. Two actionable suggestions to improve adherence
4. A motivational note`;

    try {
        const content = await generateCompletion(systemPrompt, userPrompt);
        return { summary: content };
    } catch (err: any) {
        console.error('[AI] Schedule analysis failed:', err);
        return { summary: '', error: err.message || 'Failed to connect to AI Provider' };
    }
}

export async function analyzeTestPerformance(
    summary: { count: number; avg_percentage: number; best_percentage: number; worst_percentage: number; total_tests_prelims: number; total_tests_mains: number; by_subject: { subject: string; count: number; avg_pct: number; best_pct: number }[] },
    trends: { date: string; percentage: number; subject: string }[],
): Promise<AIInsight> {
    if (summary.count === 0) {
        return { summary: '', error: 'No test scores recorded yet. Add some test results first!' };
    }

    const subjectBreakdown = summary.by_subject.map(s =>
        `- ${s.subject}: ${s.count} tests, avg ${s.avg_pct}%, best ${s.best_pct}%`
    ).join('\n');

    const recentTrends = trends.slice(-20).map(t =>
        `  ${t.date}: ${t.percentage}% (${t.subject})`
    ).join('\n');

    const systemPrompt = `You are a UPSC exam coach analyzing test performance data. Be encouraging but provide specific, actionable advice. Under 300 words. Use emoji.`;

    const userPrompt = `Overall Performance:
- Total tests: ${summary.count} (Prelims: ${summary.total_tests_prelims}, Mains: ${summary.total_tests_mains})
- Average score: ${summary.avg_percentage}%
- Best score: ${summary.best_percentage}%
- Worst score: ${summary.worst_percentage}%

Subject-wise breakdown:
${subjectBreakdown}

Recent score trends:
${recentTrends}

Provide:
1. Overall performance assessment — is the student improving?
2. Strongest and weakest subjects with specific advice
3. Score pattern analysis (consistency, volatility, improvement trajectory)
4. Two specific study strategies to improve weak areas
5. A motivational note about their progress`;

    try {
        const content = await generateCompletion(systemPrompt, userPrompt);
        return { summary: content };
    } catch (err: any) {
        console.error('[AI] Test analysis failed:', err);
        return { summary: '', error: err.message || 'Failed to connect to AI Provider' };
    }
}

export async function autoSchedule(): Promise<{ summary: string; slots: any[]; error?: string }> {
    try {
        // 1. Get Context
        const goals = getGoals().filter(g => g.status === 'active');
        const adherence = getWeeklyAdherence();
        const slots = getTimetableSlots(new Date().getDay());

        const systemPrompt = `You are an elite productivity scheduler. Return ONLY a JSON object evaluating gaps and suggesting new sessions. Do not include markdown formatting or backticks around the JSON.`;

        const userPrompt = `GOALS:
${JSON.stringify(goals.map(g => ({ title: g.title, priority: g.priority })))}

CURRENT ADHERENCE (Last 7 days):
${JSON.stringify(adherence.map(a => ({ date: a.date, score: a.adherence_pct })))}

EXISTING SLOTS FOR TODAY:
${JSON.stringify(slots.map(s => ({ start: s.start_time, end: s.end_time, activity: s.activity_name })))}

TASK:
Suggest 3-5 new 60-minute blocks to fill gaps in today's schedule. Focus on high priority goals that are under-served.
Return JSON format EXACTLY like this (nothing else):
{ "summary": "rationale", "slots": [{ "start": "HH:MM", "end": "HH:MM", "activity": "Name" }] }`;

        const contentString = await generateCompletion(systemPrompt, userPrompt);

        // Strip out json markdown block if the AI returned it despite instructions
        const cleanJsonString = contentString.replace(/^\`\`\`json/i, '').replace(/^\`\`\`/i, '').replace(/\`\`\`$/i, '').trim();

        const content = JSON.parse(cleanJsonString);
        return { summary: content.summary, slots: content.slots };

    } catch (err: any) {
        console.error('[AI] Auto-schedule failed:', err);
        return { summary: '', slots: [], error: err.message || 'Failed to connect to AI Provider' };
    }
}
