# Local Dev Dashboard

A lightweight web interface to monitor local Docker containers and databases in real-time.

## Features

- **Real-time Monitoring:** Uses WebSockets (Socket.io) for live status updates every 3 seconds.
- **Docker Integration:** Automatically lists and monitors all local containers.
- **Database Health Checks:** Pings common databases (PostgreSQL, Redis, MongoDB) on default ports.
- **Modern UI:** Clean, dark-themed dashboard built with React and Lucide icons.

## Prerequisites

- **Node.js** (v18+)
- **Docker Desktop** (running, with "Expose daemon on tcp://localhost:2375 without TLS" or default unix socket access)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. **Run the dashboard:**
   From the root directory:
   ```bash
   npm run dev
   ```

3. **Access the interface:**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Socket.io-client, Lucide React, Vanilla CSS.
- **Backend:** Node.js, Express, Socket.io, Dockerode, PG, Redis, MongoDB.
