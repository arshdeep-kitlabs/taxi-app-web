export type TokenKind = 'auth' | 'refresh' | 'admin';

export type TokenClaims = {
  /** Who the token was issued to: a driver id, or an admin id. */
  subject: string;
  kind: TokenKind;
};

/**
 * Issues and checks the two tokens. A JWT library sits behind this in
 * production; nothing above it needs to know which.
 */
export interface TokenService {
  issueAuthToken(driverId: string): string;
  issueRefreshToken(driverId: string): string;
  /** Identifies which member of staff, so an action can be attributed. */
  issueAdminToken(adminId: string): string;
  verify(token: string): TokenClaims | null;
  /** Seconds. Lets the app schedule a refresh rather than wait for a 401. */
  readonly authTokenLifetimeSeconds: number;
  /** Seconds. The panel signs out on its own rather than wait for a 401. */
  readonly adminTokenLifetimeSeconds: number;
}
