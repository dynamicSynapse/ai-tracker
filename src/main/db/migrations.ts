import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL DEFAULT 'other',
            icon TEXT DEFAULT '📌',
            color TEXT DEFAULT '#6C63FF',
            daily_target_minutes INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_id INTEGER NOT NULL REFERENCES activities(id),
            minutes INTEGER NOT NULL CHECK(minutes > 0),
            notes TEXT,
            source TEXT DEFAULT 'manual',
            focus_rating INTEGER CHECK(focus_rating >= 1 AND focus_rating <= 5),
            distractions TEXT,
            energy_after INTEGER CHECK(energy_after >= 1 AND energy_after <= 5),
            logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_logs_activity ON activity_logs(activity_id);
        CREATE INDEX IF NOT EXISTS idx_logs_date ON activity_logs(logged_at);

        CREATE TABLE IF NOT EXISTS timetable_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            activity_id INTEGER NOT NULL REFERENCES activities(id),
            label TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(day_of_week);

        CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(day_of_week);

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            status TEXT DEFAULT 'pending', -- pending, active, completed, archived
            priority TEXT DEFAULT 'medium', -- low, medium, high
            deadline TEXT,
            progress INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vision_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL, -- 'image' or 'quote'
            content TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS test_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_type TEXT NOT NULL CHECK(test_type IN ('prelims', 'mains')),
            subject TEXT NOT NULL,
            topic TEXT,
            marks_obtained REAL NOT NULL,
            total_marks REAL NOT NULL CHECK(total_marks > 0),
            percentage REAL NOT NULL,
            date TEXT NOT NULL,
            duration_minutes INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_test_type ON test_scores(test_type);
        CREATE INDEX IF NOT EXISTS idx_test_date ON test_scores(date);

        CREATE TABLE IF NOT EXISTS diary_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE NOT NULL,
            mood INTEGER CHECK(mood >= 1 AND mood <= 5),
            energy_level INTEGER CHECK(energy_level >= 1 AND energy_level <= 5),
            content TEXT,
            tags TEXT,
            wins TEXT,
            challenges TEXT,
            tomorrow_plan TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_entries(date);

        CREATE TABLE IF NOT EXISTS user_xp (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            title TEXT DEFAULT 'Novice'
        );
        INSERT OR IGNORE INTO user_xp (id, total_xp, level, title) VALUES (1, 0, 1, 'Novice');

        CREATE TABLE IF NOT EXISTS xp_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount INTEGER NOT NULL,
            source TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS custom_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            unit TEXT NOT NULL,
            type TEXT DEFAULT 'number',
            target REAL,
            archived INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS metric_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_id INTEGER REFERENCES custom_metrics(id) ON DELETE CASCADE,
            value REAL NOT NULL,
            note TEXT,
            logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            time TEXT NOT NULL, -- Format HH:mm
            days TEXT DEFAULT '[]', -- JSON array of active day indices [0-6] or empty for everyday
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Safe Column Migrations for existing databases
    const safeAlter = (table: string, column: string, type: string) => {
        const hasCol = db.prepare(`SELECT COUNT(*) as cnt FROM pragma_table_info('${table}') WHERE name = '${column}'`).get() as { cnt: number };
        if (hasCol.cnt === 0) {
            try {
                db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
                console.log(`Migrated: Added ${column} to ${table}`);
            } catch (e) {
                console.error(`Migration failed: Add ${column} to ${table}`, e);
            }
        }
    };

    safeAlter('activity_logs', 'focus_rating', 'INTEGER CHECK(focus_rating >= 1 AND focus_rating <= 5)');
    safeAlter('activity_logs', 'energy_after', 'INTEGER CHECK(energy_after >= 1 AND energy_after <= 5)');
    safeAlter('activity_logs', 'distractions', 'TEXT');
    safeAlter('goals', 'priority', "TEXT DEFAULT 'medium'");
    safeAlter('goals', 'deadline', 'TEXT');
}

export function seedDefaultActivities(db: Database.Database): void {
    const defaults = [
        { name: 'Reading Newspaper', category: 'study', icon: '📰', color: '#6C63FF' },
        { name: 'Current Affairs', category: 'study', icon: '🌍', color: '#00B4D8' },
        { name: 'Prelims Test', category: 'test', icon: '📝', color: '#FF6B6B' },
        { name: 'Mains Test', category: 'test', icon: '✍️', color: '#F77F00' },
        { name: 'Gym', category: 'fitness', icon: '💪', color: '#06D6A0' },
        { name: 'Yoga', category: 'fitness', icon: '🧘', color: '#8338EC' },
        { name: 'Study Session', category: 'study', icon: '📚', color: '#FB5607' },
    ];

    const stmt = db.prepare(
        'INSERT OR IGNORE INTO activities (name, category, icon, color) VALUES (?, ?, ?, ?)',
    );

    for (const a of defaults) {
        stmt.run(a.name, a.category, a.icon, a.color);
    }
}
