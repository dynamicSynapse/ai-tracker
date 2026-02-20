import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

// Local interface if not exported
interface ActivityLog {
    id: number;
    activity_id: number;
    minutes: number;
    logged_at: string;
    note?: string;
    activity_name: string;
    activity_icon: string;
    activity_color: string;
}

export default function Timeline() {
    const api = useApi();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [playhead, setPlayhead] = useState(0); // 0 to 1440 (minutes in a day)
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(10); // minutes per tick

    useEffect(() => {
        loadLogs();
    }, [date]);

    async function loadLogs() {
        // Fetch logs for the selected date
        // existing API get-activity-logs takes from/to
        const from = `${date}T00:00:00`;
        const to = `${date}T23:59:59`;
        const data = await api.getActivityLogs({ from, to, limit: 100 });
        // Map to ensure types are correct (backend might return nulls or missing fields)
        const safeData = data.map((log: any) => ({
            ...log,
            activity_name: log.activity_name || 'Unknown',
            activity_icon: log.activity_icon || '❓',
            activity_color: log.activity_color || '#888'
        }));
        setLogs(safeData);
    }

    // Animation Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setPlayhead(p => {
                    if (p >= 1440) {
                        setIsPlaying(false);
                        return 1440;
                    }
                    return p + speed;
                });
            }, 50); // 20fps
        }
        return () => clearInterval(interval);
    }, [isPlaying, speed]);

    const formatTime = (min: number) => {
        const h = Math.floor(min / 60);
        const m = Math.floor(min % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Derived state: Current Activity
    const currentLog = logs.find(log => {
        const start = new Date(log.logged_at);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = startMin + log.minutes;
        return playhead >= startMin && playhead < endMin;
    });

    return (
        <div className="max-w-4xl mx-auto py-10 animate-fade-up">
            <h1 className="text-2xl font-bold text-text mb-6">Productivity Timeline</h1>

            {/* Controls */}
            <div className="flex items-center gap-4 mb-8 glass p-4 rounded-xl">
                <input
                    type="date"
                    className="bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />

                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'} w-24`}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>

                <div className="flex-1 px-4">
                    <input
                        type="range" min="0" max="1440"
                        value={playhead}
                        onChange={e => {
                            setPlayhead(parseInt(e.target.value));
                            setIsPlaying(false);
                        }}
                        className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-xs text-text-dim mt-1">
                        <span>00:00</span>
                        <span className="text-accent font-mono text-lg">{formatTime(playhead)}</span>
                        <span>23:59</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-dim">
                    <span>Speed:</span>
                    <button onClick={() => setSpeed(5)} className={`p-1 rounded ${speed === 5 ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'}`}>1x</button>
                    <button onClick={() => setSpeed(20)} className={`p-1 rounded ${speed === 20 ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'}`}>4x</button>
                    <button onClick={() => setSpeed(60)} className={`p-1 rounded ${speed === 60 ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'}`}>12x</button>
                </div>
            </div>

            {/* Visualization */}
            <div className="relative h-[400px] glass rounded-xl overflow-hidden flex flex-col items-center justify-center p-10">
                {currentLog ? (
                    <div className="text-center animate-fade-in scale-110 transition-transform">
                        <div className="text-6xl mb-4">{currentLog.activity_icon || '📝'}</div>
                        <h2 className="text-3xl font-bold text-text mb-2">{currentLog.activity_name}</h2>
                        <p className="text-xl text-accent">{currentLog.minutes} min session</p>
                        {currentLog.note && <p className="text-text-dim mt-4 max-w-md mx-auto">"{currentLog.note}"</p>}
                    </div>
                ) : (
                    <div className="text-center text-text-dim opacity-50">
                        <div className="text-4xl mb-4">💤</div>
                        <p>No activity logged at {formatTime(playhead)}</p>
                    </div>
                )}

                {/* Timeline Strip */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/5 flex items-end">
                    {logs.map(log => {
                        const start = new Date(log.logged_at);
                        const startMin = start.getHours() * 60 + start.getMinutes();
                        const widthPct = (log.minutes / 1440) * 100;
                        const leftPct = (startMin / 1440) * 100;

                        return (
                            <div
                                key={log.id}
                                className="absolute bottom-0 h-12 bg-accent/30 border-l border-white/10 hover:bg-accent/50 transition-colors"
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                title={`${log.activity_name} (${formatTime(startMin)})`}
                            />
                        );
                    })}
                    {/* Playhead Indicator */}
                    <div
                        className="absolute bottom-0 top-0 w-0.5 bg-red-500 z-10 transition-all duration-75"
                        style={{ left: `${(playhead / 1440) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
