import React, { useState, useEffect } from 'react';
import { useApi, WeeklyStats } from '../hooks/useApi';

export default function Review() {
    const api = useApi();
    const [step, setStep] = useState(0);
    const [stats, setStats] = useState<WeeklyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [reflection, setReflection] = useState({ wins: '', improvements: '' });
    const [focus, setFocus] = useState('');

    useEffect(() => {
        api.getWeeklyStats().then(s => {
            setStats(s);
            setLoading(false);
        });
    }, []);

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        // Save reflection to diary (append)
        const content = `WEEKLY REVIEW:\n\nWINS:\n${reflection.wins}\n\nIMPROVEMENTS:\n${reflection.improvements}\n\nFOCUS NEXT WEEK:\n${focus}`;
        await api.upsertDiary({
            date: new Date().toISOString(),
            content: content,
            mood: stats?.mood || 5,
            energy: stats?.energy || 5, // energy aligned with useApi
            tags: '["weekly-review"]'
        });
        setStep(3); // Success
    };

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin text-2xl">⏳</div></div>;

    return (
        <div className="max-w-xl mx-auto py-10 animate-fade-up">
            <h1 className="text-2xl font-bold text-text mb-1">Weekly Review</h1>
            <p className="text-sm text-text-dim mb-8">Reflect on the past 7 days to optimize the next 7.</p>

            {/* Stepper */}
            <div className="flex gap-2 mb-8">
                {[0, 1, 2].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
                ))}
            </div>

            <div className="glass rounded-xl p-8 min-h-[400px] flex flex-col">
                {step === 0 && stats && (
                    <div className="animate-fade-in flex-1">
                        <h2 className="text-xl font-bold text-text mb-6">The Data</h2>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-xs text-text-dim uppercase">Deep Work</p>
                                <p className="text-2xl font-bold text-emerald-400">{stats.deepWorkMinutes} min</p>
                                <p className="text-xs text-text-dim">{stats.deepWorkSessions} sessions</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-xs text-text-dim uppercase">Total Logged</p>
                                <p className="text-2xl font-bold text-blue-400">{Math.round(stats.totalLogMinutes / 60)} hrs</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-xs text-text-dim uppercase">Avg Mood</p>
                                <p className="text-2xl font-bold text-purple-400">{stats.mood.toFixed(1)}/10</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg">
                                <p className="text-xs text-text-dim uppercase">Avg Energy</p>
                                <p className="text-2xl font-bold text-amber-400">{stats.energy.toFixed(1)}/10</p>
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-text-dim uppercase mb-2">Active Goals Progress</h3>
                        <div className="space-y-2">
                            {stats.activeGoals.map(g => (
                                <div key={g.title} className="flex items-center justify-between text-sm">
                                    <span className="text-text">{g.title}</span>
                                    <span className="text-accent">{g.progress}%</span>
                                </div>
                            ))}
                            {stats.activeGoals.length === 0 && <p className="text-text-dim italic text-sm">No active goals.</p>}
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="animate-fade-in flex-1 space-y-4">
                        <h2 className="text-xl font-bold text-text mb-4">Reflection</h2>

                        <div>
                            <label className="block text-sm font-bold text-emerald-400 mb-2">Wins & Highlights</label>
                            <textarea
                                className="input w-full h-24"
                                placeholder="What went well? What did you achieve?"
                                value={reflection.wins}
                                onChange={e => setReflection({ ...reflection, wins: e.target.value })}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-amber-400 mb-2">Opportunities for Improvement</label>
                            <textarea
                                className="input w-full h-24"
                                placeholder="What got in the way? What can you do better?"
                                value={reflection.improvements}
                                onChange={e => setReflection({ ...reflection, improvements: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in flex-1">
                        <h2 className="text-xl font-bold text-text mb-4">The Plan</h2>
                        <label className="block text-sm font-bold text-accent mb-2">One Big Focus for Next Week</label>
                        <p className="text-xs text-text-dim mb-4">If you could only achieve ONE thing, what would it be?</p>
                        <textarea
                            className="input w-full h-32 text-lg font-medium"
                            placeholder="e.g. Finish the API migration..."
                            value={focus}
                            onChange={e => setFocus(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-text mb-2">Review Complete!</h2>
                        <p className="text-text-dim">Your reflection has been saved to your diary.</p>
                        <p className="text-text-dim mt-2">Go crush the new week.</p>
                    </div>
                )}

                <div className="mt-8 flex justify-between">
                    {step > 0 && step < 3 && (
                        <button onClick={handleBack} className="text-text-dim hover:text-text px-4 py-2">Back</button>
                    )}
                    {step === 0 && <div />} {/* Spacer */}

                    {step < 2 ? (
                        <button onClick={handleNext} className="btn btn-primary px-8">Next</button>
                    ) : step === 2 ? (
                        <button onClick={handleSubmit} className="btn btn-accent px-8">Complete Review</button>
                    ) : (
                        <button onClick={() => window.location.hash = '#/'} className="btn btn-secondary px-8">Go to Dashboard</button>
                    )}
                </div>
            </div>
        </div>
    );
}
