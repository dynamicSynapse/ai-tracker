import React, { useState, useEffect } from 'react';
import { useApi, TestScoreRow, TestTrendPoint, TestSummary } from '../hooks/useApi';

type Tab = 'all' | 'prelims' | 'mains';

const PRELIMS_SUBJECTS = ['GS Paper 1', 'GS Paper 2', 'CSAT'];
const MAINS_SUBJECTS = ['GS Paper 1', 'GS Paper 2', 'GS Paper 3', 'GS Paper 4 (Ethics)', 'Essay', 'Optional Paper 1', 'Optional Paper 2'];

interface ScoreForm {
    id?: number;
    test_type: 'prelims' | 'mains';
    subject: string;
    topic: string;
    marks_obtained: string;
    total_marks: string;
    date: string;
    duration_minutes: string;
    notes: string;
}

const emptyForm = (): ScoreForm => ({
    test_type: 'prelims',
    subject: '',
    topic: '',
    marks_obtained: '',
    total_marks: '',
    date: new Date().toISOString().split('T')[0],
    duration_minutes: '',
    notes: '',
});

export default function Tests() {
    const api = useApi();
    const [tab, setTab] = useState<Tab>('all');
    const [scores, setScores] = useState<TestScoreRow[]>([]);
    const [trends, setTrends] = useState<TestTrendPoint[]>([]);
    const [summary, setSummary] = useState<TestSummary | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<ScoreForm>(emptyForm());
    const [subjectFilter, setSubjectFilter] = useState('');
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    useEffect(() => { load(); }, [tab, subjectFilter]);

    async function load() {
        const typeFilter = tab !== 'all' ? tab : undefined;
        const [s, t, sum] = await Promise.all([
            api.getTestScores({ test_type: typeFilter, subject: subjectFilter || undefined }),
            api.getTestTrends(typeFilter, subjectFilter || undefined),
            api.getTestSummary(typeFilter),
        ]);
        setScores(s);
        setTrends(t);
        setSummary(sum);
    }

    async function handleSave() {
        const mo = parseFloat(form.marks_obtained);
        const tm = parseFloat(form.total_marks);
        if (isNaN(mo) || isNaN(tm) || tm <= 0 || !form.subject) return;

        if (form.id) {
            await api.updateTestScore(form.id, {
                test_type: form.test_type,
                subject: form.subject,
                topic: form.topic || undefined,
                marks_obtained: mo,
                total_marks: tm,
                date: form.date,
                duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
                notes: form.notes || undefined,
            });
        } else {
            await api.addTestScore({
                test_type: form.test_type,
                subject: form.subject,
                topic: form.topic || undefined,
                marks_obtained: mo,
                total_marks: tm,
                date: form.date,
                duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
                notes: form.notes || undefined,
            });
        }
        setShowForm(false);
        setForm(emptyForm());
        load();
    }

    async function handleDelete(id: number) {
        await api.deleteTestScore(id);
        load();
    }

    function openEdit(score: TestScoreRow) {
        setForm({
            id: score.id,
            test_type: score.test_type as 'prelims' | 'mains',
            subject: score.subject,
            topic: score.topic || '',
            marks_obtained: String(score.marks_obtained),
            total_marks: String(score.total_marks),
            date: score.date,
            duration_minutes: score.duration_minutes ? String(score.duration_minutes) : '',
            notes: score.notes || '',
        });
        setShowForm(true);
    }

    async function handleAI() {
        setAiLoading(true); setAiError('');
        try {
            const r = await api.analyzeTestPerformance(tab !== 'all' ? tab : undefined);
            if (r.error) setAiError(r.error);
            else setAiInsight(r.summary);
        } catch { setAiError('Failed to analyze'); }
        finally { setAiLoading(false); }
    }

    const pctColor = (pct: number) => pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
    const pctBg = (pct: number) => pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    const subjects = form.test_type === 'prelims' ? PRELIMS_SUBJECTS : MAINS_SUBJECTS;
    const allSubjects = [...new Set(scores.map(s => s.subject))];

    // Chart dimensions
    const chartW = 700, chartH = 200, padL = 40, padB = 24;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Test Scores</h1>
                    <p className="text-sm text-text-dim mt-0.5">Track and analyze your Prelims & Mains performance</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-surface rounded-lg">
                        {(['all', 'prelims', 'mains'] as Tab[]).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-4 py-2 text-sm font-medium transition-all rounded-lg capitalize ${tab === t ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}`}
                            >{t}</button>
                        ))}
                    </div>
                    <button onClick={() => { setForm(emptyForm()); setShowForm(true); }}
                        className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-all"
                    >+ Add Score</button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && summary.count > 0 && (
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Tests Taken', value: summary.count, sub: `P: ${summary.total_tests_prelims} | M: ${summary.total_tests_mains}`, color: '#6C63FF' },
                        { label: 'Avg Score', value: `${summary.avg_percentage}%`, sub: 'Overall average', color: '#00B4D8' },
                        { label: 'Best Score', value: `${summary.best_percentage}%`, sub: 'Personal best', color: '#06D6A0' },
                        { label: 'Lowest Score', value: `${summary.worst_percentage}%`, sub: 'Needs improvement', color: '#FF6B6B' },
                    ].map((card, i) => (
                        <div key={i} className="glass rounded-xl p-4" style={{ borderLeft: `3px solid ${card.color}` }}>
                            <p className="text-xs text-text-dim">{card.label}</p>
                            <p className="text-2xl font-bold text-text mt-1">{card.value}</p>
                            <p className="text-xs text-text-dim mt-0.5">{card.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Score Entry Form */}
            {showForm && (
                <div className="glass rounded-xl p-5 glow-border space-y-3">
                    <h3 className="text-sm font-semibold text-text">{form.id ? 'Edit Score' : 'New Test Score'}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Test Type</label>
                            <select value={form.test_type} onChange={e => setForm({ ...form, test_type: e.target.value as 'prelims' | 'mains', subject: '' })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none">
                                <option value="prelims">Prelims</option>
                                <option value="mains">Mains</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Subject</label>
                            <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none">
                                <option value="">Select subject...</option>
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="__custom">Custom...</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Topic (optional)</label>
                            <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Ancient India"
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                    </div>
                    {form.subject === '__custom' && (
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Custom Subject Name</label>
                            <input onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Enter subject name"
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                    )}
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Marks Obtained</label>
                            <input type="number" step="0.5" value={form.marks_obtained} onChange={e => setForm({ ...form, marks_obtained: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Total Marks</label>
                            <input type="number" step="0.5" value={form.total_marks} onChange={e => setForm({ ...form, total_marks: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Date</label>
                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-text-dim block mb-1">Duration (min)</label>
                            <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} placeholder="120"
                                className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-text-dim block mb-1">Notes (optional)</label>
                        <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any observations..."
                            className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-sm text-text outline-none" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium">Save Score</button>
                        <button onClick={() => { setShowForm(false); setForm(emptyForm()); }} className="px-4 py-2 rounded-lg text-text-dim text-sm hover:text-text">Cancel</button>
                    </div>
                </div>
            )}

            {/* Trend Chart */}
            {trends.length > 1 && (
                <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-text">📈 Score Trend</h2>
                        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                            className="px-3 py-1 rounded-lg bg-surface border border-white/10 text-xs text-text outline-none">
                            <option value="">All Subjects</option>
                            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <svg viewBox={`0 0 ${chartW} ${chartH + padB}`} className="w-full h-48">
                        {/* Y-axis grid */}
                        {[0, 25, 50, 75, 100].map(v => {
                            const y = chartH - (v / 100) * chartH;
                            return (
                                <g key={v}>
                                    <line x1={padL} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.06)" />
                                    <text x={padL - 4} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}%</text>
                                </g>
                            );
                        })}
                        {/* Line + dots */}
                        {trends.length > 0 && (() => {
                            const step = (chartW - padL) / Math.max(trends.length - 1, 1);
                            const points = trends.map((t, i) => ({
                                x: padL + i * step,
                                y: chartH - (t.percentage / 100) * chartH,
                                pct: t.percentage,
                                date: t.date,
                                subject: t.subject,
                            }));
                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            return (
                                <>
                                    <path d={linePath} fill="none" stroke="var(--accent, #6C63FF)" strokeWidth="2" strokeLinecap="round" />
                                    {points.map((p, i) => (
                                        <g key={i}>
                                            <circle cx={p.x} cy={p.y} r="4" fill="var(--accent, #6C63FF)" stroke="rgba(0,0,0,0.3)" strokeWidth="1">
                                                <title>{p.date}: {p.pct}% ({p.subject})</title>
                                            </circle>
                                            {i % Math.max(1, Math.floor(trends.length / 8)) === 0 && (
                                                <text x={p.x} y={chartH + 14} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle">
                                                    {p.date.slice(5)}
                                                </text>
                                            )}
                                        </g>
                                    ))}
                                    {/* Moving average line if enough data */}
                                    {trends.length >= 5 && (() => {
                                        const ma: { x: number; y: number }[] = [];
                                        for (let i = 2; i < trends.length - 2; i++) {
                                            const avg = (trends[i - 2].percentage + trends[i - 1].percentage + trends[i].percentage + trends[i + 1].percentage + trends[i + 2].percentage) / 5;
                                            ma.push({ x: padL + i * step, y: chartH - (avg / 100) * chartH });
                                        }
                                        const maPath = ma.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                        return <path d={maPath} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />;
                                    })()}
                                </>
                            );
                        })()}
                    </svg>
                    <p className="text-[10px] text-text-dim text-center mt-1">Dashed line = 5-point moving average</p>
                </div>
            )}

            {/* Subject-wise Breakdown */}
            {summary && summary.by_subject.length > 0 && (
                <div className="glass rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-text mb-3">📊 Subject Breakdown</h2>
                    <div className="space-y-2">
                        {summary.by_subject.map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-text w-36 truncate">{s.subject}</span>
                                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${pctBg(s.avg_pct)}`}
                                        style={{ width: `${s.avg_pct}%`, opacity: 0.7 }} />
                                </div>
                                <span className={`text-xs font-mono w-14 text-right ${pctColor(s.avg_pct)}`}>{s.avg_pct}%</span>
                                <span className="text-[10px] text-text-dim w-16">({s.count} tests)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Score History */}
            <div className="glass rounded-xl p-5">
                <h2 className="text-sm font-semibold text-text mb-3">📋 Score History</h2>
                {scores.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-text-dim mb-2">No test scores recorded yet</p>
                        <button onClick={() => { setForm(emptyForm()); setShowForm(true); }}
                            className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-sm hover:bg-accent/30 transition-all">+ Add Your First Score</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-text-dim text-xs border-b border-white/5">
                                    <th className="text-left py-2 font-medium">Date</th>
                                    <th className="text-left py-2 font-medium">Type</th>
                                    <th className="text-left py-2 font-medium">Subject</th>
                                    <th className="text-left py-2 font-medium">Topic</th>
                                    <th className="text-right py-2 font-medium">Score</th>
                                    <th className="text-right py-2 font-medium">%</th>
                                    <th className="text-right py-2 font-medium">Time</th>
                                    <th className="text-right py-2 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {scores.map(score => (
                                    <tr key={score.id} className="border-b border-white/5 hover:bg-white/5 group">
                                        <td className="py-2.5 text-text">{score.date}</td>
                                        <td className="py-2.5">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${score.test_type === 'prelims' ? 'bg-blue-500/15 text-blue-400' : 'bg-orange-500/15 text-orange-400'}`}>
                                                {score.test_type}
                                            </span>
                                        </td>
                                        <td className="py-2.5 text-text">{score.subject}</td>
                                        <td className="py-2.5 text-text-dim">{score.topic || '-'}</td>
                                        <td className="py-2.5 text-right text-text font-mono">{score.marks_obtained}/{score.total_marks}</td>
                                        <td className={`py-2.5 text-right font-bold font-mono ${pctColor(score.percentage)}`}>{score.percentage}%</td>
                                        <td className="py-2.5 text-right text-text-dim">{score.duration_minutes ? `${score.duration_minutes}m` : '-'}</td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(score)} className="text-xs px-2 py-1 rounded bg-white/5 text-text-dim hover:text-text">Edit</button>
                                                <button onClick={() => handleDelete(score.id)} className="text-xs px-2 py-1 rounded bg-white/5 text-red-400 hover:text-red-300">Del</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* AI Analysis */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-text">🤖 AI Performance Analysis</h2>
                    <button onClick={handleAI} disabled={aiLoading}
                        className="text-xs px-3 py-1 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-all disabled:opacity-50"
                    >{aiLoading ? 'Analyzing...' : 'Analyze Performance'}</button>
                </div>
                {aiError && <p className="text-sm text-red-400">{aiError}</p>}
                {aiInsight ? (
                    <div className="text-sm text-text/90 whitespace-pre-line leading-relaxed">{aiInsight}</div>
                ) : !aiError && (
                    <p className="text-sm text-text-dim">Add test scores, then click "Analyze Performance" for AI-powered insights on your strengths, weaknesses, and study strategies.</p>
                )}
            </div>
        </div>
    );
}
