import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/activities', icon: '🎯', label: 'Activities' },
    { to: '/pomodoro', icon: '⏱️', label: 'Pomodoro' },
    { to: '/timetable', icon: '📅', label: 'Timetable' },
    { to: '/tests', icon: '📋', label: 'Tests' },
    { to: '/diary', icon: '📓', label: 'Diary' },
    { to: '/goals', icon: '🎯', label: 'Goals' },
    { to: '/review', icon: '📝', label: 'Review' },
    { to: '/timeline', icon: '⏪', label: 'Timeline' },
    { to: '/analytics', icon: '📈', label: 'Analytics' },
    { to: '/metrics', icon: '🔢', label: 'Metrics' },
    { to: '/reminders', icon: '🔔', label: 'Reminders' },
    { to: '/settings', icon: '⚙️', label: 'Settings' },
];

import { useApi, UserLevel, BrainLoad } from '../hooks/useApi';

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const api = useApi();
    const [level, setLevel] = React.useState<UserLevel | null>(null);
    const [brainLoad, setBrainLoad] = React.useState<BrainLoad | null>(null);
    const [sprintMode, setSprintMode] = React.useState(false);

    React.useEffect(() => {
        const fetchStats = () => {
            api.getUserLevel().then(setLevel).catch(() => { });
            api.getBrainLoad().then(setBrainLoad).catch(() => { });
        };
        fetchStats();
        // Poll for level updates every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        if (sprintMode) {
            document.body.classList.add('sprint-mode');
        } else {
            document.body.classList.remove('sprint-mode');
        }
    }, [sprintMode]);

    const nextLevelXp = level ? Math.pow(level.level, 2) * 100 : 100;
    const progress = level ? (level.total_xp / nextLevelXp) * 100 : 0;
    return (
        <aside
            className="fixed left-0 top-0 h-screen glass border-r border-white/5 flex flex-col z-50 transition-all duration-300"
            style={{ width: collapsed ? '72px' : '240px' }}
        >
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-xl flex-shrink-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-accent/10 group-hover:bg-accent/20 transition-colors" />
                    {level ? (
                        <span className="font-bold text-accent text-sm">L{level.level}</span>
                    ) : (
                        '🔥'
                    )}
                </div>
                {!collapsed && (
                    <div className="animate-fade-in flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <h1 className="text-sm font-bold text-text tracking-tight">AI Tracker</h1>
                            {level && <span className="text-[10px] text-accent font-mono">{Math.floor(progress)}%</span>}
                        </div>
                        {level ? (
                            <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
                            </div>
                        ) : (
                            <p className="text-xs text-text-dim">Elite Mode</p>
                        )}
                    </div>
                )}
            </div>

            <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-accent/15 text-accent glow-border'
                                : 'text-text-dim hover:text-text hover:bg-white/5'
                            }`
                        }
                        aria-label={item.label}
                    >
                        <span className="text-lg flex-shrink-0 w-7 text-center">{item.icon}</span>
                        {!collapsed && (
                            <span className="text-sm font-medium animate-fade-in">{item.label}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-3 border-t border-white/5 space-y-2">
                {!collapsed && brainLoad && (
                    <div className="px-2 py-2 mb-2 bg-white/5 rounded-lg">
                        <div className="flex justify-between text-xs text-text-dim mb-1">
                            <span>Brain Load</span>
                            <span className={brainLoad.status === 'optimal' ? 'text-green-400' : 'text-red-400'}>
                                {brainLoad.current_load}%
                            </span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${brainLoad.status === 'optimal' ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${brainLoad.current_load}%` }}
                            />
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setSprintMode(!sprintMode)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${sprintMode ? 'bg-orange-500/20 text-orange-400' : 'text-text-dim hover:text-text hover:bg-white/5'
                        }`}
                >
                    <span className="text-lg">⚡</span>
                    {!collapsed && <span className="text-sm font-medium">Sprint Mode</span>}
                </button>

                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-text-dim hover:text-text hover:bg-white/5 transition-all"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span className="text-sm">{collapsed ? '→' : '←'}</span>
                    {!collapsed && <span className="text-xs font-medium">Collapse</span>}
                </button>
            </div>
        </aside>
    );
}
