# Local Dev Dashboard

A professional-grade, lightweight monitoring station for local developers. Designed for "at-a-glance" visibility of Docker containers, databases, AI models, and workspace health.

## 🚀 Key Features

### 1. Real-Time Service Monitoring
- **Docker Containers:** Automatically lists and tracks the status (Running, Exited, etc.) of all local containers.
- **Interactive Controls:** Start, Stop, and Restart Docker containers directly from the UI.
- **Database Health:** Connectivity pings for common databases (PostgreSQL, Redis, MongoDB) on standard ports.
- **AI Model Status:** Integration with **Ollama** to show downloaded models and highlight which one is currently active in memory.

### 2. Git Workspace Pulse & CI/CD
- **Project Tracking:** Monitors specified project directories for uncommitted changes.
- **Dirty State Detection:** Visual alerts and change counts for repositories with pending work.
- **Pipeline Pulse:** Real-time GitHub Actions build status (Success, Failure, In-Progress) for each repository.
- **Branch Visibility:** Displays the currently checked-out Git branch.

### 3. "TV Mode" & System Health
- **Host Metrics Bar:** Live CPU Load and RAM Usage monitoring of your station.
- **Edge-to-Edge Grid:** A high-density, full-width layout optimized for large displays and TVs.
- **Visual Countdown:** A top-mounted progress bar visualizes the 20-second refresh cycle.

### 4. Smart Alerts & Search
- **Browser Notifications:** Native OS alerts for service downtime or "dirty" projects.
- **Instant Search:** Quickly filter services, models, or containers by name or image.
- **Persistent Settings:** Toggle visibility of categories (Docker, DBs, AI, Projects) via the settings modal.

## 🛠 Tech Stack

- **Frontend:** React (TypeScript), Vite, Socket.io-client, Lucide React, Vanilla CSS.
- **Backend:** Node.js, Express, Socket.io, Dockerode, SystemInformation, node-fetch.

## 🏁 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the `server/` directory (see [Configuration](#-configuration)).

3. **Launch the Station:**
   ```bash
   npm run dev
   ```

4. **Access the Dashboard:**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📝 Configuration

To achieve the full "Mission Control" behavior, customize the following in your local setup:

### 1. Project Directories (Git Pulse)
Update the `PROJECT_DIRS` array in `server/index.ts` to include the absolute paths of the projects you want to monitor:
```typescript
const PROJECT_DIRS = [
  '/Users/yourname/Documents/projects/my-app',
  '/Users/yourname/Documents/playground'
];
```

### 2. Pipeline Pulse (GitHub API)
To monitor private repositories or avoid rate limits, create `server/.env` and add a GitHub Personal Access Token:
```env
GITHUB_TOKEN=your_personal_access_token_here
```

### 3. Service Ports
The dashboard pings databases on default ports. If you use custom ports, update the `COMMON_DBS` array in `server/index.ts`:
```typescript
const COMMON_DBS = [
  { name: 'PostgreSQL', type: 'postgres', port: 5432 },
  { name: 'Custom DB', type: 'postgres', port: 5433 }
];
```

### 4. Background Customization
Replace `client/src/assets/background.png` with your own image to change the dashboard's background texture. The default opacity is set to `0.05` in `App.css`.

### 5. Polling Intervals
- **Services:** Every **20 seconds** (configurable in `REFRESH_INTERVAL` in `App.tsx` and `server/index.ts`).
- **System Metrics:** Every **5 seconds** (configurable in `server/index.ts`).

## 🤝 Contributing & Open Source

This project is open-source under the **MIT License**. Contributions are welcome! Feel free to open issues or submit pull requests.

## 👤 Connect with Me

I'm always looking to expand my network and collaborate on interesting projects. Let's connect!

- **LinkedIn:** [Stefan Petrovici](https://www.linkedin.com/in/stefanpetrovici/)
- **GitHub:** [@petrovicistefan](https://github.com/petrovicistefan)

## ☕ Support the Project

If this dashboard makes your development life a little easier, consider supporting its development:

- **Buy Me a Coffee:** [Support here](https://www.buymeacoffee.com/petrovicistefan)

---
*Created for developers who need a mission control for their local machine.*
