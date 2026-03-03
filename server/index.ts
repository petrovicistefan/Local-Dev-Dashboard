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

// Directories to monitor for git status
const PROJECT_DIRS = [
  process.cwd(), // The dashboard itself
  path.join(process.cwd(), '..') // The parent playground directory
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

  return [
    ...dockerContainers, 
    ...dbStatuses, 
    ...aiModels, 
    ...gitStatuses.filter((s): s is any => s !== null)
  ];
}

io.on('connection', (socket) => {
  collectServiceStatus().then(services => socket.emit('service-update', services));

  const interval = setInterval(async () => {
    const services = await collectServiceStatus();
    socket.emit('service-update', services);
  }, 20000);

  socket.on('disconnect', () => clearInterval(interval));
});

httpServer.listen(3001, () => {
  console.log(`Monitoring server running on http://localhost:3001`);
});
