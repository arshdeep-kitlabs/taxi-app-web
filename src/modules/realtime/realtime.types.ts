import type { ApplicationStatus, Rejection } from '../../domain/driver.js';

/**
 * Every frame in either direction, so a reader never has to guess which shape
 * a message has. `event` is the discriminator and the only thing to branch on.
 *
 * `sentAt` is the server's clock, not the client's. It is there so a late
 * delivery after a reconnect can be ordered and, where it matters, ignored —
 * a ride offer that arrives after its countdown expired is stale, and the app
 * should be able to tell without asking.
 */
export type ServerEvent<K extends ServerEventName = ServerEventName> = {
  event: K;
  sentAt: string;
  data: ServerEventData[K];
};

/** Everything the driver app can receive. */
export type ServerEventName = keyof ServerEventData;

export type ServerEventData = {
  /**
   * Sent once, immediately after the handshake is accepted. It is the app's
   * confirmation that the token was good and which driver the socket belongs
   * to — nothing else establishes that.
   */
  connected: {
    driverId: string;
    /** Whether this driver is currently on shift, so the toggle opens right. */
    isOnline: boolean;
    /** When this token expires, so the app can refresh before being cut off. */
    tokenExpiresAt: string;
  };

  /** Answer to a `ping`. Round-trip proof the connection is alive. */
  connectionAlive: { at: string };

  /**
   * A reviewer decided the application while the driver was looking at the
   * status screen. The same values `GET /trackStatus` would return, so the
   * screen updates without a second call.
   */
  applicationReviewed: {
    status: ApplicationStatus;
    reviewedAt: string;
    /** The reviewer's words on a refusal, and null on an approval. */
    rejection: Rejection | null;
  };

  /** The driver's shift state changed — their own doing, or the server's. */
  onlineStatusChanged: {
    isOnline: boolean;
    /** When the current shift began. Null when offline. */
    since: string | null;
  };

  /**
   * Something the app sent could not be acted on. Carries the same codes the
   * REST API uses, so one table of error handling covers both.
   */
  error: {
    code: string;
    message: string;
    /** The event this is a response to, when it was caused by one. */
    inReplyTo?: string;
  };
};

/** Everything the driver app can send. */
export type ClientMessageName = keyof ClientMessageData;

export type ClientMessageData = {
  /** Keepalive. Answered with `pong`. */
  checkConnection: Record<string, never>;
  /** The "You're online" toggle. Opens a shift. */
  goOnline: Record<string, never>;
  /** Closes the shift. Dropping the connection does the same. */
  goOffline: Record<string, never>;
};

export type ClientMessage<K extends ClientMessageName = ClientMessageName> = {
  event: K;
  data?: ClientMessageData[K];
};
