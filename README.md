# Local Dev Dashboard

A professional-grade, lightweight monitoring station for local developers. Designed for "at-a-glance" visibility of Docker containers, databases, AI models, and workspace health.

## 🚀 Key Features

### 1. Real-Time Service Monitoring
- **Docker Containers:** Automatically lists and tracks the status (Running, Exited, etc.) of all local containers.
- **Database Health:** Connectivity pings for common databases (PostgreSQL, Redis, MongoDB) on standard ports.
- **AI Model Status:** Integration with **Ollama** to show downloaded models and highlight which one is currently active in memory.

### 2. Git Workspace Pulse
- **Project Tracking:** Monitors specified project directories for uncommitted changes.
- **Dirty State Detection:** Visual alerts and change counts for repositories with pending work.
- **Branch Visibility:** Displays the currently checked-out Git branch for each repository.

### 3. "TV Mode" Command Center
- **Edge-to-Edge Grid:** A high-density, full-width layout designed for secondary monitors or dedicated TV displays.
- **Full-Screen Toggle:** Enter a distraction-free monitoring mode with a single click.
- **Visual Countdown:** A top-mounted progress bar visualizes the 20-second refresh cycle.

### 4. Smart Alerts & Search
- **Browser Notifications:** Native OS alerts when a service goes down or a project becomes "dirty" (must be enabled via the bell icon).
- **Instant Search:** Quickly filter services, models, or containers by name or image.
- **Category Filters:** Quick-access tabs for Docker, Databases, AI Models, and Projects.

## 🛠 Tech Stack

- **Frontend:** React (TypeScript), Vite, Socket.io-client, Lucide React, Vanilla CSS (Glassmorphism).
- **Backend:** Node.js, Express, Socket.io, Dockerode, PG, Redis, MongoDB, node-fetch.

## 🏁 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Launch the Station:**
   ```bash
   npm run dev
   ```

3. **Access the Dashboard:**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📝 Configuration

- **Polling Interval:** Default is set to **20 seconds** to minimize system resource usage.
- **Custom Projects:** Add your own project directories in `server/index.ts` under the `PROJECT_DIRS` array.
- **Background Image:** Add your own background by replacing `client/src/assets/background.png`.

---
*Created for developers who need a mission control for their local machine.*
