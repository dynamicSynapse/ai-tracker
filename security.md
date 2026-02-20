# Security & Privacy Guarantees

## Data Flow

```
Obsidian Vault (.md files)
    │
    ▼ (chokidar file watcher)
    │
    │  READS ONLY:
    │  ✅ File path
    │  ✅ File name  
    │  ✅ Modification time (mtime)
    │  ✅ YAML frontmatter keys/values
    │  ✅ Tags (from frontmatter array)
    │  ❌ File content (NEVER read beyond frontmatter)
    │
    ▼
SQLite Database (tracker.db)
    │
    │  STORES:
    │  ✅ Note metadata (path, name, mtime, tags, frontmatter)
    │  ✅ Study sessions (note_path, minutes, user-entered notes)
    │  ✅ Habits (name, target, streak)
    │  ✅ App settings (vault path, preferences)
    │  ❌ Note content (no column exists for this)
    │
    ▼
REST API (127.0.0.1:8000)  ←→  React UI (local)
```

## Guarantees

### 1. No Note Content Is Ever Stored

The vault watcher uses `gray-matter` to parse only the YAML frontmatter block. After parsing, the file content is immediately discarded — it is never stored in memory beyond the parse operation, never written to the database, and never transmitted over any channel.

The `notes` table has no `content` column. You can verify this:

```sql
.schema notes
-- Result will NOT contain a "content" column
```

### 2. Zero Outbound Network Calls

The app makes **zero** network requests to any external server. There are:
- No telemetry endpoints
- No analytics SDKs
- No auto-update checks to external servers
- No cloud sync features

The only network listener is the local REST API bound to `127.0.0.1:8000`, which is accessible only from the local machine. This server can be disabled entirely in Settings.

### 3. Local-Only API Binding

The Express server binds exclusively to `127.0.0.1`. It does NOT bind to `0.0.0.0`. This means:
- No other device on the network can access the API
- The server is only reachable from processes on the same machine

You can verify this with:

```powershell
netstat -an | findstr "8000"
# Should show: TCP  127.0.0.1:8000  0.0.0.0:0  LISTENING
# Should NOT show: TCP  0.0.0.0:8000  ...
```

### 4. IPC-Only Mode

The HTTP server can be disabled entirely in Settings, switching to IPC-only mode. In this mode:
- No TCP socket is opened
- All communication happens through Electron's IPC mechanism
- The UI continues to function normally

### 5. Data Location

| Mode | Database Path |
|------|---------------|
| Installed | `%APPDATA%\ai-study-tracker\tracker.db` |
| Portable | `<app-dir>\data\tracker.db` |

The database is a standard SQLite file. You can open it with any SQLite tool to inspect its contents.

### 6. Obsidian Plugin Safety

The optional Obsidian companion plugin explicitly strips the `content` field from payloads before sending to the local API:

```typescript
// From obsidian-plugin/main.ts
delete payload.content; // Safety: never send note content
```

### 7. No Auto-Start by Default

The app does not add itself to Windows startup automatically. Auto-start is an opt-in setting.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Note content exfiltration | Content is never parsed beyond frontmatter; no content column in DB |
| Network eavesdropping | API bound to 127.0.0.1 only; IPC-only mode available |
| Unauthorized local access | Standard OS file permissions on %APPDATA% |
| Supply chain attack | Minimal dependency tree; all deps are well-known packages |
