import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { messageFor } from '../../common/errors/messages.js';
import type { TokenService } from '../../modules/auth/ports/token-service.port.js';
import type { ShiftRepository } from '../../modules/rides/ports/ride-repository.port.js';
import type { InMemoryConnectionRegistry } from '../../modules/realtime/providers/in-memory-connection-registry.js';
import type { RealtimeService } from '../../modules/realtime/realtime.service.js';
import type { ClientMessage } from '../../modules/realtime/realtime.types.js';

/** The one path that upgrades. Everything else on this port stays HTTP. */
const PATH = '/ws';

/**
 * Close codes. 1000–2999 are reserved by the protocol, so application reasons
 * live in the 4000s. The app branches on these to decide whether to reconnect.
 */
const CLOSE = {
  /** The token was rejected, or ran out. Refresh, then reconnect. */
  UNAUTHORIZED: 4401,
  /** The connection stopped answering pings. Reconnect straight away. */
  STALE: 4408,
} as const;

/** How often an idle connection is checked, and how long it has to answer. */
const HEARTBEAT_MS = 30_000;

/**
 * The WebSocket half of the API.
 *
 * It shares the HTTP server, so there is one port, one hostname and one TLS
 * certificate — the socket is the same deployment as the REST API rather than
 * a second service to run and secure.
 *
 * Authentication happens during the upgrade, before the connection exists: a
 * bad token is answered with 401 and the socket never opens, so there is no
 * window in which an unauthenticated connection is attached to anything.
 */
export function attachWebSocket(
  server: Server,
  deps: {
    tokens: TokenService;
    connections: InMemoryConnectionRegistry;
    realtime: RealtimeService;
    shifts: ShiftRepository;
  },
): WebSocketServer {
  // noServer, because the upgrade is handled by hand below: `ws` would
  // otherwise accept the socket before the token has been looked at.
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== PATH) {
      socket.destroy();
      return;
    }

    const token = bearerFrom(request.headers.authorization) ?? url.searchParams.get('token');
    const claims = token ? deps.tokens.verify(token) : null;

    // Only a driver's token opens a driver's socket. An admin token verifies
    // perfectly well and must still be refused, exactly as on the REST side —
    // and told apart from an expired one, or the app refreshes a token that
    // was never the right kind.
    if (!claims || claims.kind !== 'auth') {
      const code = !token ? 'NO_TOKEN' : claims ? 'WRONG_TOKEN_TYPE' : 'TOKEN_EXPIRED';
      socket.write(
        `HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n` +
          JSON.stringify({ success: false, error: { code, message: messageFor(code) } }),
      );
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
      void onConnected(ws, claims.subject, deps);
    });
  });

  // An idle TCP connection can stay "open" long after the phone has gone, so
  // liveness is proved rather than assumed. A socket that misses one round of
  // pings is closed, which also ends its shift through the close handler.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const alive = (ws as WebSocket & { isAlive?: boolean }).isAlive;
      if (alive === false) {
        ws.close(CLOSE.STALE, 'No response to ping');
        continue;
      }
      (ws as WebSocket & { isAlive?: boolean }).isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return wss;
}

function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
}

type Deps = {
  tokens: TokenService;
  connections: InMemoryConnectionRegistry;
  realtime: RealtimeService;
  shifts: ShiftRepository;
};

/**
 * Everything that happens once a connection is authenticated and open.
 *
 * The driver id comes from the token and is captured here, so no message a
 * client sends can ever name a different driver.
 */
async function onConnected(ws: WebSocket, driverId: string, deps: Deps): Promise<void> {
  const socket = ws as WebSocket & { isAlive?: boolean };
  socket.isAlive = true;
  // The protocol's own pong, answering ws.ping() below — not the
  // connectionAlive event, which answers a checkConnection message.
  ws.on('pong', () => {
    socket.isAlive = true;
  });

  deps.connections.add(driverId, ws);

  const open = await deps.shifts.openShift(driverId);
  send(ws, 'connected', {
    driverId,
    isOnline: open !== null,
    tokenExpiresAt: new Date(
      Date.now() + deps.tokens.authTokenLifetimeSeconds * 1000,
    ).toISOString(),
  });

  ws.on('message', (raw) => {
    void handle(ws, driverId, raw.toString(), deps);
  });

  ws.on('close', () => {
    deps.connections.remove(driverId, ws);
    // Losing the connection is going offline. A driver whose phone died is not
    // available for work, and leaving the shift open would bill them online
    // time they never worked. A second device keeps them on.
    if (!deps.connections.isConnected(driverId)) {
      void deps.shifts.endShift(driverId);
    }
  });

  // Without this an error on the socket is an unhandled 'error' event, which
  // takes the process down.
  ws.on('error', () => ws.close());
}

async function handle(ws: WebSocket, driverId: string, raw: string, deps: Deps): Promise<void> {
  let message: ClientMessage;
  try {
    message = JSON.parse(raw) as ClientMessage;
  } catch {
    send(ws, 'error', { code: 'INVALID_FRAME', message: messageFor('INVALID_FRAME') });
    return;
  }

  switch (message?.event) {
    case 'checkConnection':
      send(ws, 'connectionAlive', { at: new Date().toISOString() });
      return;

    case 'goOnline': {
      const shift = await deps.shifts.startShift(driverId);
      // Sent to every device, not just the one that asked: the toggle has to
      // read the same on a driver's second phone.
      deps.realtime.send(driverId, 'onlineStatusChanged', { isOnline: true, since: shift.startedAt });
      return;
    }

    case 'goOffline': {
      await deps.shifts.endShift(driverId);
      deps.realtime.send(driverId, 'onlineStatusChanged', { isOnline: false, since: null });
      return;
    }

    default:
      send(ws, 'error', {
        code: 'UNKNOWN_EVENT',
        message: messageFor('UNKNOWN_EVENT'),
        inReplyTo: typeof message?.event === 'string' ? message.event : undefined,
      });
  }
}

/** Replies to the one socket that asked, rather than to all of the driver's. */
function send(ws: WebSocket, event: string, data: unknown): void {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify({ event, sentAt: new Date().toISOString(), data }));
}
