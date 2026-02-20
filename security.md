# Security & Privacy Guarantees

AI Study Tracker is designed with a privacy-first, local-first architecture. You own your data.

## Data Flow & Storage

### 1. 100% Local SQLite Database
All your personal data, including:
- Daily diary entries
- Focus session logs (Pomodoro times)
- Custom habits and metrics
- Goal hierarchies and reflections
- App settings

...are stored exclusively in a local SQLite database file (`tracker.db`) on your machine.
- **Windows / Mac / Linux installed path**: `%APPDATA%/ai-study-tracker/tracker.db` (or OS equivalent)
- The application **never** syncs this database to any external cloud server.

### 2. Electron IPC Architecture
The frontend React UI communicates with the backend Node.js processes exclusively through Electron's secure Inter-Process Communication (IPC) protocol. 
- There are **no open local ports** (e.g., no `127.0.0.1:8000` listening on your machine).
- The application does not expose any web servers to your local network.

## Network & API Promises

### 1. Zero Telemetry
AI Study Tracker contains **zero** tracking SDKs.
- No Google Analytics
- No Mixpanel/PostHog
- No crash reporters sending data without your consent.

### 2. Outbound-Only API Calls (Opt-in)
The application makes outbound network requests *only* when you explicitly configure and use the AI or Telegram features. If you do not provide API keys in the Settings page, the app remains 100% offline.

When configured, the app makes requests to:
- **Your chosen AI Provider** (Fireworks AI, OpenAI, Google, or Anthropic): Used strictly for generating schedule suggestions, weekly reviews, and parsing natural language Telegram messages. Your prompts and context are sent to their endpoints using HTTPS.
- **Telegram Bot API**: Used for the long-polling background thread to intercept DMs sent to your personal bot, and to send replies back to you.

Your API keys are stored securely in your local `tracker.db` and are never transmitted to any third party other than the direct provider.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Unauthorized Cloud Access | Impossible. Data is never uploaded to a cloud database. |
| Network Eavesdropping | All outbound API calls (AI & Telegram) use secure HTTPS connections. |
| Malicious local access | The SQLite database is secured by your host Operating System's standard user file permissions. |
| Supply Chain Attack | The application utilizes a standard Vite + Electron build chain with well-known, audited npm dependencies. |
