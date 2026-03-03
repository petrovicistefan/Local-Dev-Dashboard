import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Docker from 'dockerode';
import cors from 'cors';
import { Client as PGClient } from 'pg';
import { createClient as createRedisClient } from 'redis';
import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Global state to track transitions
let lastServiceStatuses: Record<string, string> = {};

async function getDockerContainers() {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id.substring(0, 12),
      name: c.Names && c.Names[0] ? c.Names[0].replace('/', '') : 'Unknown',
      image: c.Image,
      status: c.State,
      type: 'docker'
    }));
  } catch (err) {
    return [];
  }
}

async function getOllamaModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return [];
    const data = await response.json() as { models: any[] };
    
    const psResponse = await fetch('http://localhost:11434/api/ps');
    const psData = psResponse.ok ? await psResponse.json() as { models: any[] } : { models: [] };
    const runningNames = new Set(psData.models.map(m => m.name));

    return data.models.map((m: any) => ({
      id: `ollama-${m.name}`,
      name: m.name,
      status: runningNames.has(m.name) ? 'running' : 'loaded',
      image: `${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB`,
      type: 'ai-model'
    }));
  } catch (err) {
    return [];
  }
}

async function getGitStatus(dirPath: string) {
  try {
    const { stdout: status } = await execAsync('git status --short', { cwd: dirPath });
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: dirPath });
    const changesCount = status.trim().split('\n').filter(line => line.length > 0).length;
    
    return {
      id: `git-${path.basename(dirPath)}`,
      name: path.basename(dirPath),
      status: changesCount > 0 ? `${changesCount} changes` : 'clean',
      image: branch.trim(),
      type: 'git-repo'
    };
  } catch (err) {
    return null;
  }
}

async function checkDatabase(type: 'postgres' | 'redis' | 'mongodb', port: number) {
  try {
    if (type === 'postgres') {
      const client = new PGClient({ host: 'localhost', port, connectionTimeoutMillis: 1000 });
      await client.connect();
      await client.end();
      return 'running';
    } else if (type === 'redis') {
      const client = createRedisClient({ socket: { host: 'localhost', port, connectTimeout: 1000 } });
      await client.connect();
      await client.quit();
      return 'running';
    } else if (type === 'mongodb') {
      const client = new MongoClient(`mongodb://localhost:${port}`, { serverSelectionTimeoutMS: 1000 });
      await client.connect();
      await client.close();
      return 'running';
    }
  } catch (err) {
    return 'stopped';
  }
  return 'stopped';
}

const COMMON_DBS = [
  { name: 'PostgreSQL', type: 'postgres' as const, port: 5432 },
  { name: 'Redis', type: 'redis' as const, port: 6379 },
  { name: 'MongoDB', type: 'mongodb' as const, port: 27017 }
];

const PROJECT_DIRS = [
  process.cwd(),
  path.join(process.cwd(), '..')
];

async function collectServiceStatus() {
  const [dockerContainers, dbStatuses, aiModels, gitStatuses] = await Promise.all([
    getDockerContainers(),
    Promise.all(COMMON_DBS.map(async db => ({
      id: db.type,
      name: db.name,
      status: await checkDatabase(db.type, db.port),
      type: 'database'
    }))),
    getOllamaModels(),
    Promise.all(PROJECT_DIRS.map(dir => getGitStatus(dir)))
  ]);

  const allServices = [
    ...dockerContainers, 
    ...dbStatuses, 
    ...aiModels, 
    ...gitStatuses.filter((s): s is any => s !== null)
  ];

  // Detect transitions for alerts
  const alerts: any[] = [];
  allServices.forEach(service => {
    const prevStatus = lastServiceStatuses[service.id];
    if (prevStatus && prevStatus !== service.status) {
      // Alert if service was running/loaded and now it's stopped/exited
      const wasUp = ['running', 'loaded', 'clean'].includes(prevStatus);
      const isDown = ['stopped', 'exited'].includes(service.status);
      
      if (wasUp && isDown) {
        alerts.push({
          title: 'Service Alert',
          message: `${service.name} has gone down!`,
          type: 'error'
        });
      }
    }
    lastServiceStatuses[service.id] = service.status;
  });

  return { services: allServices, alerts };
}

io.on('connection', (socket) => {
  collectServiceStatus().then(data => {
    socket.emit('service-update', data.services);
  });

  const interval = setInterval(async () => {
    const data = await collectServiceStatus();
    socket.emit('service-update', data.services);
    if (data.alerts.length > 0) {
      socket.emit('service-alert', data.alerts);
    }
  }, 20000);

  // Handle service actions (Start, Stop, Restart)
  socket.on('service-action', async ({ id, action, type }) => {
    console.log(`Action received: ${action} on ${id} (${type})`);
    try {
      if (type === 'docker') {
        const container = docker.getContainer(id);
        if (action === 'start') await container.start();
        if (action === 'stop') await container.stop();
        if (action === 'restart') await container.restart();
        
        // Immediate refresh after action
        const data = await collectServiceStatus();
        io.emit('service-update', data.services);
      }
    } catch (err: any) {
      console.error(`Action failed: ${err.message}`);
      socket.emit('service-alert', [{
        title: 'Action Failed',
        message: `Could not ${action} ${id}: ${err.message}`,
        type: 'error'
      }]);
    }
  });

  socket.on('disconnect', () => clearInterval(interval));
});

httpServer.listen(3001, () => {
  console.log(`Monitoring server running on http://localhost:3001`);
});
