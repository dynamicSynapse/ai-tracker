import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useTheme } from './hooks/useTheme';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Pomodoro from './pages/Pomodoro';
import Timetable from './pages/Timetable';
import Tests from './pages/Tests';
import Diary from './pages/Diary';
import Analytics from './pages/Analytics';
import Goals from './pages/Goals';
import Review from './pages/Review';
import Timeline from './pages/Timeline';
import Metrics from './pages/Metrics';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';

function AppContent() {
    useTheme(); // Initialize theme
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.onStartPomodoro) {
            electronAPI.onStartPomodoro((data: any) => {
                navigate('/pomodoro', { state: { autoStart: data } });
            });
        }
        return () => {
            if (electronAPI?.removeStartPomodoro) {
                electronAPI.removeStartPomodoro();
            }
        };
    }, [navigate]);

    return (
        <div className="flex h-screen overflow-hidden bg-base">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <main
                className="flex-1 overflow-y-auto p-6"
                style={{ marginLeft: sidebarCollapsed ? '72px' : '240px', transition: 'margin-left 0.3s ease' }}
            >
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/activities" element={<Activities />} />
                    <Route path="/pomodoro" element={<Pomodoro />} />
                    <Route path="/timetable" element={<Timetable />} />
                    <Route path="/tests" element={<Tests />} />
                    <Route path="/diary" element={<Diary />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/review" element={<Review />} />
                    <Route path="/timeline" element={<Timeline />} />
                    <Route path="/metrics" element={<Metrics />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <HashRouter>
            <AppContent />
        </HashRouter>
    );
}
