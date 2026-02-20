import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useTheme } from '../hooks/useTheme';

export default function Settings() {
    const api = useApi();
    const { theme, setTheme } = useTheme();

    // AI Settings
    const [aiProvider, setAiProvider] = useState<'fireworks' | 'openai' | 'google' | 'anthropic'>('fireworks');
    const [fireworksApiKey, setFireworksApiKey] = useState('');
    const [fireworksModel, setFireworksModel] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [openaiModel, setOpenaiModel] = useState('');
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [googleModel, setGoogleModel] = useState('');
    const [anthropicApiKey, setAnthropicApiKey] = useState('');
    const [anthropicModel, setAnthropicModel] = useState('');

    // Telegram Settings
    const [telegramToken, setTelegramToken] = useState('');

    // Summary
    const [summaryTime, setSummaryTime] = useState('21:00');

    // App info
    const [appInfo, setAppInfo] = useState<{ version: string; dataPath: string; isPackaged: boolean } | null>(null);
    const [saved, setSaved] = useState('');

    useEffect(() => { loadSettings(); }, []);

    async function loadSettings() {
        const [
            provider,
            fwKey, fwModel,
            oaiKey, oaiModel,
            gooKey, gooModel,
            antKey, antModel,
            tgToken, time, info
        ] = await Promise.all([
            api.getSetting('ai_provider'),
            api.getSetting('fireworks_api_key'),
            api.getSetting('fireworks_model'),
            api.getSetting('openai_api_key'),
            api.getSetting('openai_model'),
            api.getSetting('google_api_key'),
            api.getSetting('google_model'),
            api.getSetting('anthropic_api_key'),
            api.getSetting('anthropic_model'),
            api.getSetting('telegram_bot_token'),
            api.getSetting('daily_summary_time'),
            api.getAppInfo(),
        ]);

        if (provider) setAiProvider(provider as any);
        if (fwKey) setFireworksApiKey(fwKey);
        if (fwModel) setFireworksModel(fwModel);
        if (oaiKey) setOpenaiApiKey(oaiKey);
        if (oaiModel) setOpenaiModel(oaiModel);
        if (gooKey) setGoogleApiKey(gooKey);
        if (gooModel) setGoogleModel(gooModel);
        if (antKey) setAnthropicApiKey(antKey);
        if (antModel) setAnthropicModel(antModel);

        if (tgToken) setTelegramToken(tgToken);
        if (time) setSummaryTime(time);
        setAppInfo(info);
    }

    async function saveAiSettings() {
        await api.setSetting('ai_provider', aiProvider);
        await api.setSetting('fireworks_api_key', fireworksApiKey);
        await api.setSetting('fireworks_model', fireworksModel);
        await api.setSetting('openai_api_key', openaiApiKey);
        await api.setSetting('openai_model', openaiModel);
        await api.setSetting('google_api_key', googleApiKey);
        await api.setSetting('google_model', googleModel);
        await api.setSetting('anthropic_api_key', anthropicApiKey);
        await api.setSetting('anthropic_model', anthropicModel);
        if (telegramToken) await api.setSetting('telegram_bot_token', telegramToken);

        flash('AI & Telegram settings saved. Please restart the app if you changed the Telegram Bot token.');
    }

    async function saveSummaryTime() {
        await api.setSetting('daily_summary_time', summaryTime);
        flash('Summary time saved');
    }

    function flash(msg: string) {
        setSaved(msg);
        setTimeout(() => setSaved(''), 3000);
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold text-text">Settings</h1>
                <p className="text-sm text-text-dim mt-0.5">Configure your AI tracker</p>
            </div>

            {saved && (
                <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                    ✅ {saved}
                </div>
            )}

            {/* Theme Settings */}
            <section className="glass rounded-xl p-5 space-y-3">
                <div>
                    <h2 className="text-sm font-semibold text-text">🎨 Appearance</h2>
                    <p className="text-xs text-text-dim mt-0.5">Customize how the app looks</p>
                </div>
                <div className="flex gap-2 p-1 bg-surface rounded-lg border border-white/5 w-fit">
                    {(['light', 'dark', 'system'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`px-4 py-1.5 rounded-md text-sm capitalize transition-all ${theme === t
                                ? 'bg-accent/20 text-accent font-medium shadow-glow-sm'
                                : 'text-text-dim hover:text-text hover:bg-white/5'
                                }`}
                        >
                            {t === 'system' ? '💻 System' : t === 'light' ? '☀️ Light' : '🌙 Dark'}
                        </button>
                    ))}
                </div>
            </section>

            {/* AI Provider Settings */}
            <section className="glass rounded-xl p-5 space-y-4">
                <div>
                    <h2 className="text-sm font-semibold text-text">🤖 AI Provider</h2>
                    <p className="text-xs text-text-dim mt-0.5">Select your preferred AI powerhouse</p>
                </div>

                <div className="flex gap-2 p-1 bg-surface rounded-lg border border-white/5 w-full overflow-x-auto">
                    {(['fireworks', 'openai', 'google', 'anthropic'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setAiProvider(p)}
                            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all flex-1 whitespace-nowrap ${aiProvider === p
                                ? 'bg-accent text-white shadow-glow-sm'
                                : 'text-text-dim hover:text-text hover:bg-white/5'
                                }`}
                        >
                            {p === 'fireworks' ? '🎆 Fireworks' : p === 'openai' ? '🟢 OpenAI' : p === 'google' ? '🔵 Google' : '🟠 Anthropic'}
                        </button>
                    ))}
                </div>

                <div className="space-y-3 p-4 bg-surface rounded-lg border border-white/5">
                    {aiProvider === 'fireworks' && (
                        <>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">🎆 Fireworks.ai API Key</label>
                                <input
                                    type="password"
                                    value={fireworksApiKey}
                                    onChange={e => setFireworksApiKey(e.target.value)}
                                    placeholder="fw_..."
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Model Override (Default: llama-v3p3-70b-instruct)</label>
                                <input
                                    value={fireworksModel}
                                    onChange={e => setFireworksModel(e.target.value)}
                                    placeholder="accounts/fireworks/models/llama-v3p3-70b-instruct"
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                        </>
                    )}

                    {aiProvider === 'openai' && (
                        <>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">🟢 OpenAI API Key</label>
                                <input
                                    type="password"
                                    value={openaiApiKey}
                                    onChange={e => setOpenaiApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Model Override (Default: gpt-4o-mini)</label>
                                <input
                                    value={openaiModel}
                                    onChange={e => setOpenaiModel(e.target.value)}
                                    placeholder="gpt-4o-mini"
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                        </>
                    )}

                    {aiProvider === 'google' && (
                        <>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">🔵 Google Gemini API Key</label>
                                <input
                                    type="password"
                                    value={googleApiKey}
                                    onChange={e => setGoogleApiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Model Override (Default: gemini-1.5-flash)</label>
                                <input
                                    value={googleModel}
                                    onChange={e => setGoogleModel(e.target.value)}
                                    placeholder="gemini-1.5-flash"
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                        </>
                    )}

                    {aiProvider === 'anthropic' && (
                        <>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">🟠 Anthropic API Key</label>
                                <input
                                    type="password"
                                    value={anthropicApiKey}
                                    onChange={e => setAnthropicApiKey(e.target.value)}
                                    placeholder="sk-ant-..."
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim block mb-1">Model Override (Default: claude-3-5-sonnet-20241022)</label>
                                <input
                                    value={anthropicModel}
                                    onChange={e => setAnthropicModel(e.target.value)}
                                    placeholder="claude-3-5-sonnet-20241022"
                                    className="w-full px-3 py-2 rounded-lg bg-base border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-2 border-t border-white/5 mt-4">
                    <h2 className="text-sm font-semibold text-text mb-1">📱 Telegram Bot Integration</h2>
                    <p className="text-xs text-text-dim mb-3">Message @BotFather on Telegram to create a Bot and paste the HTTP API Token below:</p>
                    <input
                        type="password"
                        value={telegramToken}
                        onChange={e => setTelegramToken(e.target.value)}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40 font-mono"
                    />
                </div>

                <div className="pt-2">
                    <button onClick={saveAiSettings} className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 shadow-glow-sm transition-all focus:scale-95">
                        Save Identity & Integration Settings
                    </button>
                </div>
            </section>

            {/* Daily Summary */}
            <section className="glass rounded-xl p-5 space-y-3">
                <div>
                    <h2 className="text-sm font-semibold text-text">📊 Daily Summary Notification</h2>
                    <p className="text-xs text-text-dim mt-0.5">Get a notification with your daily activity summary</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="time"
                        value={summaryTime}
                        onChange={e => setSummaryTime(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none"
                    />
                    <button onClick={saveSummaryTime} className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30">
                        Set
                    </button>
                </div>
            </section>

            {/* Data Export */}
            <section className="glass rounded-xl p-5 space-y-3">
                <div>
                    <h2 className="text-sm font-semibold text-text">💾 Data Export</h2>
                    <p className="text-xs text-text-dim mt-0.5">Download all your data (activities, logs, diary, test scores) for backup or analysis.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={async () => {
                            const data = await api.exportData();
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ai-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            flash('Data exported as JSON');
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text text-sm hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <span>📦</span> Export JSON
                    </button>
                    <button
                        onClick={async () => {
                            const data = await api.exportData();
                            const headers = ['id', 'activity_name', 'minutes', 'date', 'notes'];
                            const rows = (data.activity_logs as any[]).map(l =>
                                [l.id, l.activity_name, l.minutes, l.logged_at, `"${(l.notes || '').replace(/"/g, '""')}"`].join(',')
                            );
                            const csv = [headers.join(','), ...rows].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ai-tracker-logs-${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                            flash('Logs exported as CSV');
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text text-sm hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <span>📄</span> Export Logs CSV
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            <section className="glass rounded-xl p-5 space-y-3 border border-red-500/10">
                <h2 className="text-sm font-semibold text-red-400">⚠️ Data</h2>
                <p className="text-xs text-text-dim">
                    All data is stored locally. Database location: <code className="text-text-dim/80">{appInfo?.dataPath || '...'}/ai-study-tracker/tracker.db</code>
                </p>
            </section>

            {/* App Info */}
            <section className="glass rounded-xl p-5">
                <h2 className="text-sm font-semibold text-text mb-2">About</h2>
                <div className="text-xs text-text-dim space-y-1">
                    <p>AI Tracker v{appInfo?.version || '1.0.0'}</p>
                    <p>Built with Electron + React + Vite</p>
                    <p>Data: {appInfo?.isPackaged ? 'Packaged' : 'Development'} mode</p>
                </div>
            </section>
        </div>
    );
}
