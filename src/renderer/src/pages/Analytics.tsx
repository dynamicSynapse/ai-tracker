import React, { useState, useEffect } from 'react';
import { useApi, EnergyCurvePoint, BurnoutRisk, BrainLoad } from '../hooks/useApi';

interface TopicDist {
    topic: string;
    percentage: number;
    minutes: number;
}

// Recharts removed for custom SVG/CSS implementation to avoid build issues.
// import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

// ─── Energy Clock (Circular Heatmap) ──────────────────────
function EnergyClock({ data }: { data: EnergyCurvePoint[] }) {
    if (!data.length) return null;
    const radius = 100;
    const center = 140;

    return (
        <div className="relative w-full aspect-square max-w-[300px] mx-auto">
            <svg viewBox="0 0 280 280" className="w-full h-full">
                {/* Clock face background */}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="40" />

                {/* Hour segments */}
                {data.map((point, i) => {
                    const angle = (i * 15) - 90; // 15 degrees per hour, start at 12 o'clock
                    const x = center + radius * Math.cos(angle * Math.PI / 180);
                    const y = center + radius * Math.sin(angle * Math.PI / 180);
                    const intensity = point.avg_focus ? (point.avg_focus / 5) : 0;
                    const color = intensity > 0.8 ? '#06D6A0' : intensity > 0.6 ? '#FFD166' : intensity > 0.4 ? '#FF6B6B' : 'rgba(255,255,255,0.05)';

                    return (
                        <g key={i}>
                            <path
                                d={`M ${center} ${center} L ${center + (radius + 20) * Math.cos((angle - 7) * Math.PI / 180)} ${center + (radius + 20) * Math.sin((angle - 7) * Math.PI / 180)} A ${radius + 20} ${radius + 20} 0 0 1 ${center + (radius + 20) * Math.cos((angle + 7) * Math.PI / 180)} ${center + (radius + 20) * Math.sin((angle + 7) * Math.PI / 180)} Z`}
                                fill="transparent" // Invisible wedge for hit area if needed
                            />
                            <line
                                x1={center + (radius - 15) * Math.cos(angle * Math.PI / 180)}
                                y1={center + (radius - 15) * Math.sin(angle * Math.PI / 180)}
                                x2={center + (radius + 15) * Math.cos(angle * Math.PI / 180)}
                                y2={center + (radius + 15) * Math.sin(angle * Math.PI / 180)}
                                stroke={color}
                                strokeWidth={point.avg_focus ? 8 : 2}
                                strokeLinecap="round"
                                className="transition-all duration-500 hover:stroke-white hover:stroke-[10]"
                            >
                                <title>{point.hour}:00 - Avg Focus: {point.avg_focus || '-'}</title>
                            </line>
                            {/* Hour Markers */}
                            {i % 3 === 0 && (
                                <text
                                    x={center + (radius + 35) * Math.cos(angle * Math.PI / 180)}
                                    y={center + (radius + 35) * Math.sin(angle * Math.PI / 180)}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="#6B7280"
                                    fontSize="10"
                                    className="font-mono"
                                >
                                    {point.hour}
                                </text>
                            )}
                        </g>
                    );
                })}
                {/* Center Label */}
                <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" fill="#F9FAFB" fontSize="12" fontWeight="bold">
                    ENERGY
                </text>
                <text x={center} y={center + 15} textAnchor="middle" dominantBaseline="middle" fill="#9CA3AF" fontSize="9">
                    by Hour
                </text>
            </svg>
        </div>
    );
}

