import type { ConnectionRegistry } from './ports/connection-registry.port.js';
import type { ServerEvent, ServerEventData, ServerEventName } from './realtime.types.js';

/**
 * How the rest of the server reaches a connected driver.
 *
 * Everything that wants to push something depends on this and not on the
 * socket layer, so raising an event never means knowing whether the driver is
 * connected, how many devices they have, or that WebSockets exist at all. A
 * driver who is offline simply misses it — every event here also has a REST
 * endpoint that reports the same state on next launch.
 */
export class RealtimeService {
  constructor(private readonly connections: ConnectionRegistry) {}

  send<K extends ServerEventName>(driverId: string, event: K, data: ServerEventData[K]): void {
    const frame: ServerEvent<K> = { event, sentAt: new Date().toISOString(), data };
    this.connections.publish(driverId, frame);
  }

  isConnected(driverId: string): boolean {
    return this.connections.isConnected(driverId);
  }
}
