import type { VerifiedSession } from '../../../domain/verified-session.js';

export interface VerifiedSessionRepository {
  find(phone: string): Promise<VerifiedSession | null>;
  save(session: VerifiedSession): Promise<void>;
  remove(phone: string): Promise<void>;
}
