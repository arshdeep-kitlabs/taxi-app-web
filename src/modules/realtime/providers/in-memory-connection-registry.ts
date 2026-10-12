import type { WebSocket } from 'ws';
import type { ConnectionRegistry } from '../ports/connection-registry.port.js';
import type { ServerEvent, ServerEventName } from '../realtime.types.js';

/**
 * The open sockets, kept by driver.
 *
 * A driver can hold more than one — a second device, or a reconnect that
 * raced the old socket's close — so every connection gets the event rather
 * than whichever one was registered last.
 */
export class InMemoryConnectionRegistry implements ConnectionRegistry {
  private readonly byDriver = new Map<string, Set<WebSocket>>();

  add(driverId: string, socket: WebSocket): void {
    const existing = this.byDriver.get(driverId);
    if (existing) {
      existing.add(socket);
      return;
    }
    this.byDriver.set(driverId, new Set([socket]));
  }

  remove(driverId: string, socket: WebSocket): void {
    const sockets = this.byDriver.get(driverId);
    if (!sockets) return;
    sockets.delete(socket);
    // Drop the key with the last socket, or the map grows for the life of the
    // process with an entry per driver who ever connected.
    if (sockets.size === 0) this.byDriver.delete(driverId);
  }

  isConnected(driverId: string): boolean {
    return (this.byDriver.get(driverId)?.size ?? 0) > 0;
  }

  publish<K extends ServerEventName>(driverId: string, event: ServerEvent<K>): void {
    const sockets = this.byDriver.get(driverId);
    if (!sockets) return;

    const frame = JSON.stringify(event);
    for (const socket of sockets) {
      // OPEN is 1. A socket mid-close still sits in the set until its close
      // handler runs, and writing to it throws.
      if (socket.readyState === 1) socket.send(frame);
    }
  }
}
