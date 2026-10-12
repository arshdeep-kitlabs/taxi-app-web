import type { AppConfig } from '../app-config.types.js';

/**
 * Where configuration comes from. The service depends on this interface, never
 * on a concrete source, so a database or remote-config provider can replace the
 * static one without touching a line of the service.
 */
export interface ConfigSource {
  load(): AppConfig;
}
