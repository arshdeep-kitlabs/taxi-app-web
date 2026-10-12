import { readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppConfig } from '../app-config.types.js';
import { parseAppConfig } from '../app-config.schema.js';
import type { ConfigSource } from '../ports/config-source.port.js';
import type { ConfigWriter } from '../ports/config-writer.port.js';

/**
 * Reads configuration from a data file rather than from compiled code, so a
 * colour, a piece of copy or a dropdown option can change without a rebuild.
 *
 * It is also the shape an admin-editable store will take: swap the file read
 * for a database read and nothing above this changes, because both go through
 * the same schema on the way in.
 */
/** How often the file is checked for an edit. Still live to anyone editing it. */
const CHECK_EVERY_MS = 1000;

export class JsonFileConfigSource implements ConfigSource, ConfigWriter {
  private cached: AppConfig;
  private cachedAt: number;
  private checkedAt = 0;

  constructor(private readonly path: string) {
    // Read and validate once at boot. A broken file stops the process with a
    // readable list of problems, rather than surfacing on a driver's screen.
    this.cached = this.read();
    this.cachedAt = this.lastModified();
  }

  private absolute(): string {
    return resolve(this.path);
  }

  private lastModified(): number {
    try {
      return statSync(this.absolute()).mtimeMs;
    } catch {
      return 0;
    }
  }

  private read(): AppConfig {
    const path = this.absolute();
    let raw: unknown;

    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch (cause) {
      throw new Error(`Cannot read configuration at ${path}: ${(cause as Error).message}`);
    }

    return parseAppConfig(raw);
  }

  /**
   * Picks up an edit as soon as it is saved, so a change reaches drivers
   * without a restart — the same behaviour an admin panel will need.
   *
   * A file that fails validation is refused and the previous configuration
   * keeps serving, so a bad edit never takes the app down.
   */
  load(): AppConfig {
    // One request reads configuration dozens of times, and checking the file
    // each time is a system call each time. Once a second is enough.
    const now = Date.now();
    if (now - this.checkedAt < CHECK_EVERY_MS) return this.cached;
    this.checkedAt = now;

    const modified = this.lastModified();
    if (modified === this.cachedAt) return this.cached;

    try {
      this.cached = this.read();
      this.cachedAt = modified;
    } catch (error) {
      console.error('[config] edit refused, keeping the previous version\n', error);
      // Remember the timestamp anyway, or every request retries a file we
      // already know is broken.
      this.cachedAt = modified;
    }

    return this.cached;
  }

  reload(): AppConfig {
    this.cachedAt = 0;
    this.checkedAt = 0;
    return this.load();
  }

  /**
   * Replaces the file, and only once the new document has been validated: a
   * refused edit never reaches disk, so there is no state in which the server
   * is serving configuration it could not have loaded at boot.
   *
   * Written to a sibling and renamed, because a half-written file is a file
   * the next boot cannot parse. A rename within a directory is atomic, so a
   * reader either sees all of the old document or all of the new one.
   */
  async save(raw: unknown): Promise<AppConfig> {
    const config = parseAppConfig(raw);
    const path = this.absolute();
    const temporary = `${path}.${process.pid}.tmp`;

    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    renameSync(temporary, path);

    // Serve the new document immediately rather than on the next poll, so the
    // admin panel reads back exactly what it just sent.
    this.cached = config;
    this.cachedAt = this.lastModified();
    this.checkedAt = Date.now();
    return config;
  }
}
