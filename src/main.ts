import { createServer } from 'node:http';
import { createApp } from './app.js';
import { attachWebSocket } from './infrastructure/websocket/ws-gateway.js';
import { env } from './config/env.js';

/**
 * Starts the server once the database is reachable and its tables exist.
 *
 * A database that cannot be reached stops the process here with a readable
 * message, rather than letting every request fail one at a time.
 *
 * The HTTP server is created explicitly rather than by app.listen, because the
 * WebSocket layer needs it: the socket shares this port, so there is one
 * hostname and one certificate instead of a second service to deploy.
 */
const { app, realtime } = await createApp();

const server = createServer(app);
attachWebSocket(server, realtime);

server.listen(env.PORT, () => {
  console.log(`Kit Taxi Driver API \u00b7 http://localhost:${env.PORT}`);
  console.log(`Realtime               \u00b7 ws://localhost:${env.PORT}/ws`);
});
