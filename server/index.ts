import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Docker from 'dockerode';
import cors from 'cors';
import { Client as PGClient } from 'pg';
import { createClient as createRedisClient } from 'redis';
import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

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
    
    // Also try to see what's currently running (ps)
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

async function collectServiceStatus() {
  const [dockerContainers, dbStatuses, aiModels] = await Promise.all([
    getDockerContainers(),
    Promise.all(COMMON_DBS.map(async db => ({
      id: db.type,
      name: db.name,
      status: await checkDatabase(db.type, db.port),
      type: 'database'
    }))),
    getOllamaModels()
  ]);

  return [...dockerContainers, ...dbStatuses, ...aiModels];
}

io.on('connection', (socket) => {
  // Initial check on connection
  collectServiceStatus().then(services => socket.emit('service-update', services));

  const interval = setInterval(async () => {
    const services = await collectServiceStatus();
    socket.emit('service-update', services);
  }, 20000); // 20 seconds

  socket.on('disconnect', () => clearInterval(interval));
});

httpServer.listen(3001, () => {
  console.log(`Monitoring server running on http://localhost:3001`);
});
