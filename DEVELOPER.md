# Developer Guide

## Architecture Overview

The app is structured into clean, modular layers:

```
src/
├── main/           # Electron main process (Node.js)
│   ├── index.ts    # App entry, window, tray, lifecycle
│   ├── api/        # Express server + IPC handlers
│   ├── db/         # SQLite wrapper, migrations, queries
│   ├── vault/      # File watcher + frontmatter parser
│   └── scheduler/  # Cron jobs + notifications
├── preload/        # Context bridge (IPC → renderer)
└── renderer/       # React + Vite UI
    └── src/
        ├── components/  # Reusable UI components
        ├── pages/       # Page-level compositions
        └── hooks/       # Data access hooks
```

## Adding a New API Endpoint

1. Add the query function in `src/main/db/queries.ts`
2. Add the Express route in `src/main/api/routes.ts`
3. Add the IPC handler in `src/main/api/ipc-handlers.ts`
4. Add the method in `src/preload/index.ts`
5. Use via `useApi()` hook in the renderer

## Plugin System

### Plugin Structure

```
plugins/
  my-plugin/
    manifest.json
    index.js
```

### manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A sample plugin",
  "author": "Your Name"
}
```

### Plugin Lifecycle Hooks

```typescript
interface PluginHooks {
  onActivate?(): void | Promise<void>;
  onDeactivate?(): void | Promise<void>;
  onSync?(note: NoteMetadata): void | Promise<void>;
  onLogSession?(session: SessionRow): void | Promise<void>;
  onDailySummary?(summary: DashboardData): void | Promise<void>;
}
```

### Plugin Data Storage

Plugins can persist data via a scoped key-value store:

```typescript
// The plugin_data table provides scoped storage per plugin
// Access via IPC: get-plugin-data, set-plugin-data
```

### Creating a Plugin

1. Create a directory under `plugins/` with your plugin ID
2. Add `manifest.json` with required fields
3. Create `index.js` exporting an object with lifecycle hooks
4. Restart the app to load the plugin

## Theme Customization

The app uses CSS custom properties for theming. Override these in your plugin's CSS:

```css
:root {
  --accent: #00F0FF;        /* Primary accent color */
  --accent-muted: rgba(0, 240, 255, 0.2);
  --accent-glow: rgba(0, 240, 255, 0.35);
}
```

Tailwind tokens are defined in `tailwind.config.js` and can be extended.

## Database Schema

See `src/main/db/migrations.ts` for the complete schema. Key tables:

- `notes` — Synced vault metadata
- `sessions` — Study session logs
- `habits` — Tracking goals with streaks
- `settings` — App configuration
- `plugin_data` — Plugin key-value store

## Building & Packaging

```powershell
# Development
npm run dev

# Production build
npm run build

# Windows installer + portable
npm run dist
```

Build config is in `electron-builder.yml`.
