import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Docker from 'dockerode';
import cors from 'cors';
import { Client as PGClient } from 'pg';
import { createClient as createRedisClient } from 'redis';
import { MongoClient } from 'mongodb';
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
            status: c.State, // 'running', 'exited', etc.
            type: 'docker'
        }));
    }
    catch (err) {
        console.error('Docker error:', err);
        return [];
    }
}
async function checkDatabase(type, port) {
    try {
        if (type === 'postgres') {
            const client = new PGClient({
                host: 'localhost',
                port,
                connectionTimeoutMillis: 2000,
            });
            await client.connect();
            await client.end();
            return 'running';
        }
        else if (type === 'redis') {
            const client = createRedisClient({
                socket: { host: 'localhost', port, connectTimeout: 2000 }
            });
            await client.connect();
            await client.quit();
            return 'running';
        }
        else if (type === 'mongodb') {
            const client = new MongoClient(`mongodb://localhost:${port}`, { serverSelectionTimeoutMS: 2000 });
            await client.connect();
            await client.close();
            return 'running';
        }
    }
    catch (err) {
        return 'stopped';
    }
    return 'stopped';
}
const COMMON_DBS = [
    { name: 'PostgreSQL', type: 'postgres', port: 5432 },
    { name: 'Redis', type: 'redis', port: 6379 },
    { name: 'MongoDB', type: 'mongodb', port: 27017 }
];
async function collectServiceStatus() {
    const dockerContainers = await getDockerContainers();
    const dbStatuses = await Promise.all(COMMON_DBS.map(async (db) => ({
        id: db.type,
        name: db.name,
        status: await checkDatabase(db.type, db.port),
        type: 'database'
    })));
    return [...dockerContainers, ...dbStatuses];
}
io.on('connection', (socket) => {
    console.log('Client connected');
    const interval = setInterval(async () => {
        const services = await collectServiceStatus();
        socket.emit('service-update', services);
    }, 3000);
    socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Client disconnected');
    });
});
const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Monitoring server running on http://localhost:${PORT}`);
});
