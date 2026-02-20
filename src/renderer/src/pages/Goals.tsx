import React, { useState, useEffect } from 'react';
import { useApi, GoalRow, GoalInput, VisionItem as VisionItemType, GoalAlignment } from '../hooks/useApi';
// Custom Simple Bar Chart Component
const SimpleBarChart = ({ data }: { data: GoalAlignment[] }) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.goalPoints, d.timeMinutes / 60))); // Normalize minutes to hours for comparison? Or just scale independently.
    // Actually, let's just show two bars per category side-by-side.

    return (
        <div className="h-full w-full flex items-end justify-between gap-2 px-2 pb-6 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-t border-white/50 w-full h-px"></div>
                <div className="border-t border-white/50 w-full h-px"></div>
                <div className="border-t border-white/50 w-full h-px"></div>
                <div className="border-t border-white/50 w-full h-px"></div>
            </div>

            {data.map((d, i) => {
                // Normalize for visual height (max 100%)
                // Goal points (0-10ish usually), Time (minutes, could be 600).
                // Let's normalize per metric for visualization.
                const maxPoints = Math.max(...data.map(x => x.goalPoints)) || 1;
                const maxTime = Math.max(...data.map(x => x.timeMinutes)) || 1;

                const hPoints = (d.goalPoints / maxPoints) * 80;
                const hTime = (d.timeMinutes / maxTime) * 80;

                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <div className="flex items-end gap-1 h-full w-full justify-center">
                            {/* Goal Bar */}
                            <div className="w-1/2 bg-violet-500 rounded-t-sm relative transition-all hover:bg-violet-400" style={{ height: `${hPoints}%` }}>
                                <div className="absolute bottom-full left-0 mb-1 text-[9px] text-violet-200 hidden group-hover:block whitespace-nowrap z-10 bg-surface p-1 rounded border border-white/10">
                                    Priority: {d.goalPoints}
                                </div>
                            </div>
                            {/* Time Bar */}
                            <div className="w-1/2 bg-emerald-500 rounded-t-sm relative transition-all hover:bg-emerald-400" style={{ height: `${hTime}%` }}>
                                <div className="absolute bottom-full right-0 mb-1 text-[9px] text-emerald-200 hidden group-hover:block whitespace-nowrap z-10 bg-surface p-1 rounded border border-white/10">
                                    Time: {d.timeMinutes}m
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] text-text-dim truncate w-full text-center rotate-[-45deg] origin-top-left mt-2 translate-y-2">{d.category}</span>
                    </div>
                );
            })}
        </div>
    );
};

