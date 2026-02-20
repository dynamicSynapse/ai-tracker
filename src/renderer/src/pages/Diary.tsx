import React, { useState, useEffect } from 'react';
import { useApi, DiaryEntryRow, DiaryEntryInput, DiaryStats } from '../hooks/useApi';

const MOODS = ['😫', '😕', '😐', '🙂', '🤩'];
const ENERGY = ['🪫', '🔋', '⚡', '🔥', '🚀'];

function CalendarStrip({ selectedDate, onSelect, history }: { selectedDate: string; onSelect: (d: string) => void; history: string[] }) {
    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 noscroll">
            {dates.map(date => {
                const isSelected = date === selectedDate;
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dateObj.getDate();
                const hasEntry = history.includes(date);
                const isToday = date === new Date().toISOString().split('T')[0];

                return (
                    <button
                        key={date}
                        onClick={() => onSelect(date)}
                        className={`flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-xl transition-all border ${isSelected
                            ? 'bg-accent/20 border-accent/50 text-accent scale-105'
                            : hasEntry
                                ? 'bg-white/5 border-white/10 text-text-dim hover:bg-white/10'
                                : 'bg-transparent border-transparent text-text-dim/50 hover:bg-white/5'
                            }`}
                    >
                        <span className="text-[10px] uppercase font-bold">{isToday ? 'Today' : dayName}</span>
                        <span className="text-lg font-bold">{dayNum}</span>
                        {hasEntry && <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1" />}
                    </button>
                );
            })}
        </div>
    );
}

export default function Diary() {
    const api = useApi();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [entry, setEntry] = useState<DiaryEntryInput>({ date: selectedDate });
    const [stats, setStats] = useState<DiaryStats | null>(null);
    const [entriesList, setEntriesList] = useState<DiaryEntryRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [historyDates, setHistoryDates] = useState<string[]>([]);

    useEffect(() => {
        loadStats();
        loadEntriesList();
    }, []);

    useEffect(() => {
        loadEntry(selectedDate);
    }, [selectedDate]);

    async function loadStats() {
        try {
            const s = await api.getDiaryStats();
            setStats(s);
        } catch (e) { console.error(e); }
    }

    async function loadEntriesList() {
        try {
            const list = await api.getDiaryEntries(30);
            setEntriesList(list);
            setHistoryDates(list.map(e => e.date));
        } catch (e) { console.error(e); }
    }

    async function loadEntry(date: string) {
        try {
            const e = await api.getDiary(date);
            if (e) {
                setEntry({
                    date: e.date,
                    mood: e.mood || undefined,
                    energy_level: e.energy_level || undefined,
                    content: e.content || '',
                    tags: e.tags || '',
                    wins: e.wins || '',
                    challenges: e.challenges || '',
                    tomorrow_plan: e.tomorrow_plan || '',
                });
            } else {
                setEntry({ date, content: '', tags: '', wins: '', challenges: '', tomorrow_plan: '' });
            }
        } catch (e) { console.error(e); }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await api.upsertDiary(entry);
            loadStats();
            loadEntriesList();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8 animate-fade-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Daily Diary</h1>
                    <p className="text-sm text-text-dim mt-0.5">Reflect, track mood, and plan ahead</p>
                </div>
                {stats && (
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-xs text-text-dim">Streak</p>
                            <p className="text-lg font-bold text-amber-400">🔥 {stats.diary_streak}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-text-dim">Total Entries</p>
                            <p className="text-lg font-bold text-accent">📝 {stats.total_entries}</p>
                        </div>
                    </div>
                )}
            </div>

            <CalendarStrip selectedDate={selectedDate} onSelect={setSelectedDate} history={historyDates} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass rounded-xl p-5 space-y-4">
                        <div className="flex gap-8">
                            <div>
                                <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">Mood</label>
                                <div className="flex gap-2">
                                    {MOODS.map((m, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setEntry({ ...entry, mood: i + 1 })}
                                            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${entry.mood === i + 1 ? 'bg-accent text-black scale-110 shadow-lg shadow-accent/20' : 'bg-white/5 text-text-dim hover:bg-white/10'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">Energy</label>
                                <div className="flex gap-2">
                                    {ENERGY.map((e, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setEntry({ ...entry, energy_level: i + 1 })}
                                            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${entry.energy_level === i + 1 ? 'bg-amber-400 text-black scale-110 shadow-lg shadow-amber-400/20' : 'bg-white/5 text-text-dim hover:bg-white/10'
                                                }`}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">Journal Entry</label>
                            <textarea
                                value={entry.content}
                                onChange={e => setEntry({ ...entry, content: e.target.value })}
                                placeholder="How was your day? What's on your mind?"
                                className="w-full h-32 bg-surface-light text-text border border-white/10 rounded-xl p-3 text-sm placeholder:text-text-dim/30 resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">✨ Wins</label>
                                <textarea
                                    value={entry.wins}
                                    onChange={e => setEntry({ ...entry, wins: e.target.value })}
                                    placeholder="What went well today?"
                                    className="w-full h-20 bg-surface-light text-text border border-white/10 rounded-xl p-3 text-sm placeholder:text-text-dim/30 resize-none focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">🏔️ Challenges</label>
                                <textarea
                                    value={entry.challenges}
                                    onChange={e => setEntry({ ...entry, challenges: e.target.value })}
                                    placeholder="What was difficult?"
                                    className="w-full h-20 bg-surface-light text-text border border-white/10 rounded-xl p-3 text-sm placeholder:text-text-dim/30 resize-none focus:outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">🚀 Tomorrow's Plan</label>
                            <textarea
                                value={entry.tomorrow_plan}
                                onChange={e => setEntry({ ...entry, tomorrow_plan: e.target.value })}
                                placeholder="One big thing to achieve tomorrow..."
                                className="w-full h-20 bg-surface-light text-text border border-white/10 rounded-xl p-3 text-sm placeholder:text-text-dim/30 resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent transition-colors"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <input
                                value={entry.tags}
                                onChange={e => setEntry({ ...entry, tags: e.target.value })}
                                placeholder="Tags (comma separated)..."
                                className="w-1/2 bg-surface-light text-text border border-white/10 rounded-lg p-2 text-xs placeholder:text-text-dim/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent transition-colors"
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                            >
                                {saving ? 'Saving...' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar History */}
                <div className="space-y-4">
                    <div className="glass rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-text mb-3">Recent Entries</h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {entriesList.map(e => (
                                <button
                                    key={e.id}
                                    onClick={() => setSelectedDate(e.date)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedDate === e.date
                                        ? 'bg-white/10 border-white/20'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-semibold text-text">
                                            {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <div className="flex gap-1 text-sm">
                                            {e.mood ? <span>{MOODS[e.mood - 1]}</span> : <span className="opacity-20">😶</span>}
                                            {e.energy_level ? <span>{ENERGY[e.energy_level - 1]}</span> : <span className="opacity-20">⚡</span>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-dim line-clamp-2 leading-relaxed">
                                        {e.content || <span className="italic opacity-50">No content...</span>}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
