# Acceptance Tests

## Test A — App Launch & Local Binding

```powershell
# Start the app, then verify:
netstat -an | findstr "8000"
# Expected: TCP  127.0.0.1:8000  0.0.0.0:0  LISTENING
# Must NOT show:  0.0.0.0:8000
```

## Test B — Sync

```bash
curl -s -X POST http://127.0.0.1:8000/sync \
  -H "Content-Type: application/json" \
  -d '{"path":"notes/a.md","name":"a.md","mtime":1700000000,"tags":["#study"],"frontmatter":{"habit":"daily-reading"}}'
```
**Expected:** `{"status":"ok","action":"created"}`

## Test C — Log Session & Dashboard

```bash
# Log two sessions
curl -s -X POST http://127.0.0.1:8000/log_session \
  -H "Content-Type: application/json" \
  -d '{"note_path":"notes/a.md","minutes":30,"notes":"revise ch5"}'

curl -s -X POST http://127.0.0.1:8000/log_session \
  -H "Content-Type: application/json" \
  -d '{"note_path":"notes/a.md","minutes":20}'

# Check dashboard
curl -s http://127.0.0.1:8000/dashboard | findstr "today_minutes"
```
**Expected:** `"today_minutes":50`

## Test D — Habit & Streak

```bash
curl -s -X POST http://127.0.0.1:8000/create_habit \
  -H "Content-Type: application/json" \
  -d '{"name":"daily-reading","daily_target_minutes":30}'
```
**Expected:** `{"id":1,"status":"ok"}`

## Test E — Plugin Safety

Inspect POST /sync request body from the Obsidian plugin.
- Assert: payload does NOT contain a `content` field
- Verify: `PRAGMA table_info('notes')` shows no `content` column

## Test F — UI Acceptance

- [ ] Dashboard renders: Today's minutes, habits, recent sessions, 7-day sparkline
- [ ] Quick log button → modal → submit → session appears in table
- [ ] Habit card shows progress ring and streak count
- [ ] Pomodoro timer starts, counts down, and auto-logs on completion

## Test G — Privacy Toggle

- [ ] Settings → disable HTTP server → apply
- [ ] `netstat -an | findstr "8000"` shows no listener
- [ ] Dashboard still loads and functions via IPC
