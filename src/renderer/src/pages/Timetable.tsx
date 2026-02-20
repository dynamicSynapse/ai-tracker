import React, { useState, useEffect } from 'react';
import { useApi, TimetableSlotRow, AdherenceData, ActivityRow } from '../hooks/useApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM

type View = 'weekly' | 'daily';

interface SlotForm {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    activity_id: number;
    label: string;
}

const emptyForm = (day: number): SlotForm => ({
    day_of_week: day,
    start_time: '09:00',
    end_time: '10:00',
    activity_id: 0,
    label: '',
});

export default function Timetable() {
    const api = useApi();
    const [view, setView] = useState<View>('weekly');
    const [slots, setSlots] = useState<TimetableSlotRow[]>([]);
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [adherence, setAdherence] = useState<AdherenceData | null>(null);
    const [weeklyAdherence, setWeeklyAdherence] = useState<AdherenceData[]>([]);
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<SlotForm>(emptyForm(selectedDay));
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    // Auto Manager
    const [showAutoSchedule, setShowAutoSchedule] = useState(false);
    const [scheduleSuggestions, setScheduleSuggestions] = useState<any[]>([]);

    async function handleAutoSchedule() {
        setAiLoading(true); setAiError('');
        try {
            const r = await api.autoSchedule();
            if (r.error) setAiError(r.error);
            else {
                setAiInsight(r.summary);
                setScheduleSuggestions(r.slots);
                setShowAutoSchedule(true);
            }
        } catch { setAiError('Failed to auto-schedule'); }
        finally { setAiLoading(false); }
    }

    async function applySlot(slot: any) {
        // Find activity ID by name match (fuzzy or exact)
        const activity = activities.find(a => a.name.toLowerCase().includes(slot.label.toLowerCase())) || activities[0];
        if (!activity) return;

        await api.upsertTimetableSlot({
            day_of_week: selectedDay,
            start_time: slot.start_time,
            end_time: slot.end_time,
            activity_id: activity.id,
            label: slot.goal_related
        });
        load();
        // Remove from suggestions
        setScheduleSuggestions(prev => prev.filter(s => s !== slot));
    }

    useEffect(() => { load(); }, []);
    useEffect(() => { loadAdherence(); }, [selectedDay]);

    async function load() {
        const [s, a] = await Promise.all([api.getTimetable(), api.getActivities()]);
        setSlots(s);
        setActivities(a);
        loadAdherence();
        loadWeeklyAdherence();
    }

    async function loadAdherence() {
        const today = new Date();
        const d = new Date(today);
        const diff = selectedDay - today.getDay();
        d.setDate(d.getDate() + diff);
        const dateStr = d.toISOString().split('T')[0];
        try { setAdherence(await api.getTimetableAdherence(dateStr)); } catch { }
    }

    async function loadWeeklyAdherence() {
        try { setWeeklyAdherence(await api.getWeeklyAdherence()); } catch { }
    }

    async function handleSave() {
        if (!form.activity_id) return;
        await api.upsertTimetableSlot({
            id: form.id,
            day_of_week: form.day_of_week,
            start_time: form.start_time,
            end_time: form.end_time,
            activity_id: form.activity_id,
            label: form.label || undefined,
        });
        setShowForm(false);
        load();
    }

    async function handleDelete(id: number) {
        await api.deleteTimetableSlot(id);
        load();
    }

    function openEdit(slot: TimetableSlotRow) {
        setForm({
            id: slot.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            activity_id: slot.activity_id,
            label: slot.label || '',
        });
        setShowForm(true);
    }

    function openCreate(day: number, hour?: number) {
        const f = emptyForm(day);
        if (hour !== undefined) {
            f.start_time = `${String(hour).padStart(2, '0')}:00`;
            f.end_time = `${String(hour + 1).padStart(2, '0')}:00`;
        }
        if (activities.length > 0) f.activity_id = activities[0].id;
        setForm(f);
        setShowForm(true);
    }

    async function handleAI() {
        setAiLoading(true); setAiError('');
        try {
            const r = await api.analyzeSchedule();
            if (r.error) setAiError(r.error);
            else setAiInsight(r.summary);
        } catch { setAiError('Failed to analyze'); }
        finally { setAiLoading(false); }
    }

    const daySlots = (day: number) => slots.filter(s => s.day_of_week === day);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Timetable</h1>
                    <p className="text-sm text-text-dim mt-0.5">Set your schedule and track adherence</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-surface rounded-lg">
                        {(['weekly', 'daily'] as View[]).map(v => (
                            <button key={v} onClick={() => setView(v)}
                                className={`px-4 py-2 text-sm font-medium transition-all rounded-lg ${view === v ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}`}
                            >
                                {v === 'weekly' ? 'Weekly' : 'Daily'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => openCreate(selectedDay)}
                        className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-all"
                    >+ Add Slot</button>
                </div>
            </div>

            {/* Slot Form */}
            {showForm && (
                <div className="glass rounded-xl p-5 glow-border space-y-3">
                    <h3 className="text-sm font-semibold text-text">{form.id ? 'Edit Slot' : 'New Slot'}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: Number(e.target.value) })}
                            className="px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none">
                            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                        </select>
                        <select value={form.activity_id} onChange={e => setForm({ ...form, activity_id: Number(e.target.value) })}
                            className="px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none">
                            <option value={0}>Select activity...</option>
                            {activities.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Start Time</label>
                            <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">End Time</label>
                            <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Label (optional)</label>
                            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. GS Paper 1"
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium">Save</button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-text-dim text-sm hover:text-text">Cancel</button>
                    </div>
                </div>
            )}

            {/* Weekly View */}
            {view === 'weekly' && (
                <div className="space-y-4">
                    {/* Weekly adherence summary bar */}
                    {weeklyAdherence.length > 0 && (
                        <div className="glass rounded-xl p-4">
                            <h3 className="text-xs font-semibold text-text-dim mb-3">WEEKLY ADHERENCE</h3>
                            <div className="flex gap-2">
                                {weeklyAdherence.map((d, i) => {
                                    const dayDate = new Date(d.date + 'T12:00:00');
                                    return (
                                        <div key={i} className="flex-1 text-center">
                                            <p className="text-[10px] text-text-dim mb-1">{DAY_SHORT[dayDate.getDay()]}</p>
                                            <div className="h-16 bg-white/5 rounded-lg overflow-hidden flex flex-col-reverse">
                                                <div
                                                    className="rounded-t transition-all duration-500"
                                                    style={{
                                                        height: `${d.adherence_pct}%`,
                                                        backgroundColor: d.adherence_pct >= 80 ? '#06D6A0' : d.adherence_pct >= 40 ? '#F77F00' : d.planned_minutes > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.05)',
                                                    }}
                                                />
                                            </div>
                                            <p className={`text-xs font-medium mt-1 ${d.adherence_pct >= 80 ? 'text-emerald-400' : d.adherence_pct >= 40 ? 'text-amber-400' : 'text-text-dim'}`}>
                                                {d.planned_minutes > 0 ? `${d.adherence_pct}%` : '-'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Weekly grid */}
                    <div className="glass rounded-xl overflow-hidden">
                        <div className="grid grid-cols-7 divide-x divide-white/5">
                            {DAYS.map((day, dayIdx) => {
                                const ds = daySlots(dayIdx);
                                const isToday = dayIdx === new Date().getDay();
                                return (
                                    <div key={dayIdx} className={`min-h-[200px] ${isToday ? 'bg-accent/5' : ''}`}>
                                        <div className={`px-2 py-2 border-b border-white/5 text-center ${isToday ? 'bg-accent/10' : ''}`}>
                                            <p className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-text-dim'}`}>{DAY_SHORT[dayIdx]}</p>
                                        </div>
                                        <div className="p-1.5 space-y-1">
                                            {ds.length === 0 ? (
                                                <button onClick={() => openCreate(dayIdx)}
                                                    className="w-full py-4 rounded text-center text-text-dim/30 hover:text-text-dim/60 hover:bg-white/5 text-xs transition-all">+</button>
                                            ) : (
                                                ds.map(slot => (
                                                    <button key={slot.id} onClick={() => openEdit(slot)}
                                                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs group hover:brightness-110 transition-all"
                                                        style={{ backgroundColor: (slot.activity_color || '#6C63FF') + '22' }}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>{slot.activity_icon}</span>
                                                            <span className="truncate text-text font-medium">{slot.label || slot.activity_name}</span>
                                                        </div>
                                                        <p className="text-text-dim mt-0.5">{slot.start_time}–{slot.end_time}</p>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }}
                                                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-400 text-[10px] hover:text-red-300 px-1">✕</button>
                                                    </button>
                                                ))
                                            )}
                                            {ds.length > 0 && (
                                                <button onClick={() => openCreate(dayIdx)}
                                                    className="w-full py-1 rounded text-text-dim/30 hover:text-text-dim/60 hover:bg-white/5 text-xs transition-all">+</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily View */}
            {view === 'daily' && (
                <div className="space-y-4">
                    {/* Day selector */}
                    <div className="flex gap-1 bg-surface rounded-lg p-1">
                        {DAYS.map((day, i) => (
                            <button key={i} onClick={() => setSelectedDay(i)}
                                className={`flex-1 py-2 rounded text-xs font-medium transition-all ${selectedDay === i ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}`}
                            >{DAY_SHORT[i]}</button>
                        ))}
                    </div>

                    {/* Adherence summary */}
                    {adherence && adherence.planned_minutes > 0 && (
                        <div className="glass rounded-xl p-4 flex items-center gap-4">
                            <div className="relative w-16 h-16">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15" fill="none"
                                        stroke={adherence.adherence_pct >= 80 ? '#06D6A0' : adherence.adherence_pct >= 40 ? '#F77F00' : '#FF6B6B'}
                                        strokeWidth="3" strokeLinecap="round"
                                        strokeDasharray={`${adherence.adherence_pct * 0.942} 94.2`}
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text">{adherence.adherence_pct}%</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-text">{DAYS[selectedDay]} Adherence</h3>
                                <p className="text-xs text-text-dim">{adherence.completed_minutes}m of {adherence.planned_minutes}m planned</p>
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="glass rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-text mb-4">{DAYS[selectedDay]}'s Schedule</h3>
                        {daySlots(selectedDay).length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-text-dim mb-2">No slots scheduled for {DAYS[selectedDay]}</p>
                                <button onClick={() => openCreate(selectedDay)}
                                    className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm hover:bg-accent/30 transition-all">+ Add Slot</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {daySlots(selectedDay).map(slot => {
                                    const adSlot = adherence?.slots.find(s => s.slot_id === slot.id);
                                    const statusColor = adSlot?.status === 'done' ? 'border-emerald-500/40 bg-emerald-500/5' :
                                        adSlot?.status === 'partial' ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10';
                                    const statusIcon = adSlot?.status === 'done' ? '✅' : adSlot?.status === 'partial' ? '⚠️' : '⏳';

                                    return (
                                        <div key={slot.id} className={`flex items-center gap-4 p-3 rounded-xl border ${statusColor} group`}>
                                            <div className="w-20 text-center">
                                                <p className="text-xs font-mono text-text">{slot.start_time}</p>
                                                <div className="w-px h-3 bg-white/10 mx-auto" />
                                                <p className="text-xs font-mono text-text-dim">{slot.end_time}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: (slot.activity_color || '#6C63FF') + '22' }}>
                                                {slot.activity_icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-text">{slot.label || slot.activity_name}</p>
                                                {adSlot && (
                                                    <p className="text-xs text-text-dim">{adSlot.logged_minutes}m / {adSlot.planned_minutes}m logged</p>
                                                )}
                                            </div>
                                            <span className="text-lg">{statusIcon}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(slot)} className="text-xs px-2 py-1 rounded bg-white/5 text-text-dim hover:text-text">Edit</button>
                                                <button onClick={() => handleDelete(slot.id)} className="text-xs px-2 py-1 rounded bg-white/5 text-red-400 hover:text-red-300">Del</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Schedule Analysis */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-text">🤖 AI Schedule Analysis</h2>
                    <button onClick={handleAI} disabled={aiLoading}
                        className="text-xs px-3 py-1 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-all disabled:opacity-50"
                    >{aiLoading ? 'Analyzing...' : 'Analyze Adherence'}</button>
                    <button onClick={handleAutoSchedule} disabled={aiLoading}
                        className="ml-2 text-xs px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                    >✨ Auto-Schedule</button>
                </div>
                {showAutoSchedule && (
                    <div className="mt-4 p-4 bg-surface/50 rounded-xl border border-emerald-500/20">
                        <h3 className="text-sm font-bold text-emerald-400 mb-2">✨ AI Suggestions</h3>
                        {aiInsight ? (
                            <div>
                                <p className="text-sm text-text mb-3">{aiInsight}</p>
                                <div className="space-y-2">
                                    {(scheduleSuggestions || []).map((slot, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                                            <div className="text-xs font-mono text-text-dim">{slot.start_time}-{slot.end_time}</div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-text">{slot.label}</div>
                                                <div className="text-xs text-text-dim">Goal: {slot.goal_related}</div>
                                            </div>
                                            <button onClick={() => applySlot(slot)} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Apply</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-emerald-400 animate-pulse">Thinking...</div>
                        )}
                        <button onClick={() => setShowAutoSchedule(false)} className="mt-3 text-xs text-text-dim hover:text-text underline">Close</button>
                    </div>
                )}
                {aiError && !showAutoSchedule && <p className="text-sm text-red-400">{aiError}</p>}
                {!showAutoSchedule && aiInsight && !aiError && (
                    <div className="text-sm text-text/90 whitespace-pre-line leading-relaxed">{aiInsight}</div>
                )}
                <p className="text-sm text-text-dim">Set your timetable, log activities, then click "Analyze Adherence" for AI coaching on how well you're following your schedule.</p>
            </div>
        </div>
    );
}
