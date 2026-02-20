import React, { useState, useEffect, useRef } from 'react';
import { useApi, DashboardData, MomentumData, DeepWorkStats, BrainLoad, BurnoutRisk } from '../hooks/useApi';

// ─── Animated counter hook ────────────────────────────────
function useAnimatedValue(target: number, duration = 1200) {
    const [value, setValue] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        const start = performance.now();
        const from = 0;
        const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
            setValue(Math.round(from + (target - from) * ease));
            if (t < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);
    return value;
}

// ─── Momentum Ring SVG ────────────────────────────────────
function MomentumRing({ data }: { data: MomentumData }) {
    const radius = 80;
    const stroke = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (data.score / 100) * circumference;
    const displayScore = useAnimatedValue(data.score, 1500);

    const trendIcon = data.trend === 'rising' ? '📈' : data.trend === 'falling' ? '📉' : '➡️';
    const trendColor = data.trend === 'rising' ? 'text-emerald-400' : data.trend === 'falling' ? 'text-red-400' : 'text-amber-400';
    const scoreColor = data.score >= 70 ? '#06D6A0' : data.score >= 40 ? '#FFD166' : '#EF476F';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative momentum-ring">
                <svg width="200" height="200" viewBox="0 0 200 200">
                    {/* background ring */}
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
                    {/* animated arc */}
                    <circle
                        cx="100" cy="100" r={radius} fill="none"
                        stroke={scoreColor} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={circumference}
                        style={{ '--ring-circumference': `${circumference}`, '--ring-offset': `${offset}` } as React.CSSProperties}
                        strokeDashoffset={circumference}
                        className="ring-animated"
                        transform="rotate(-90 100 100)"
                    />
                    {/* decorative outer glow ring */}
                    <circle cx="100" cy="100" r={radius + 6} fill="none" stroke={scoreColor} strokeWidth="0.5" opacity="0.3" className="animate-spin-slow" strokeDasharray="8 12" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-text tracking-tight">{displayScore}</span>
                    <span className="text-[10px] text-text-dim uppercase tracking-widest mt-0.5">Momentum</span>
                </div>
            </div>
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <span>{trendIcon}</span>
                <span className="capitalize">{data.trend}</span>
            </div>
            {/* Component breakdown mini bars */}
            <div className="grid grid-cols-4 gap-2 w-full max-w-xs mt-1">
                {[
                    { label: 'Streak', val: data.streak_component, color: '#FF6B6B' },
                    { label: 'Volume', val: data.volume_component, color: '#4ECDC4' },
                    { label: 'Consistency', val: data.consistency_component, color: '#45B7D1' },
                    { label: 'Deep Work', val: data.deep_work_component, color: '#96CEB4' },
                ].map((c, i) => (
                    <div key={i} className="text-center">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${c.val}%`, backgroundColor: c.color }} />
                        </div>
                        <span className="text-[9px] text-text-dim">{c.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Stat Card with gradient border ──────────────────────
function StatCard({ icon, label, value, sub, c1, c2, delay }: {
    icon: string; label: string; value: string | number; sub?: string;
    c1: string; c2: string; delay: number;
}) {
    return (
        <div
            className="gradient-border glass rounded-xl p-4 hover:scale-[1.03] transition-all duration-300 animate-fade-up animate-breathe cursor-default"
            style={{ '--gb-c1': c1, '--gb-c2': c2, animationDelay: `${delay}s` } as React.CSSProperties}
        >
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{icon}</span>
                <span className="text-[10px] text-text-dim uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-text">{value}</p>
            {sub && <p className="text-[10px] text-text-dim mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Activity Donut Chart ────────────────────────────────
function ActivityDonut({ activities }: { activities: DashboardData['today_by_activity'] }) {
    if (activities.length === 0) return null;
    const total = activities.reduce((s, a) => s + a.minutes, 0);
    const radius = 50, stroke = 14;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="flex items-center gap-6">
            <svg width="140" height="140" viewBox="0 0 140 140" className="flex-shrink-0">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={stroke} />
                {activities.map((a, i) => {
                    const pct = a.minutes / total;
                    const dashLen = pct * circumference;
                    const dashOff = offset;
                    offset += dashLen;
                    return (
                        <circle key={i} cx="70" cy="70" r={radius} fill="none"
                            stroke={a.color} strokeWidth={stroke} strokeLinecap="round"
                            strokeDasharray={`${dashLen - 2} ${circumference - dashLen + 2}`}
                            strokeDashoffset={-dashOff}
                            transform="rotate(-90 70 70)"
                            className="animate-fade-up"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        >
                            <title>{a.name}: {a.minutes}m</title>
                        </circle>
                    );
                })}
                <text x="70" y="66" textAnchor="middle" fill="#F9FAFB" fontSize="18" fontWeight="bold">{total}</text>
                <text x="70" y="82" textAnchor="middle" fill="#9CA3AF" fontSize="9">minutes</text>
            </svg>
            <div className="space-y-1.5 flex-1 min-w-0">
                {activities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 animate-fade-up" style={{ animationDelay: `${i * 0.05 + 0.2}s` }}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        <span className="text-xs text-text truncate flex-1">{a.icon} {a.name}</span>
                        <span className="text-xs text-text-dim font-mono">{a.minutes}m</span>
                        <span className="text-[10px] text-text-dim/50 w-8 text-right">{Math.round((a.minutes / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Floating Particle ───────────────────────────────────
function Particles() {
    const particles = Array.from({ length: 6 }, (_, i) => ({
        left: `${15 + i * 15}%`,
        top: `${20 + (i % 3) * 25}%`,
        size: 3 + (i % 3) * 2,
        delay: i * 0.8,
        dx: (i % 2 === 0 ? 1 : -1) * (30 + i * 10),
        dy: -(40 + i * 15),
    }));
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p, i) => (
                <div key={i} className="absolute rounded-full bg-accent/40"
                    style={{
                        left: p.left, top: p.top,
                        width: p.size, height: p.size,
                        '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
                        animation: `particle-drift ${3 + i * 0.5}s ease-out infinite`,
                        animationDelay: `${p.delay}s`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
}

// ─── Main Dashboard ──────────────────────────────────────
export default function Dashboard() {
    const api = useApi();
    const [data, setData] = useState<DashboardData | null>(null);
    const [momentum, setMomentum] = useState<MomentumData | null>(null);
    const [deepWork, setDeepWork] = useState<DeepWorkStats | null>(null);
    const [brainLoad, setBrainLoad] = useState<BrainLoad | null>(null);
    const [burnout, setBurnout] = useState<BurnoutRisk | null>(null);
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const [d, m, dw, bl, br] = await Promise.all([
                api.getDashboard(),
                api.getMomentumScore(),
                api.getDeepWorkStats(),
                api.getBrainLoad(),
                api.getBurnoutRisk(),
            ]);
            setData(d);
            setMomentum(m);
            setDeepWork(dw);
            setBrainLoad(bl);
            setBurnout(br);
        } catch (e) { console.error(e); }
    }

    async function loadAI() {
        setAiLoading(true); setAiError('');
        try {
            const r = await api.getAIInsights();
            if (r.error) setAiError(r.error);
            else setAiInsight(r.summary);
        } catch { setAiError('Failed to load insights'); }
        finally { setAiLoading(false); }
    }

    if (!data) return (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin-slow" style={{ animation: 'spin-slow 1s linear infinite' }} />
                <p className="text-text-dim text-sm animate-pulse">Loading dashboard...</p>
            </div>
        </div>
    );

    const hrs = Math.floor(data.today_minutes / 60);
    const mins = data.today_minutes % 60;
    const weekHrs = Math.floor(data.week_minutes / 60);
    const weekMins = data.week_minutes % 60;

    return (
        <div className="max-w-6xl mx-auto space-y-5 pb-8 relative">
            <Particles />

            {/* Header */}
            <div className="animate-fade-up">
                <h1 className="text-2xl font-bold text-text">
                    Command Center
                </h1>
                <p className="text-sm text-text-dim mt-0.5">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Burnout Warning */}
            {burnout && burnout.risk_level !== 'low' && (
                <div className="animate-fade-up bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="text-sm font-bold text-red-400">Burnout Risk: {burnout.risk_level.toUpperCase()}</h3>
                        <p className="text-xs text-red-300/80">Take a break. Your recovery metrics are low.</p>
                    </div>
                </div>
            )}

            {/* Hero row: Momentum ring + stat cards */}
            <div className="grid grid-cols-5 gap-4 items-start">
                {/* Momentum ring - takes up first col */}
                <div className="glass rounded-xl p-5 flex items-center justify-center animate-fade-up col-span-1">
                    {momentum && <MomentumRing data={momentum} />}
                </div>

                {/* Stat cards grid */}
                <div className="col-span-4 grid grid-cols-4 gap-3">
                    <StatCard icon="🔥" label="Today" value={hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                        sub={`${data.today_by_activity.length} activities`}
                        c1="#FF6B6B55" c2="#FF6B6B15" delay={0.05} />
                    <StatCard icon="📅" label="This Week" value={`${weekHrs}h ${weekMins}m`}
                        sub={`${weekHrs > 0 ? Math.round(data.week_minutes / 7) : 0}m/day avg`}
                        c1="#00F0FF55" c2="#00F0FF15" delay={0.1} />
                    <StatCard icon="📊" label="This Month" value={`${Math.floor(data.month_minutes / 60)}h`}
                        sub={`${data.month_minutes} total minutes`}
                        c1="#06D6A055" c2="#06D6A015" delay={0.15} />
                    <StatCard icon="⚡" label="Streak" value={`${data.current_streak} days`}
                        sub={data.current_streak >= 7 ? '🔥 On fire!' : 'Keep going!'}
                        c1="#FFD16655" c2="#FFD16615" delay={0.2} />

                    {deepWork && (
                        <>
                            <StatCard icon="🧠" label="Deep Work" value={`${deepWork.deep_sessions_week}`}
                                sub={`${deepWork.total_deep_minutes}m total (≥45m sessions)`}
                                c1="#6C63FF55" c2="#6C63FF15" delay={0.25} />
                            <StatCard icon="🎯" label="Focus" value={`${deepWork.focus_consistency}%`}
                                sub="Deep sessions ratio"
                                c1="#96CEB455" c2="#96CEB415" delay={0.3} />
                            <StatCard icon="⏱️" label="Longest" value={`${deepWork.longest_session}m`}
                                sub="Best session this week"
                                c1="#4ECDC455" c2="#4ECDC415" delay={0.35} />
                            <StatCard icon="📐" label="Avg Session" value={`${deepWork.avg_session_length}m`}
                                sub="Deep work average"
                                c1="#45B7D155" c2="#45B7D115" delay={0.4} />
                        </>
                    )}
                    {brainLoad && (
                        <StatCard icon="⚡" label="Brain Load" value={`${brainLoad.current_load}%`}
                            sub={brainLoad.status}
                            c1={brainLoad.status === 'optimal' ? '#06D6A055' : '#EF476F55'}
                            c2={brainLoad.status === 'optimal' ? '#06D6A015' : '#EF476F15'}
                            delay={0.45}
                        />
                    )}
                </div>
            </div>

            {/* Activity breakdown — donut + list */}
            <div className="glass rounded-xl p-5 animate-fade-up stagger-4">
                <h2 className="text-sm font-semibold text-text mb-3">Today's Activities</h2>
                {data.today_by_activity.length === 0 ? (
                    <p className="text-sm text-text-dim">No activities logged today. Start a Pomodoro or log manually!</p>
                ) : (
                    <ActivityDonut activities={data.today_by_activity} />
                )}
            </div>

            {/* AI Insights */}
            <div className="glass rounded-xl p-5 animate-fade-up stagger-5 animate-breathe">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-text">🤖 AI Insights</h2>
                    <button onClick={loadAI} disabled={aiLoading}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-all disabled:opacity-50">
                        {aiLoading ? (
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin-slow" style={{ animation: 'spin-slow 0.8s linear infinite' }} />
                                Analyzing...
                            </span>
                        ) : 'Analyze Trends'}
                    </button>
                </div>
                {aiError && <p className="text-sm text-red-400">{aiError}</p>}
                {aiInsight ? (
                    <div className="text-sm text-text/90 whitespace-pre-line leading-relaxed">{aiInsight}</div>
                ) : !aiError && (
                    <p className="text-sm text-text-dim">Click "Analyze Trends" to get AI-powered insights about your habits.</p>
                )}
            </div>

            {/* Recent activity */}
            <div className="glass rounded-xl p-5 animate-fade-up stagger-6">
                <h2 className="text-sm font-semibold text-text mb-3">Recent Activity</h2>
                {data.recent_logs.length === 0 ? (
                    <p className="text-sm text-text-dim">No activity logs yet.</p>
                ) : (
                    <div className="space-y-1">
                        {data.recent_logs.slice(0, 8).map((log, i) => (
                            <div key={log.id}
                                className="flex items-center gap-3 py-2 border-b border-white/5 hover:bg-white/5 rounded-lg px-2 transition-all animate-fade-up"
                                style={{ animationDelay: `${0.3 + i * 0.04}s` }}>
                                <span className="w-6 text-center">{log.activity_icon}</span>
                                <span className="text-sm text-text flex-1">{log.activity_name}</span>
                                <span className="text-xs font-mono text-accent">{log.minutes}m</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-dim">{log.source}</span>
                                <span className="text-[10px] text-text-dim">
                                    {new Date(log.logged_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
