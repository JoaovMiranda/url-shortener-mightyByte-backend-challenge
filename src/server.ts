import { createServer } from 'http';

import cors from 'cors';
import express from 'express';

import errorHandler from './middlewares/errorHandler';
import router from './routes/url.route';
import { ShortUrlWebSocketServer } from './websocket/server';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
  })
);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/', router);

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

const server = createServer(app);

const wsServer = new ShortUrlWebSocketServer(server);

export { wsServer };

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
