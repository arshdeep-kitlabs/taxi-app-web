import type { AppConfig } from '../app-config.types.js';

/**
 * Writing configuration back.
 *
 * Deliberately separate from `ConfigSource`. Every service in the app reads
 * configuration, and none of them should be able to rewrite it — keeping the
 * write on its own interface means only what is handed this one can.
 */
export interface ConfigWriter {
  /**
   * Replaces the whole document. Validation happens first, so a refused edit
   * leaves what was there serving rather than half-applying.
   */
  save(config: unknown): Promise<AppConfig>;
}
