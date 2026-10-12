import type { ServerEvent, ServerEventName } from '../realtime.types.js';

/**
 * Where the open connections live.
 *
 * In-memory today, which is correct while one process serves everybody. The
 * moment there are two, a driver's socket is on one of them and the event is
 * raised on the other, so this becomes a Redis pub/sub adapter and nothing
 * above it changes.
 */
export interface ConnectionRegistry {
  /** Sends to every connection this driver has open. A driver may have two. */
  publish<K extends ServerEventName>(driverId: string, event: ServerEvent<K>): void;
  /** Whether the driver has at least one connection open right now. */
  isConnected(driverId: string): boolean;
}
