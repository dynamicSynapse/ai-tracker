import React, { useState, useEffect } from 'react';
import { useApi, Reminder } from '../hooks/useApi';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Reminders() {
    const api = useApi();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('09:00');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

    useEffect(() => {
        loadReminders();
    }, []);

    async function loadReminders() {
        try {
            const data = await api.getReminders();
            setReminders(data);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !time) return;
        try {
            await api.addReminder(title, time, JSON.stringify(selectedDays));
            setTitle('');
            setSelectedDays([]);
            loadReminders();
        } catch (e) {
            console.error(e);
        }
    }

    async function handleToggle(id: number, isActive: number) {
        try {
            await api.toggleReminder(id, !isActive);
            loadReminders();
        } catch (e) {
            console.error(e);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Delete this reminder?')) return;
        try {
            await api.deleteReminder(id);
            loadReminders();
        } catch (e) {
            console.error(e);
        }
    }

    function toggleDay(index: number) {
        if (selectedDays.includes(index)) {
            setSelectedDays(selectedDays.filter(d => d !== index));
        } else {
            setSelectedDays([...selectedDays, index].sort());
        }
    }

    function getDaysText(daysStr: string) {
        try {
            const arr = JSON.parse(daysStr);
            if (!arr || arr.length === 0 || arr.length === 7) return 'Everyday';
            if (arr.length === 5 && !arr.includes(0) && !arr.includes(6)) return 'Weekdays';
            if (arr.length === 2 && arr.includes(0) && arr.includes(6)) return 'Weekends';
            return arr.map((d: number) => DAYS[d]).join(', ');
        } catch {
            return 'Everyday';
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8 animate-fade-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Reminders</h1>
                    <p className="text-sm text-text-dim mt-0.5">Automated pings to keep you on track</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleAdd} className="glass rounded-xl p-5 space-y-4">
                        <h3 className="font-semibold text-text">New Reminder</h3>

                        <div>
                            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">Title</label>
                            <input
                                autoFocus
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="E.g. Drink Water"
                                className="bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none w-full"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">Time</label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none w-full"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2">Days (Empty = Everyday)</label>
                            <div className="flex gap-1 justify-between">
                                {DAYS.map((day, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => toggleDay(i)}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${selectedDays.includes(i) ? 'bg-accent text-black' : 'bg-surface-light text-text-dim hover:bg-white/10'
                                            }`}
                                    >
                                        {day[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-2 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition-all hover:scale-[1.02] active:scale-95 mt-2"
                        >
                            Add Reminder
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-3">
                    {reminders.length === 0 ? (
                        <div className="glass rounded-xl p-10 flex flex-col items-center justify-center text-center border border-white/5">
                            <span className="text-4xl mb-4 opacity-50">🔔</span>
                            <h3 className="text-lg font-semibold text-text">No Reminders Yet</h3>
                            <p className="text-sm text-text-dim mt-2">Create your first automated reminder to stay focused.</p>
                        </div>
                    ) : (
                        reminders.map(r => (
                            <div key={r.id} className={`glass rounded-xl p-4 flex items-center justify-between transition-all ${!r.is_active && 'opacity-50 grayscale'}`}>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(r.id, r.is_active)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${r.is_active ? 'border-accent bg-accent/20 text-accent' : 'border-white/20 hover:border-white/40'
                                            }`}
                                    >
                                        {r.is_active ? <div className="w-2.5 h-2.5 bg-accent rounded-full" /> : null}
                                    </button>
                                    <div>
                                        <h4 className="font-semibold text-text flex items-center gap-2">
                                            {r.title}
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-text-dim uppercase tracking-wider font-bold">
                                                {getDaysText(r.days)}
                                            </span>
                                        </h4>
                                        <p className="text-xs text-text-dim mt-0.5">Auto-fires at {r.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xl font-bold text-text bg-surface-light px-3 py-1 rounded-lg border border-white/5">{r.time}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(r.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
