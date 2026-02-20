import { Bot, Context } from 'grammy';
import { BrowserWindow } from 'electron';
import {
    getSetting,
    getActivities,
    logActivity,
    getMetrics,
    logMetric,
    getGoals,
    upsertDiaryEntry,
    addReminder
} from '../db/queries';
import { generateCompletion } from '../api/ai-provider';

let bot: Bot | null = null;
let isRunning = false;

export async function startTelegramBot(): Promise<void> {
    if (isRunning) return;

    try {
        const token = getSetting('telegram_bot_token');
        if (!token) {
            console.log('[Telegram Bot] No token found. Bot will not start.');
            return;
        }

        bot = new Bot(token);

        bot.command('start', (ctx: Context) => {
            ctx.reply('🤖 Welcome to AI Tracker (Omni-Logger)!\n\nI can help you do any of the following just by chatting:\n- Log an activity ("I studied Polity for 90m")\n- Track a custom metric ("Drank 2L of water")\n- Write to your daily diary ("I feel great today!")\n- Set a reminder ("Remind me tomorrow at 9:00 to read")\n- Start a timer ("Start a 25m pomodoro for coding")');
        });

        bot.on('message:text', async (ctx: Context) => {
            const userMsg = ctx.message?.text;
            if (!userMsg) return;

            console.log('[Telegram Bot] Received:', userMsg);

            ctx.reply('Thinking... 🧠');
            const result = await processTelegramMessage(userMsg);
            ctx.reply(result);
        });

        bot.catch((err: any) => {
            console.error('[Telegram Bot Error]', err);
        });

        bot.start();
        isRunning = true;
        console.log('[Telegram Bot] Started successfully');
    } catch (err: any) {
        console.error('[Telegram Bot] Failed to start:', err);
    }
}

export function stopTelegramBot(): void {
    if (bot && isRunning) {
        bot.stop();
        isRunning = false;
        console.log('[Telegram Bot] Stopped');
    }
}

