import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TokenClaims, TokenKind, TokenService } from '../ports/token-service.port.js';

/**
 * Self-contained signed tokens, so local development needs no key service.
 * Swap for a JOSE implementation in the container and nothing above changes.
 */
export class HmacTokenService implements TokenService {
  readonly authTokenLifetimeSeconds: number;

  /** An admin's working day, so a shift does not end with a sign-in. */
  readonly adminTokenLifetimeSeconds = 60 * 60 * 8;

  private readonly refreshLifetimeSeconds = 60 * 60 * 24 * 30;

  constructor(
    private readonly secret: string,
    authTokenMinutes: number,
  ) {
    this.authTokenLifetimeSeconds = authTokenMinutes * 60;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  private issue(subject: string, kind: TokenKind, lifetimeSeconds: number): string {
    const body = {
      sub: subject,
      kind,
      exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
    };
    const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  issueAdminToken(adminId: string): string {
    return this.issue(adminId, 'admin', this.adminTokenLifetimeSeconds);
  }

  issueAuthToken(driverId: string): string {
    return this.issue(driverId, 'auth', this.authTokenLifetimeSeconds);
  }

  issueRefreshToken(driverId: string): string {
    return this.issue(driverId, 'refresh', this.refreshLifetimeSeconds);
  }

  verify(token: string): TokenClaims | null {
    const [payload, signature] = String(token ?? '').split('.');
    if (!payload || !signature) return null;

    const expected = this.sign(payload);
    if (signature.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
      return { subject: claims.sub, kind: claims.kind };
    } catch {
      return null;
    }
  }
}
