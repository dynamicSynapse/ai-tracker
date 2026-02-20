import React, { useState, useEffect } from 'react';
import { useApi, CustomMetric, MetricLog, MetricStats } from '../hooks/useApi';

function MetricCard({ metric }: { metric: CustomMetric }) {
    const api = useApi();
    const [stats, setStats] = useState<MetricStats | null>(null);
    const [todayValue, setTodayValue] = useState<string>('');
    const [logs, setLogs] = useState<MetricLog[]>([]);

    useEffect(() => {
        loadData();
    }, [metric.id]);

    async function loadData() {
        try {
            const [s, l] = await Promise.all([
                api.getMetricStats(metric.id),
                api.getMetricLogs(metric.id, 14) // 2 weeks
            ]);
            setStats(s);
            setLogs(l);
            // Check if logged today
            const todayLog = l.find(log => new Date(log.logged_at).toDateString() === new Date().toDateString());
            if (todayLog) setTodayValue(todayLog.value.toString());
        } catch (e) { console.error(e); }
    }

    async function handleLog() {
        if (!todayValue) return;
        const val = parseFloat(todayValue);
        if (isNaN(val)) return;

        try {
            await api.logMetric(metric.id, val);
            loadData(); // refresh
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="glass rounded-xl p-5 hover:bg-white/5 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-text mb-0.5">{metric.name}</h3>
                    <p className="text-xs text-text-dim px-1.5 py-0.5 rounded bg-white/5 inline-block">{metric.unit}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-accent">{stats?.today || '-'}</p>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider">Today</p>
                </div>
            </div>

            {/* Sparkline approximation using flex div columns */}
            <div className="h-12 flex items-end gap-1 mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                {logs.length > 0 ? (
                    Array.from({ length: 14 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (13 - i));
                        const log = logs.find(l => new Date(l.logged_at).toDateString() === date.toDateString());
                        const height = log ? Math.min(100, (log.value / ((stats?.avg || 1) * 2)) * 100) : 0;

                        return (
                            <div key={i} className="flex-1 bg-white/5 rounded-t-sm relative group/bar hover:bg-accent/40" style={{ height: `${Math.max(4, height)}%` }}>
                                {log && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] text-white whitespace-nowrap hidden group-hover/bar:block z-10">
                                        {log.value} {metric.unit}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full text-center text-xs text-text-dim italic self-center">No recent data</div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <input
                    type="number"
                    value={todayValue}
                    onChange={e => setTodayValue(e.target.value)}
                    placeholder="Log value..."
                    className="flex-1 bg-base text-sm px-3 py-2 rounded-lg border border-white/10 focus:border-accent outline-none transition-colors"
                />
                <button
                    onClick={handleLog}
                    className="px-4 py-2 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg text-sm font-medium transition-colors"
                >
                    Save
                </button>
            </div>

            <div className="mt-3 flex gap-4 text-xs text-text-dim border-t border-white/5 pt-3">
                <span>Avg: <span className="text-text">{stats?.avg || '-'}</span></span>
                {/* <span>Streak: <span className="text-text">{stats?.streak || 0}</span></span> */}
            </div>
        </div>
    );
}

export default function Metrics() {
    const api = useApi();
    const [metrics, setMetrics] = useState<CustomMetric[]>([]);
    const [showCreate, setShowCreate] = useState(false);

    // Create Form State
    const [newName, setNewName] = useState('');
    const [newUnit, setNewUnit] = useState('');
    const [newType, setNewType] = useState('number');

    useEffect(() => {
        loadMetrics();
    }, []);

    async function loadMetrics() {
        try {
            const m = await api.getMetrics();
            setMetrics(m);
        } catch (e) { console.error(e); }
    }

    async function handleCreate() {
        if (!newName) return;
        try {
            await api.createMetric(newName, newUnit || 'count', newType);
            setNewName(''); setNewUnit(''); setShowCreate(false);
            loadMetrics();
        } catch (e) { console.error(e); }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8 animate-fade-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Quantified Self</h1>
                    <p className="text-sm text-text-dim mt-0.5">Track custom metrics, habits, and biomarkers</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-accent text-base font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-accent/20"
                >
                    + New Metric
                </button>
            </div>

            {/* Create Modal Overlay */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass bg-surface border-white/10 p-6 rounded-2xl w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-text">Create New Metric</h2>

                        <div className="space-y-1">
                            <label className="text-xs text-text-dim uppercase tracking-wider">Name</label>
                            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-base border border-white/10 rounded-lg px-3 py-2 text-text focus:border-accent outline-none" placeholder="e.g. Water Intake" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-text-dim uppercase tracking-wider">Unit</label>
                            <input value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-full bg-base border border-white/10 rounded-lg px-3 py-2 text-text focus:border-accent outline-none" placeholder="e.g. liters, pages, reps" />
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-text-dim hover:text-text">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-accent text-black font-bold rounded-lg hover:brightness-110">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {metrics.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center border-dashed border border-white/10">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-text mb-2">No metrics yet</h3>
                    <p className="text-text-dim max-w-sm mx-auto mb-6">Start tracking anything—fitness stats, reading pages, coffee cups, or meditation minutes.</p>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-text transition-colors">Create First Metric</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {metrics.map(m => (
                        <MetricCard key={m.id} metric={m} />
                    ))}
                </div>
            )}
        </div>
    );
}
