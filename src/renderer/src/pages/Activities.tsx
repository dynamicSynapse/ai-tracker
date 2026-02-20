import React, { useState, useEffect } from 'react';
import { useApi, ActivityRow, ActivityStats } from '../hooks/useApi';

const CATEGORIES = ['study', 'fitness', 'test', 'other'];
const ICONS = ['📚', '📰', '🌍', '📝', '✍️', '💪', '🧘', '🏃', '🎯', '🧠', '📌', '🎵', '🎮', '💻', '🍳'];
const COLORS = ['#6C63FF', '#00B4D8', '#FF6B6B', '#F77F00', '#06D6A0', '#8338EC', '#FB5607', '#E63946', '#457B9D'];

export default function Activities() {
    const api = useApi();
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [stats, setStats] = useState<Record<number, ActivityStats>>({});
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('other');
    const [newIcon, setNewIcon] = useState('📌');
    const [newColor, setNewColor] = useState('#6C63FF');
    const [newTarget, setNewTarget] = useState(0);

    // For quick log
    const [logActivityId, setLogActivityId] = useState<number | null>(null);
    const [logMinutes, setLogMinutes] = useState('');
    const [logNotes, setLogNotes] = useState('');

    useEffect(() => { loadActivities(); }, []);

    async function loadActivities() {
        const acts = await api.getActivities();
        setActivities(acts);
        const s: Record<number, ActivityStats> = {};
        for (const a of acts) {
            s[a.id] = await api.getActivityStats(a.id);
        }
        setStats(s);
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        await api.createActivity({ name: newName, category: newCategory, icon: newIcon, color: newColor, daily_target_minutes: newTarget });
        setNewName(''); setShowForm(false);
        loadActivities();
    }

    async function handleArchive(id: number) {
        await api.archiveActivity(id, true);
        loadActivities();
    }

    async function handleQuickLog() {
        if (!logActivityId || !logMinutes) return;
        await api.logActivity({ activity_id: logActivityId, minutes: parseInt(logMinutes), notes: logNotes || undefined, source: 'manual' });
        setLogActivityId(null); setLogMinutes(''); setLogNotes('');
        loadActivities();
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Activities</h1>
                    <p className="text-sm text-text-dim mt-0.5">Manage your trackable activities</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-all"
                >
                    + New Activity
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="glass rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-text">Create Activity</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Activity name..."
                            className="px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text placeholder:text-text-dim/50 outline-none focus:border-accent/40"
                        />
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Icon</label>
                            <div className="flex gap-1 flex-wrap max-w-xs">
                                {ICONS.map(icon => (
                                    <button key={icon} onClick={() => setNewIcon(icon)}
                                        className={`w-8 h-8 rounded text-center hover:bg-white/10 ${newIcon === icon ? 'bg-accent/20 ring-1 ring-accent' : ''}`}
                                    >{icon}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Color</label>
                            <div className="flex gap-1 flex-wrap">
                                {COLORS.map(color => (
                                    <button key={color} onClick={() => setNewColor(color)}
                                        className={`w-7 h-7 rounded-full ${newColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-base' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="number" value={newTarget || ''} onChange={e => setNewTarget(parseInt(e.target.value) || 0)}
                            placeholder="Daily target (minutes, optional)" className="w-64 px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80">Create</button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-text-dim text-sm hover:text-text">Cancel</button>
                    </div>
                </div>
            )}

            {/* Quick Log Modal */}
            {logActivityId && (
                <div className="glass rounded-xl p-5 glow-border space-y-3">
                    <h3 className="text-sm font-semibold text-text">
                        Quick Log — {activities.find(a => a.id === logActivityId)?.icon} {activities.find(a => a.id === logActivityId)?.name}
                    </h3>
                    <div className="flex gap-3">
                        <input type="number" value={logMinutes} onChange={e => setLogMinutes(e.target.value)}
                            placeholder="Minutes" className="w-32 px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        <input value={logNotes} onChange={e => setLogNotes(e.target.value)}
                            placeholder="Notes (optional)" className="flex-1 px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        <button onClick={handleQuickLog} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium">Log</button>
                        <button onClick={() => setLogActivityId(null)} className="px-4 py-2 rounded-lg text-text-dim text-sm hover:text-text">Cancel</button>
                    </div>
                </div>
            )}

            {/* Activities grid */}
            <div className="grid grid-cols-2 gap-4">
                {activities.map(act => {
                    const s = stats[act.id];
                    return (
                        <div key={act.id} className="glass rounded-xl p-4 hover:scale-[1.01] transition-transform group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: act.color + '22' }}>
                                        {act.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-text">{act.name}</h3>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-text-dim">{act.category}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setLogActivityId(act.id)}
                                        className="text-xs px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30">+ Log</button>
                                    <button onClick={() => handleArchive(act.id)}
                                        className="text-xs px-2 py-1 rounded bg-white/5 text-text-dim hover:text-red-400">Archive</button>
                                </div>
                            </div>
                            {s && (
                                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5">
                                    <MiniStat label="Total" value={`${Math.floor(s.total_minutes / 60)}h`} />
                                    <MiniStat label="Sessions" value={String(s.total_sessions)} />
                                    <MiniStat label="Avg" value={`${s.avg_session}m`} />
                                    <MiniStat label="Streak" value={`${s.current_streak}d`} />
                                </div>
                            )}
                            {act.daily_target_minutes > 0 && s && (
                                <div className="mt-2">
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{
                                            width: `${Math.min(100, (s.total_minutes / act.daily_target_minutes) * 100)}%`,
                                            backgroundColor: act.color,
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-center">
            <p className="text-xs text-text-dim">{label}</p>
            <p className="text-sm font-semibold text-text">{value}</p>
        </div>
    );
}
