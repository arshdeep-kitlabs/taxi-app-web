import type { OtpChallenge } from '../../../domain/otp-challenge.js';

export interface OtpChallengeRepository {
  find(phone: string): Promise<OtpChallenge | null>;
  save(challenge: OtpChallenge): Promise<void>;
  remove(phone: string): Promise<void>;
}