// ─── Brain Load Gauge ─────────────────────────────────────
function BrainLoadGauge({ load }: { load: BrainLoad }) {
    const radius = 80;
    const circumference = Math.PI * radius; // Half circle
    const progress = Math.min(load.current_load, 100);
    const offset = circumference - (progress / 100) * circumference;

    const color = load.status === 'optimal' ? '#06D6A0' : load.status === 'high' ? '#FFD166' : '#EF476F';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-48 h-28 overflow-hidden">
                <svg viewBox="0 0 200 110" className="w-full h-full">
                    {/* Background Arc */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="20"
                        strokeLinecap="round"
                    />
                    {/* Foreground Arc */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={color}
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center mb-2">
                    <span className="text-3xl font-bold text-text tabular-nums">{load.current_load}%</span>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider">Cognitive Load</p>
                </div>
            </div>
            <p className={`text-sm font-medium mt-2 ${load.status === 'optimal' ? 'text-emerald-400' : load.status === 'high' ? 'text-amber-400' : 'text-red-400'}`}>
                {load.suggestion}
            </p>
        </div>
    );
}

function TopicChart({ data }: { data: TopicDist[] }) {
    if (!data.length) return <div className="text-sm text-text-dim italic">Not enough data for topics</div>;

    return (
        <div className="space-y-3">
            {data.map((item, i) => (
                <div key={i} className="group">
                    <div className="flex justify-between text-xs text-text-dim mb-1">
                        <span className="group-hover:text-text transition-colors">{item.topic}</span>
                        <span>{item.percentage}% ({Math.round(item.minutes / 60 * 10) / 10}h)</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent/60 group-hover:bg-accent transition-all duration-500 rounded-full"
                            style={{ width: `${item.percentage}%`, transitionDelay: `${i * 0.1}s` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}


export default function Analytics() {
    const api = useApi();
    const [range, setRange] = useState<'week' | 'month' | 'year'>('week');
    const [energyData, setEnergyData] = useState<EnergyCurvePoint[]>([]);
    const [burnoutRisk, setBurnoutRisk] = useState<BurnoutRisk | null>(null);
    const [brainLoad, setBrainLoad] = useState<BrainLoad | null>(null);
    const [topicData, setTopicData] = useState<TopicDist[]>([]);

    useEffect(() => {
        loadIntelligence();
    }, []);

    async function loadIntelligence() {
        try {
            const [e, b, l, t] = await Promise.all([
                api.getEnergyCurve(),
                api.getBurnoutRisk(),
                api.getBrainLoad(),
                api.getTopicDistribution(),
            ]);
            setEnergyData(e);
            setBurnoutRisk(b);
            setBrainLoad(l);
            setTopicData(t);
        } catch (e) { console.error(e); }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8 animate-fade-up">
            <div>
                <h1 className="text-2xl font-bold text-text">Intelligence & Analytics</h1>
                <p className="text-sm text-text-dim mt-0.5">Deep insights into your performance and biology</p>
            </div>

            {/* Top Row: Intelligence Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Energy Curve */}
                <div className="glass rounded-xl p-5 flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-text mb-4 w-full">⚡ Energy Curve</h3>
                    {energyData.length > 0 ? (
                        <EnergyClock data={energyData} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-text-dim text-sm italic">
                            Log more sessions with focus ratings to see your curve
                        </div>
                    )}
                </div>

                {/* Brain Load */}
                <div className="glass rounded-xl p-5 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-text mb-4 w-full">🧠 Brain Load Meter</h3>
                    {brainLoad && <BrainLoadGauge load={brainLoad} />}
                </div>

                {/* Burnout Risk */}
                <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-text mb-4">🔋 Burnout Monitor</h3>
                    {burnoutRisk ? (
                        <div className="flex flex-col h-full justify-between pb-4">
                            <div>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-4xl font-bold text-text">{burnoutRisk.risk_score}/100</span>
                                    <span className={`text-sm font-bold uppercase py-1 px-2 rounded mb-1 ${burnoutRisk.risk_level === 'low' ? 'bg-emerald-500/10 text-emerald-400' :
                                        burnoutRisk.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                            'bg-red-500/10 text-red-400'
                                        }`}>
                                        {burnoutRisk.risk_level} Risk
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                                    <div
                                        className={`h-full transition-all duration-1000 ${burnoutRisk.risk_level === 'low' ? 'bg-emerald-400' :
                                            burnoutRisk.risk_level === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                                            }`}
                                        style={{ width: `${burnoutRisk.risk_score}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs text-text-dim uppercase tracking-wider">Risk Factors:</p>
                                {burnoutRisk.factors.length === 0 ? (
                                    <p className="text-sm text-emerald-400 flex items-center gap-2">
                                        <span>✅</span> All clear. Systems nominal.
                                    </p>
                                ) : (
                                    <ul className="space-y-1">
                                        {burnoutRisk.factors.map((f, i) => (
                                            <li key={i} className="text-sm text-red-300 flex items-center gap-2">
                                                <span>⚠️</span> {f}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-text-dim text-sm italic">
                            Analyzing patterns...
                        </div>
                    )}
                </div>
            </div>

            {/* Topic Saturation */}
            <div className="glass rounded-xl p-6 animate-fade-up stagger-1">
                <h3 className="text-lg font-bold text-text mb-1">Topic Saturation</h3>
                <p className="text-xs text-text-dim mb-6">Distribution of focus across subjects (Last 30 Days)</p>
                <TopicChart data={topicData} />
            </div>

            <div className="h-8"></div>
        </div>
    );
}
