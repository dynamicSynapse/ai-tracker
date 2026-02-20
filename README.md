# 🚀 AI Study Tracker (Omni-Logger)

A futuristic, privacy-first desktop application built with React, Vite, and Electron designed to help you track habits, study sessions, and strategic goals. It features a completely integrated Telegram Bot allowing you to log activities naturally through chat!

## ✨ Features

- **Omni-Logger Telegram Bot**: Message your bot on Telegram ("I studied Polity for 45m" or "Drank 2L of water") and it automatically parse the intent using NLP and logs it into your local database.
- **Dynamic Pomodoro Timer**: Start and stop focus sessions directly from the desktop UI or remotely via Telegram commands.
- **Goal Hierarchy System**: Break down massive multi-year goals into actionable sub-goals with visual progress rollup bars.
- **Burnout Warning System**: Analyzes your logged hours and mood patterns to alert you if you are over-working.
- **AI-Powered Insights**: Get daily trend summaries and automatic schedule generation using your choice of AI provider.
- **100% Local Data Privacy**: All data is stored locally in an SQLite database on your machine. You own it.

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, Vite, Recharts (for analytics)
- **Backend**: Electron, Better SQLite3, Grammy (Telegram Bot API)
- **AI Integrations**: Fireworks AI, OpenAI, Google Gemini, Anthropic

## 🚀 Getting Started

### 📦 Quick Install (Windows)
For non-technical users, you do **not** need to install Node.js, NPM, or Python. The application is entirely self-contained!

1. Download the `AI Tracker Setup 1.0.0.exe` file located right here in the main folder of this repository. (Click on it, then click the **Download raw file** icon).
2. Double-click to install and launch the app automatically.
3. All data is stored privately on your local hard drive.

---

### 💻 Developer Setup (Source Code)

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [Telegram Bot Token](https://core.telegram.org/bots/features#botfather) (optional, if you want mobile logging)
- An AI API Key (Fireworks, OpenAI, Google, or Anthropic)

#### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-study-tracker.git
   cd ai-study-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server (runs Vite and Electron simultaneously):
   ```bash
   npm run dev
   ```

### ⚙️ Configuration
You do **NOT** need to configure `.env` files. Simply launch the application, click on the **Settings** tab in the sidebar, and provide:
1. Your preferred **AI Provider** (e.g. OpenAI) and your API Key.
2. Your **Telegram Bot Token** to activate the background Omni-Logger.

## 📦 Building for Production

If you want to manually compile the application from the raw source code instead of using the provided `.exe`:
```bash
# To build the Windows installer
npm run dist:win

# To build the macOS DMG (Must be run on a Mac!)
npm run dist:mac
```
The compiled binaries will be output to the local `release/` directory.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
