import cron from 'node-cron';
import { Notification } from 'electron';
import { getDashboardData, getSetting, getReminders } from '../db/queries';

let scheduledJob: cron.ScheduledTask | null = null;
let reminderJob: cron.ScheduledTask | null = null;

export function startScheduler(): void {
    const summaryTime = getSetting('daily_summary_time') || '21:00';
    const [hours, minutes] = summaryTime.split(':').map(Number);

    scheduledJob = cron.schedule(`${minutes} ${hours} * * *`, () => {
        sendDailySummary();
    });

    // Check reminders every minute
    reminderJob = cron.schedule('* * * * *', () => {
        checkReminders();
    });

    console.log(`[Scheduler] Daily summary at ${summaryTime}, Reminders active`);
}

export function stopScheduler(): void {
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }
    if (reminderJob) {
        reminderJob.stop();
        reminderJob = null;
    }
}

function checkReminders(): void {
    try {
        const reminders = getReminders();
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)

        for (const r of reminders) {
            if (!r.is_active) continue;

            // Check time match
            if (r.time !== currentTime) continue;

            // Check day match
            let daysArr: number[] = [];
            try {
                daysArr = JSON.parse(r.days || '[]');
            } catch { }

            if (daysArr.length > 0 && !daysArr.includes(currentDay)) continue;

            // Trigger notification
            if (Notification.isSupported()) {
                new Notification({
                    title: '🔔 AI Tracker Reminder',
                    body: r.title,
                    silent: false
                }).show();
            }
        }
    } catch (err) {
        console.error('[Scheduler] Reminder check error:', err);
    }
}

function sendDailySummary(): void {
    try {
        const data = getDashboardData();

        if (!Notification.isSupported()) return;

        const activitySummary = data.today_by_activity
            .slice(0, 3)
            .map(a => `${a.icon} ${a.name}: ${a.minutes}m`)
            .join(', ');

        const title = `📊 Daily Summary — ${data.today_minutes} minutes today`;
        const body = data.today_minutes > 0
            ? `Top activities: ${activitySummary}. ${data.current_streak}-day streak! 🔥`
            : 'No activities logged today. Start tracking to build your streak!';

        new Notification({ title, body }).show();
    } catch (err) {
        console.error('[Scheduler] Summary error:', err);
    }
}
