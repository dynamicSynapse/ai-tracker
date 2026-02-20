import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi, ActivityRow } from '../hooks/useApi';

const PRESETS = [
    { label: '25m', minutes: 25 },
    { label: '45m', minutes: 45 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 },
    { label: '3h', minutes: 180 },
];

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export default function Pomodoro() {
    const api = useApi();
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
    const [durationMinutes, setDurationMinutes] = useState(25);
    const [customInput, setCustomInput] = useState('');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [state, setState] = useState<TimerState>('idle');
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    // Debrief State
    const [showDebrief, setShowDebrief] = useState(false);
    const [focusRating, setFocusRating] = useState(3);
    const [energyRating, setEnergyRating] = useState(3);
    const [distractions, setDistractions] = useState('');
    const [sessionNotes, setSessionNotes] = useState('');
    const [logMessage, setLogMessage] = useState('');

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const location = useLocation();

    useEffect(() => {
        api.getActivities().then(setActivities).catch(console.error);
    }, []);

    useEffect(() => {
        if (location.state?.autoStart && activities.length > 0) {
            const { activity_id, minutes } = location.state.autoStart;
            setSelectedActivity(activity_id);
            if (minutes > 0 && minutes <= 600) {
                setDurationMinutes(minutes);
                setTimeLeft(minutes * 60);
            }

            const t = setTimeout(() => {
                setState('running');
                startTimeRef.current = Date.now();
                setLogMessage(`✅ Auto-Started via Telegram!`);
                setShowDebrief(false);
            }, 300);

            // Clear location state to prevent loop on remount
            window.history.replaceState({}, document.title);

            return () => clearTimeout(t);
        }
    }, [location.state?.autoStart, activities]);

    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.onStopPomodoro) {
            electronAPI.onStopPomodoro(() => {
                // If it's already idle or done, ignore. 
                // If it is running or paused, finish it early.
                setState((prevState) => {
                    if (prevState === 'running' || prevState === 'paused') {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                        // Using state callback, so we cannot easily call handleTimerComplete which uses refs/state
                        // But we can trigger the same logic:
                        return 'done'; // The actual effect won't trigger handleTimerComplete, but we can set state and trigger it separately
                    }
                    return prevState;
                });
            });
        }
        return () => {
            if (electronAPI?.removeStopPomodoro) {
                electronAPI.removeStopPomodoro();
            }
        };
    }, []);

    // Effect to catch state changing to done from Telegram IPC directly
    useEffect(() => {
        if (state === 'done' && !showDebrief && startTimeRef.current !== 0) {
            const elapsedMs = Date.now() - startTimeRef.current;
            const actual = Math.max(1, Math.round(elapsedMs / 60000));
            setElapsedMinutes(actual);
            startTimeRef.current = 0;

            if (selectedActivity) {
                api.logActivity({
                    activity_id: selectedActivity,
                    minutes: actual,
                    source: 'pomodoro',
                    notes: 'Auto-stopped via Telegram', // Distinguish it in logs
                    focus_rating: 3, // Default values since user isn't prompted
                    energy_after: 3,
                }).then(() => {
                    const act = activities.find(a => a.id === selectedActivity);
                    setLogMessage(`✅ Auto-logged ${actual}m of ${act?.name || 'activity'} via Telegram!`);
                }).catch(err => {
                    setLogMessage(`❌ Failed to auto-log: ${err?.message || err}`);
                });
            } else {
                setLogMessage(`🛑 Timer stopped (no activity was selected).`);
            }

            try {
                const electronAPI = (window as any).electronAPI;
                if (electronAPI?.sendNotification) {
                    electronAPI.sendNotification('⏱️ Timer Logged!', 'Pomodoro halted and logged via Telegram.');
                }
            } catch { }
        }
    }, [state, showDebrief, selectedActivity, activities, api]);

    useEffect(() => {
        if (state === 'running') {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        handleTimerComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [state]);

    function setDuration(mins: number) {
        if (state !== 'idle') return;
        setDurationMinutes(mins);
        setTimeLeft(mins * 60);
    }

    function handleCustomDuration() {
        const mins = parseInt(customInput);
        if (mins > 0 && mins <= 600) {
            setDuration(mins);
            setCustomInput('');
        }
    }

    function start() {
        if (!selectedActivity) {
            setLogMessage('⚠️ Please select an activity first');
            return;
        }
        setState('running');
        startTimeRef.current = Date.now();
        setLogMessage('');
        setShowDebrief(false);
    }

    function pause() { setState('paused'); }
    function resume() { setState('running'); }

    function reset() {
        setState('idle');
        setTimeLeft(durationMinutes * 60);
        setLogMessage('');
        setShowDebrief(false);
        setFocusRating(3);
        setEnergyRating(3);
        setDistractions('');
        setSessionNotes('');
    }

    function handleTimerComplete() {
        setState('done');
        const elapsedMs = Date.now() - startTimeRef.current;
        const actual = Math.max(1, Math.round(elapsedMs / 60000));
        setElapsedMinutes(actual);
        setShowDebrief(true);
        startTimeRef.current = 0;

        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.sendNotification) {
                electronAPI.sendNotification('⏱️ Timer Complete!', 'Time to debrief!');
            }
        } catch { }
    }

    async function submitLog() {
        if (!selectedActivity) return;
        try {
            await api.logActivity({
                activity_id: selectedActivity,
                minutes: elapsedMinutes,
                notes: sessionNotes || undefined,
                source: 'pomodoro',
                focus_rating: focusRating,
                energy_after: energyRating,
                distractions: distractions || undefined,
            });
            const act = activities.find(a => a.id === selectedActivity);
            setLogMessage(`✅ Logged ${elapsedMinutes}m of ${act?.name}`);
            setShowDebrief(false); // Hide modal, stay in 'done' state until reset
        } catch (err: any) {
            setLogMessage(`❌ Failed to log session: ${err?.message || err}`);
        }
    }

    const totalSecs = durationMinutes * 60;
    const progress = totalSecs > 0 ? ((totalSecs - timeLeft) / totalSecs) * 100 : 0;
    const displayMins = Math.floor(timeLeft / 60);
    const displaySecs = timeLeft % 60;

    // SVG ring
    const radius = 130;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    const actName = activities.find(a => a.id === selectedActivity);

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-8 relative">
            <div>
                <h1 className="text-2xl font-bold text-text">Pomodoro Timer</h1>
                <p className="text-sm text-text-dim mt-0.5">Focus on a task with auto-logging</p>
            </div>

            {/* Debrief Modal Overlay */}
            {showDebrief && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl animate-fade-up">
                    <div className="bg-[#111827] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-white mb-1">Session Complete! 🎉</h2>
                            <p className="text-sm text-text-dim">{elapsedMinutes} minutes of focus</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-center block text-text-dim uppercase tracking-wider mb-2">Focus Rating</label>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setFocusRating(r)}
                                            className={`w-10 h-10 rounded-lg text-lg transition-all ${focusRating === r ? 'bg-accent text-black scale-110' : 'bg-white/5 text-text-dim hover:bg-white/10'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-center block text-text-dim uppercase tracking-wider mb-2">Energy Check</label>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setEnergyRating(r)}
                                            className={`w-10 h-10 rounded-lg text-lg transition-all ${energyRating === r ? 'bg-amber-400 text-black scale-110' : 'bg-white/5 text-text-dim hover:bg-white/10'}`}
                                        >
                                            {['🪫', '🔋', '⚡', '🔥', '🚀'][r - 1]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input
                                placeholder="Any distractions?"
                                value={distractions}
                                onChange={e => setDistractions(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm focus:border-accent/40 outline-none"
                            />
                            <input
                                placeholder="Session notes..."
                                value={sessionNotes}
                                onChange={e => setSessionNotes(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm focus:border-accent/40 outline-none"
                            />

                            <button onClick={submitLog} className="w-full py-3 bg-accent text-black font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all">
                                Log Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Selector */}
            <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-text mb-3">Select Activity</h3>
                <div className="flex flex-wrap gap-2">
                    {activities.map(act => (
                        <button
                            key={act.id}
                            onClick={() => setSelectedActivity(act.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${selectedActivity === act.id
                                ? 'text-white font-medium'
                                : 'bg-white/5 text-text-dim hover:text-text hover:bg-white/10'
                                }`}
                            style={selectedActivity === act.id ? { backgroundColor: act.color } : {}}
                        >
                            <span>{act.icon}</span>
                            <span>{act.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Duration Selector */}
            <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-text mb-3">Duration</h3>
                <div className="flex gap-2 flex-wrap items-center">
                    {PRESETS.map(p => (
                        <button
                            key={p.minutes}
                            onClick={() => setDuration(p.minutes)}
                            disabled={state !== 'idle'}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${durationMinutes === p.minutes
                                ? 'bg-accent text-white'
                                : 'bg-white/5 text-text-dim hover:text-text hover:bg-white/10'
                                } disabled:opacity-50`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <div className="flex items-center gap-1 ml-2">
                        <input
                            type="number"
                            value={customInput}
                            onChange={e => setCustomInput(e.target.value)}
                            placeholder="Custom"
                            disabled={state !== 'idle'}
                            className="w-20 px-2 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none text-center disabled:opacity-50"
                            onKeyDown={e => e.key === 'Enter' && handleCustomDuration()}
                        />
                        <span className="text-xs text-text-dim">min</span>
                    </div>
                </div>
            </div>

            {/* Timer Ring */}
            <div className="glass rounded-xl p-8 flex flex-col items-center">
                <div className="relative w-72 h-72">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 300 300">
                        <circle cx="150" cy="150" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <circle
                            cx="150" cy="150" r={radius}
                            fill="none"
                            stroke={actName ? actName.color : '#6C63FF'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000"
                            style={{ filter: `drop-shadow(0 0 8px ${actName?.color || '#6C63FF'}55)` }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold text-text tabular-nums">
                            {String(displayMins).padStart(2, '0')}:{String(displaySecs).padStart(2, '0')}
                        </span>
                        {actName && (
                            <span className="text-sm text-text-dim mt-2">{actName.icon} {actName.name}</span>
                        )}
                        <span className={`text-xs mt-1 ${state === 'running' ? 'text-emerald-400' : state === 'paused' ? 'text-amber-400' : state === 'done' ? 'text-accent' : 'text-text-dim'}`}>
                            {state === 'running' ? '● Focused' : state === 'paused' ? '⏸ Paused' : state === 'done' ? '✅ Complete!' : 'Ready'}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-3 mt-6">
                    {state === 'idle' && (
                        <button onClick={start} className="px-8 py-3 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/80 transition-all">
                            ▶ Start Focus
                        </button>
                    )}
                    {state === 'running' && (
                        <button onClick={pause} className="px-8 py-3 rounded-xl bg-amber-500/20 text-amber-400 font-medium text-sm hover:bg-amber-500/30 transition-all">
                            ⏸ Pause
                        </button>
                    )}
                    {state === 'paused' && (
                        <>
                            <button onClick={resume} className="px-8 py-3 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent/80 transition-all">
                                ▶ Resume
                            </button>
                            <button onClick={reset} className="px-6 py-3 rounded-xl bg-white/5 text-text-dim text-sm hover:text-text hover:bg-white/10 transition-all">
                                Reset
                            </button>
                        </>
                    )}
                    {state === 'done' && (
                        <button onClick={reset} className="px-8 py-3 rounded-xl bg-white/5 text-text font-medium text-sm hover:bg-white/10 transition-all">
                            Start New Session
                        </button>
                    )}
                </div>

                {/* Log message */}
                {logMessage && (
                    <p className="mt-3 text-sm text-text px-4 py-2 rounded-lg bg-white/5">{logMessage}</p>
                )}
            </div>
        </div>
    );
}