async function processTelegramMessage(text: string): Promise<string> {
    try {
        // Fetch context
        const existingActivities = getActivities();
        const existingMetrics = getMetrics();
        const existingGoals = getGoals().filter(g => g.status === 'active');

        const activityListStr = existingActivities.map((a: any) => `ID: ${a.id} | Name: ${a.name}`).join('\n');
        const metricListStr = existingMetrics.map((m: any) => `ID: ${m.id} | Name: ${m.name} | Unit: ${m.unit}`).join('\n');
        const goalListStr = existingGoals.map((g: any) => `ID: ${g.id} | Title: ${g.title}`).join('\n');

        const systemPrompt = `
        You are an Omni-Logger for a productivity tracker app. 
        Read the user's natural language message and figure out which of the 5 actions they want to take.
        
        AVAILABLE CONTEXT IN THEIR DATABASE:
        - Activities:
        ${activityListStr || "None setup yet."}
        - Metrics:
        ${metricListStr || "None setup yet."}
        - Active Goals:
        ${goalListStr || "None setup yet."}

        OUTPUT EXACTLY ONE OF THESE JSON FORMATS:

        1. If they are describing time spent on an activity:
        { "action": "log_activity", "activity_id": <number>, "minutes": <number>, "notes": "<string or null>" }
        
        2. If they are logging a specific custom metric (like drinking water, pushups, weight):
        { "action": "log_metric", "metric_id": <number>, "value": <number>, "notes": "<string or null>" }
        
        3. If they are just journaling, sharing their feelings, mood (1-5), energy (1-5), or day's summary:
        { "action": "log_diary", "mood": <number 1-5 or null>, "energy": <number 1-5 or null>, "content": "<their diary entry text>" }

        4. If they want to set a reminder at a specific time (HH:MM format) and days (e.g. "0,1,2,3,4,5,6" for every day, or specific days):
        { "action": "add_reminder", "title": "<string>", "time": "<HH:MM>", "days": "<string of days 0=Sun>" }

        5. If they want to START a pomodoro timer or a focus session right now:
        { "action": "start_pomodoro", "activity_id": <number>, "minutes": <number> }
        
        6. If they want to STOP, END, or TERMINATE a currently running pomodoro timer or focus session:
        { "action": "stop_pomodoro" }
        
        7. If you cannot figure out what to do, or it's just chatting:
        { "action": "reply", "message": "I am an omni-logger! Tell me to log an activity, metric, diary entry, or reminder." }`;

        const userPrompt = `USER MESSAGE: "${text}"`;

        let rawResponse = await generateCompletion(systemPrompt, userPrompt);

        // Strip out json markdown block if the AI returned it despite instructions (like Gemini does)
        const resultString = rawResponse.replace(/^\`\`\`json/i, '').replace(/^\`\`\`/i, '').replace(/\`\`\`$/i, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(resultString);
        } catch (e) {
            return `❌ I couldn't understand the AI's response format: ${resultString}`;
        }

        switch (parsed.action) {
            case 'log_activity': {
                const minutes = parseInt(parsed.minutes, 10);
                const actId = parseInt(parsed.activity_id, 10);
                if (isNaN(minutes) || isNaN(actId)) return `❌ Failed to parse minutes or activity ID.`;

                logActivity({ activity_id: actId, minutes, notes: parsed.notes || 'Logged via Telegram', source: 'telegram' });
                const actName = existingActivities.find((a: any) => a.id === actId)?.name || `Activity #${actId}`;
                return `✅ Logged ${minutes}m of ${actName}!`;
            }

            case 'log_metric': {
                const val = parseFloat(parsed.value);
                const metId = parseInt(parsed.metric_id, 10);
                if (isNaN(val) || isNaN(metId)) return `❌ Failed to parse metric value or ID.`;

                logMetric(metId, val, parsed.notes || 'Logged via Telegram');
                const metName = existingMetrics.find((m: any) => m.id === metId)?.name || `Metric #${metId}`;
                return `✅ Logged ${val} for ${metName}!`;
            }

            case 'log_diary': {
                const today = new Date().toISOString().split('T')[0];
                upsertDiaryEntry({
                    date: today,
                    mood: parsed.mood || undefined,
                    energy_level: parsed.energy || undefined,
                    content: parsed.content || 'Logged via Telegram'
                });
                return `📝 Diary entry saved for today!`;
            }

            case 'start_pomodoro': {
                const minutes = parseInt(parsed.minutes, 10);
                const actId = parseInt(parsed.activity_id, 10);
                if (isNaN(minutes) || isNaN(actId)) return `❌ Failed to parse minutes or activity ID.`;

                const wins = BrowserWindow.getAllWindows();
                if (wins.length > 0) {
                    wins[0].webContents.send('start-pomodoro', { activity_id: actId, minutes });
                    if (wins[0].isMinimized()) wins[0].restore();
                    wins[0].show();
                    wins[0].focus();
                }
                const actName = existingActivities.find((a: any) => a.id === actId)?.name || `Activity #${actId}`;
                return `🍅 Started a ${minutes}m Pomodoro for ${actName}! Redirecting interface now.`;
            }

            case 'stop_pomodoro': {
                const wins = BrowserWindow.getAllWindows();
                if (wins.length > 0) {
                    wins[0].webContents.send('stop-pomodoro');
                }
                return `🛑 Pomodoro timer stopped. Don't forget to submit your debrief if needed!`;
            }

            case 'add_reminder': {
                const title = parsed.title || 'Telegram Reminder';
                const time = parsed.time || '12:00';
                const days = parsed.days || '0,1,2,3,4,5,6';
                addReminder(title, time, days);
                return `⏰ Reminder set for ${title} at ${time}.`;
            }

            case 'reply':
                return parsed.message || "I am here!";

            default:
                return "I understood your message, but I don't know how to handle that action yet.";
        }

    } catch (err: any) {
        console.error('[Telegram Handler Error]', err);
        return `❌ An error occurred: ${err.message}`;
    }
}