// Custom Radial/Polar Approximation (Distribution)
const SimpleDistribution = ({ data }: { data: GoalAlignment[] }) => {
    // Just a stacked bar for now, easier than SVG radar without library
    const totalTime = data.reduce((acc, curr) => acc + curr.timeMinutes, 0) || 1;

    return (
        <div className="h-full w-full flex flex-col justify-center gap-3">
            {data.map(d => (
                <div key={d.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-dim">{d.category}</span>
                        <span className="text-text">{Math.round((d.timeMinutes / totalTime) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/50" style={{ width: `${(d.timeMinutes / totalTime) * 100}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

function GoalItem({ goal, allGoals, onEdit, onDelete, level = 0 }: {
    goal: GoalRow;
    allGoals: GoalRow[];
    onEdit: (g: GoalRow) => void;
    onDelete: (id: number) => void;
    level?: number;
}) {
    const children = allGoals.filter(g => g.parent_id === goal.id);
    const [expanded, setExpanded] = useState(true);

    const priorityIcons = {
        low: '☁️',
        medium: '🔹',
        high: '🔥',
    };

    return (
        <div className="animate-fade-up">
            <div
                className={`group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all ${level > 0 ? 'ml-6 border-l-white/10' : 'mb-2 glass'}`}
            >
                {/* Expand Toggle */}
                {children.length > 0 ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-text-dim"
                    >
                        {expanded ? '▼' : '▶'}
                    </button>
                ) : (
                    <div className="w-5" />
                )}

                {/* Status Indicator */}
                <div className={`w-2 h-2 rounded-full ${goal.status === 'completed' ? 'bg-emerald-400' : goal.status === 'active' ? 'bg-blue-400' : 'bg-white/20'}`} />

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(goal)}>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text">{goal.title}</span>
                        {goal.priority === 'high' && <span title="High Priority">{priorityIcons.high}</span>}
                    </div>
                    {(goal.description || goal.deadline) && (
                        <div className="flex items-center gap-3 text-xs text-text-dim mt-0.5">
                            {goal.deadline && <span>📅 {new Date(goal.deadline).toLocaleDateString()}</span>}
                            {goal.description && <span className="truncate max-w-[300px]">{goal.description}</span>}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="w-24 flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] text-text-dim uppercase">
                        <span>Progress</span>
                        <span>{goal.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${goal.progress}%` }}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => onEdit(goal)} className="p-1.5 hover:bg-white/10 rounded text-text-dim hover:text-text">✏️</button>
                    <button onClick={() => onDelete(goal.id)} className="p-1.5 hover:bg-red-500/20 rounded text-text-dim hover:text-red-400">🗑️</button>
                </div>
            </div>

            {/* Render Children */}
            {expanded && children.length > 0 && (
                <div className="relative">
                    {level === 0 && <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />}
                    {children.map(child => (
                        <GoalItem
                            key={child.id}
                            goal={child}
                            allGoals={allGoals}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Goals Page ──────────────────────────────────────
export default function Goals() {
    const api = useApi();
    const [goals, setGoals] = useState<GoalRow[]>([]);
    const [visionItems, setVisionItems] = useState<VisionItemType[]>([]);
    const [alignment, setAlignment] = useState<GoalAlignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [editGoal, setEditGoal] = useState<Partial<GoalInput> | null>(null);
    const [showVisionInput, setShowVisionInput] = useState(false);
    const [visionUrl, setVisionUrl] = useState('');
    const [view, setView] = useState<'roadmap' | 'strategy'>('roadmap');

    useEffect(() => { loadGoals(); }, []);

    async function loadGoals() {
        try {
            const [gData, vData, aData] = await Promise.all([
                api.getGoals(),
                api.getVisionItems(),
                api.getGoalAlignment()
            ]);
            setGoals(gData);
            setVisionItems(vData);
            setAlignment(aData);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function handleSave() {
        if (!editGoal || !editGoal.title) return;
        try {
            await api.upsertGoal(editGoal as GoalInput);
            setEditGoal(null);
            loadGoals();
        } catch (e) { console.error(e); }
    }

    async function handleDelete(id: number) {
        if (!confirm('Delete this goal and all its sub-goals?')) return;
        try {
            await api.deleteGoal(id);
            loadGoals();
        } catch (e) { console.error(e); }
    }

    async function handleAddVision() {
        if (!visionUrl) return;
        try {
            await api.addVisionItem('image', visionUrl);
            setVisionUrl('');
            setShowVisionInput(false);
            loadGoals();
        } catch (e) { console.error(e); }
    }

    async function handleDeleteVision(id: number) {
        if (!confirm('Remove this item?')) return;
        try {
            await api.deleteVisionItem(id);
            loadGoals();
        } catch (e) { console.error(e); }
    }

    const rootGoals = goals.filter(g => !g.parent_id);

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-fade-up">
                <div>
                    <h1 className="text-2xl font-bold text-text">Strategic Roadmap</h1>
                    <p className="text-sm text-text-dim mt-0.5">Define your North Star and break it down.</p>
                </div>
                <button
                    onClick={() => setEditGoal({ progress: 0, status: 'active', priority: 'medium' })}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <span>+</span> New Goal
                </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-4 mb-8 border-b border-white/5 pb-1">
                <button
                    onClick={() => setView('roadmap')}
                    className={`pb-2 px-2 text-sm font-medium transition-colors ${view === 'roadmap' ? 'text-accent border-b-2 border-accent' : 'text-text-dim hover:text-text'}`}
                >
                    Roadmap & Vision
                </button>
                <button
                    onClick={() => setView('strategy')}
                    className={`pb-2 px-2 text-sm font-medium transition-colors ${view === 'strategy' ? 'text-accent border-b-2 border-accent' : 'text-text-dim hover:text-text'}`}
                >
                    Strategy Analysis
                </button>
            </div>

            {view === 'strategy' ? (
                <div className="animate-fade-in space-y-8">
                    {/* Alignment Chart */}
                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-text mb-2">Alignment Check</h3>
                        <p className="text-sm text-text-dim mb-6">Are you spending time where it matters? Comparing Goal Priority vs Actual Time Spent.</p>

                        <div className="h-[400px] w-full p-4 relative">
                            {alignment.length > 0 ? (
                                <SimpleBarChart data={alignment} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-dim">No data yet</div>
                            )}
                        </div>
                        <div className="flex justify-center gap-6 text-xs mt-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-violet-500 rounded-sm"></div> Goal Priority</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Time Spent (Relative)</div>
                        </div>
                    </div>

                    {/* Radar Chart (Balance) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-text mb-4">Focus Balance</h3>
                            <div className="h-[300px]">
                                <SimpleDistribution data={alignment} />
                            </div>
                        </div>

                        <div className="glass p-6 rounded-xl flex flex-col justify-center">
                            <h3 className="text-lg font-bold text-text mb-4">Insights</h3>
                            <ul className="space-y-3 text-sm text-text-dim">
                                {alignment.map(a => {
                                    const ratio = a.timeMinutes > 0 ? a.goalPoints / a.timeMinutes : 0;
                                    const isNeglected = a.goalPoints > 5 && a.timeMinutes < 60; // High priority but low time
                                    const isDistraction = a.goalPoints < 3 && a.timeMinutes > 300; // Low priority but high time

                                    if (isNeglected) return (
                                        <li key={a.category} className="flex gap-2 text-orange-400">
                                            ⚠️ <b>{a.category}</b> is high priority but receiving little attention.
                                        </li>
                                    );
                                    if (isDistraction) return (
                                        <li key={a.category} className="flex gap-2 text-red-400">
                                            🛑 <b>{a.category}</b> is taking up too much time relative to its priority.
                                        </li>
                                    );
                                    return null;
                                })}
                                {alignment.length > 0 && alignment.every(a => a.timeMinutes > 0) && (
                                    <li className="text-emerald-400">✨ Good data collection! Keep tracking to refine insights.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Vision Board Section */}
                    <div className="mb-10 animate-fade-up">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-text-dim uppercase tracking-wider">Vision Board</h2>
                            <button
                                onClick={() => setShowVisionInput(!showVisionInput)}
                                className="text-xs text-accent hover:text-accent-hover"
                            >
                                {showVisionInput ? 'Cancel' : '+ Add Image'}
                            </button>
                        </div>

                        {showVisionInput && (
                            <div className="mb-4 flex gap-2 animate-fade-in">
                                <input
                                    className="input flex-1"
                                    placeholder="Paste image URL..."
                                    value={visionUrl}
                                    onChange={(e) => setVisionUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddVision()}
                                    autoFocus
                                />
                                <button onClick={handleAddVision} className="btn btn-primary whitespace-nowrap">Add</button>
                            </div>
                        )}

                        {visionItems.length === 0 ? (
                            !showVisionInput && (
                                <div
                                    onClick={() => setShowVisionInput(true)}
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <p className="text-text-dim text-sm">Visualize your success. Click to add images.</p>
                                </div>
                            )
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {visionItems.map((item) => (
                                    <div key={item.id} className="group relative aspect-video rounded-xl overflow-hidden bg-black/20">
                                        <img src={item.content} alt="Vision" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <button
                                            onClick={() => handleDeleteVision(item.id)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Goals List */}
                    {loading ? (
                        <div className="flex justify-center py-20"><div className="animate-spin text-2xl">⏳</div></div>
                    ) : rootGoals.length === 0 ? (
                        <div className="glass rounded-xl p-10 text-center text-text-dim animate-fade-up">
                            <p className="text-lg mb-2">No goals defined yet.</p>
                            <p className="text-sm">Start by creating a high-level goal like "Master Full-Stack Dev" or "Run a Marathon".</p>
                            <button
                                onClick={() => setEditGoal({ progress: 0, status: 'active', priority: 'medium' })}
                                className="mt-4 btn btn-secondary"
                            >
                                Create First Goal
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                {rootGoals.map(g => (
                                    <GoalItem
                                        key={g.id}
                                        goal={g}
                                        allGoals={goals}
                                        onEdit={(g) => setEditGoal({
                                            id: g.id,
                                            parent_id: g.parent_id || undefined,
                                            title: g.title,
                                            description: g.description || undefined,
                                            category: g.category || undefined,
                                            status: g.status,
                                            priority: g.priority,
                                            deadline: g.deadline || undefined,
                                            progress: g.progress
                                        })}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            {editGoal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-semibold text-text">{editGoal.id ? 'Edit Goal' : 'New Goal'}</h3>
                            <button onClick={() => setEditGoal(null)} className="text-text-dim hover:text-text">✕</button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-xs text-text-dim uppercase font-bold">Title</label>
                                <input
                                    autoFocus
                                    className="w-full text-lg font-bold bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                    placeholder="e.g., Launch SaaS App"
                                    value={editGoal.title || ''}
                                    onChange={e => setEditGoal({ ...editGoal, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-text-dim uppercase font-bold">Category</label>
                                    <input
                                        className="w-full bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                        placeholder="Work, Health..."
                                        value={editGoal.category || ''}
                                        onChange={e => setEditGoal({ ...editGoal, category: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-text-dim uppercase font-bold">Deadline</label>
                                    <input
                                        type="date"
                                        className="w-full bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                        value={editGoal.deadline || ''}
                                        onChange={e => setEditGoal({ ...editGoal, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-text-dim uppercase font-bold">Status</label>
                                    <select
                                        className="w-full bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                        value={editGoal.status || 'active'}
                                        onChange={e => setEditGoal({ ...editGoal, status: e.target.value })}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-text-dim uppercase font-bold">Priority</label>
                                    <select
                                        className="w-full bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                        value={editGoal.priority || 'medium'}
                                        onChange={e => setEditGoal({ ...editGoal, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-text-dim uppercase font-bold">Progress %</label>
                                    <input
                                        type="number" min="0" max="100"
                                        className="w-full bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                        value={editGoal.progress?.toString() || '0'}
                                        onChange={e => setEditGoal({ ...editGoal, progress: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-text-dim uppercase font-bold">Parent Goal</label>
                                <select
                                    className="w-full bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                    value={editGoal.parent_id || ''}
                                    onChange={e => setEditGoal({ ...editGoal, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                                >
                                    <option value="">(None - Root Goal)</option>
                                    {goals.filter(g => g.id !== editGoal.id).map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-text-dim uppercase font-bold">Description / Notes</label>
                                <textarea
                                    className="w-full min-h-[100px] bg-surface-light text-text border border-white/10 rounded-lg p-2 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                                    placeholder="Details about this goal..."
                                    value={editGoal.description || ''}
                                    onChange={e => setEditGoal({ ...editGoal, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-white/5">
                            <button onClick={() => setEditGoal(null)} className="btn btn-ghost">Cancel</button>
                            <button onClick={handleSave} className="btn btn-primary">Save Goal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
